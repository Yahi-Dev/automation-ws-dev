import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { templateCreateSchema } from "@/src/features/templates/schema/validations";

/**
 * La lista blanca de imágenes de las plantillas.
 *
 * No es burocracia. Una plantilla `twilio/media` se envía desde el remitente de
 * WhatsApp de la empresa, con su nombre y su verificación. Si admitiera una URL
 * cualquiera, cualquier usuario aprobado podría hacer que la empresa enviase
 * contenido ajeno con su sello encima. Es phishing firmado por la víctima.
 *
 * Y el otro lado: si la lista es DEMASIADO estrecha, las fotos dejan de poder
 * enviarse y nadie entiende por qué. Fue justo lo que pasó al migrar de S3 a
 * Cloudinary — la lista se quedó apuntando a un S3 que ya no existía, así que
 * rechazaba en silencio todas las imágenes de la app.
 */

const CUENTA = "rfzohahx";

function plantillaConImagen(url: string) {
  return templateCreateSchema.safeParse({
    friendly_name: "prueba_media",
    language: "es",
    variables: { "1": "Cliente" },
    types: { "twilio/media": { body: "Hola", media: [url] } },
  });
}

beforeEach(() => {
  process.env.CLOUDINARY_CLOUD_NAME = CUENTA;
  delete process.env.S3_PUBLIC_BASE_URL;
});

afterEach(() => {
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.S3_PUBLIC_BASE_URL;
});

describe("imágenes admitidas en una plantilla", () => {
  it("acepta una imagen subida a la cuenta de Cloudinary de la app", () => {
    const r = plantillaConImagen(
      `https://res.cloudinary.com/${CUENTA}/image/upload/v1/automation-ws/posts/foto.jpg`
    );
    expect(r.success).toBe(true);
  });

  // Lo importante de todo el archivo: res.cloudinary.com lo comparten TODAS las
  // cuentas del mundo. Comprobar solo el dominio dejaria pasar la imagen de
  // cualquier desconocido.
  it("RECHAZA la cuenta de Cloudinary de otro", () => {
    const r = plantillaConImagen(
      "https://res.cloudinary.com/cuenta-de-otro/image/upload/v1/phishing.jpg"
    );
    expect(r.success).toBe(false);
  });

  // Un prefijo que coincide a medias tampoco vale: "rfzohahx-falso" empieza
  // igual que la cuenta buena.
  it("RECHAZA una cuenta que solo se parece a la nuestra", () => {
    const r = plantillaConImagen(
      `https://res.cloudinary.com/${CUENTA}-falso/image/upload/v1/foto.jpg`
    );
    expect(r.success).toBe(false);
  });

  it("RECHAZA cualquier dominio ajeno", () => {
    for (const url of [
      "https://ejemplo.com/foto.jpg",
      "https://res-cloudinary.com/rfzohahx/foto.jpg",
      "https://evil.com/res.cloudinary.com/rfzohahx/foto.jpg",
    ]) {
      expect(plantillaConImagen(url).success).toBe(false);
    }
  });

  it("RECHAZA http sin cifrar", () => {
    const r = plantillaConImagen(
      `http://res.cloudinary.com/${CUENTA}/image/upload/v1/foto.jpg`
    );
    expect(r.success).toBe(false);
  });

  // Sin almacenamiento configurado se bloquea la funcion entera. Es preferible
  // a dejar pasar cualquier cosa.
  it("sin Cloudinary ni S3 configurados, no admite ninguna imagen", () => {
    delete process.env.CLOUDINARY_CLOUD_NAME;
    const r = plantillaConImagen("https://res.cloudinary.com/loquesea/foto.jpg");
    expect(r.success).toBe(false);
  });

  it("sigue admitiendo S3 si alguna vez se vuelve a él", () => {
    delete process.env.CLOUDINARY_CLOUD_NAME;
    process.env.S3_PUBLIC_BASE_URL = "https://mi-bucket.s3.amazonaws.com";

    expect(plantillaConImagen("https://mi-bucket.s3.amazonaws.com/foto.jpg").success).toBe(true);
    expect(plantillaConImagen("https://otro-bucket.s3.amazonaws.com/foto.jpg").success).toBe(false);
  });

  it("una plantilla de solo texto no necesita imagen", () => {
    const r = templateCreateSchema.safeParse({
      friendly_name: "prueba_texto",
      language: "es",
      variables: { "1": "Cliente" },
      types: { "twilio/text": { body: "Hola" } },
    });
    expect(r.success).toBe(true);
  });
});
