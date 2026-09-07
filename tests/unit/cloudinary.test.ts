import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createHash } from "node:crypto";

/**
 * La firma de Cloudinary es la parte que falla en silencio: si un parametro no
 * entra en la firma, o entra con un valor distinto al que se manda en el
 * formulario, Cloudinary responde 401 y la subida se cae en produccion sin que
 * nada lo detecte en local (donde el respaldo a disco si funciona).
 *
 * Estas pruebas fijan el contrato: que se firma, con que orden y con que
 * algoritmo, y que la funcion se niega a operar sin credenciales.
 */

/** Reimplementacion independiente de la firma, segun la documentacion. */
function firmaEsperada(parametros: Record<string, string>, secreto: string): string {
  const cadena = Object.keys(parametros)
    .sort()
    .map((k) => `${k}=${parametros[k]}`)
    .join("&");
  return createHash("sha1").update(cadena + secreto).digest("hex");
}

const ENV_ORIGINAL = { ...process.env };

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ENV_ORIGINAL };
  vi.restoreAllMocks();
});

describe("cloudinaryEnabled", () => {
  it("esta apagado si falta cualquiera de las tres credenciales", async () => {
    for (const falta of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) {
      vi.resetModules();
      process.env.CLOUDINARY_CLOUD_NAME = "demo";
      process.env.CLOUDINARY_API_KEY = "123";
      process.env.CLOUDINARY_API_SECRET = "abc";
      delete process.env[falta];

      const mod = await import("@/src/lib/cloudinary");
      expect(mod.cloudinaryEnabled, `deberia estar apagado sin ${falta}`).toBe(false);
    }
  });

  it("se enciende con las tres credenciales", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "demo";
    process.env.CLOUDINARY_API_KEY = "123";
    process.env.CLOUDINARY_API_SECRET = "abc";

    const mod = await import("@/src/lib/cloudinary");
    expect(mod.cloudinaryEnabled).toBe(true);
  });
});

describe("subirImagen", () => {
  it("se niega a subir si no hay credenciales, en vez de fallar en la red", async () => {
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;

    const { subirImagen } = await import("@/src/lib/cloudinary");
    await expect(subirImagen("a.png", Buffer.from("x"), "posts")).rejects.toThrow(
      /no está configurado/i
    );
  });

  it("firma exactamente folder, public_id y timestamp, y manda esos mismos valores", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "mi-nube";
    process.env.CLOUDINARY_API_KEY = "clave-publica";
    process.env.CLOUDINARY_API_SECRET = "secreto-privado";
    process.env.CLOUDINARY_FOLDER = "automation-ws";

    let urlLlamada = "";
    let enviado: FormData | null = null;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        urlLlamada = String(url);
        enviado = init.body as FormData;
        return {
          ok: true,
          status: 200,
          json: async () => ({ secure_url: "https://res.cloudinary.com/mi-nube/image/upload/v1/x.png" }),
        } as Response;
      })
    );

    const { subirImagen } = await import("@/src/lib/cloudinary");
    const url = await subirImagen("abc123.png", Buffer.from("contenido"), "posts");

    expect(url).toBe("https://res.cloudinary.com/mi-nube/image/upload/v1/x.png");
    expect(urlLlamada).toBe("https://api.cloudinary.com/v1_1/mi-nube/image/upload");

    const form = enviado as unknown as FormData;
    const folder = String(form.get("folder"));
    const publicId = String(form.get("public_id"));
    const timestamp = String(form.get("timestamp"));

    // La carpeta base y la subcarpeta se combinan sin barras dobles.
    expect(folder).toBe("automation-ws/posts");
    // El public_id va SIN extension: Cloudinary la deduce del contenido.
    expect(publicId).toBe("abc123");
    // El timestamp es en segundos, no en milisegundos.
    expect(timestamp).toMatch(/^\d{10}$/);

    // Y la firma corresponde EXACTAMENTE a esos tres valores.
    expect(String(form.get("signature"))).toBe(
      firmaEsperada({ folder, public_id: publicId, timestamp }, "secreto-privado")
    );

    // El api_key viaja, pero NO forma parte de la firma.
    expect(String(form.get("api_key"))).toBe("clave-publica");
  });

  it("informa del motivo cuando Cloudinary rechaza la subida", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "mi-nube";
    process.env.CLOUDINARY_API_KEY = "k";
    process.env.CLOUDINARY_API_SECRET = "s";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: "Invalid Signature" } }),
      }) as Response)
    );

    const { subirImagen } = await import("@/src/lib/cloudinary");
    await expect(subirImagen("a.png", Buffer.from("x"), "posts")).rejects.toThrow(
      /401.*Invalid Signature/
    );
  });

  it("no da por buena una respuesta 200 que no traiga la URL", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "mi-nube";
    process.env.CLOUDINARY_API_KEY = "k";
    process.env.CLOUDINARY_API_SECRET = "s";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }) as Response)
    );

    const { subirImagen } = await import("@/src/lib/cloudinary");
    await expect(subirImagen("a.png", Buffer.from("x"), "posts")).rejects.toThrow(/Cloudinary/);
  });
});
