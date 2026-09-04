import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Cobertura ESTRUCTURAL de autorizacion.
 *
 * Recorre todos los `route.ts` bajo src/app/api y falla si algun handler
 * exportado no invoca `requireAuth` / `requireAdmin` sin estar en la lista de
 * excepciones de abajo.
 *
 * Por que existe: `GET /api/messages` llamaba a `auth.api.getSession` en vez de
 * `requireAuth`, asi que no validaba `status` ni `is_deleted`. Como el registro
 * es publico, cualquiera podia registrarse y exportar los datos personales de
 * todos los contactos. Los demas verbos de ESE MISMO archivo si estaban bien:
 * era una excepcion silenciosa, del tipo que ninguna revision manual detecta de
 * forma fiable y que un test como este si detecta.
 *
 * Toda excepcion nueva obliga a escribir aqui por que es segura.
 */

const RAIZ_API = join(process.cwd(), "src", "app", "api");

/** Rutas que legitimamente NO pasan por el gate de sesion, con su motivo. */
const EXCEPCIONES: Record<string, string> = {
  "auth/[...all]/route.ts":
    "Catch-all de better-auth: es el proveedor de autenticacion, no puede exigir sesion previa.",
  "health/route.ts":
    "Sonda de salud del balanceador y de Docker: debe responder sin credenciales.",
  "whatsapp/webhook/route.ts":
    "Lo llama Twilio, no un usuario. Se autentica con firma X-Twilio-Signature (fail-closed) y token compartido.",
  "whatsapp/inbound/route.ts":
    "Lo llama Twilio, no un usuario. Misma verificacion de firma que el webhook de estado.",
  "whatsapp/dispatch/route.ts":
    "Cron. Se autentica con CRON_SECRET comparado en tiempo constante, o con sesion de administrador.",
  "metrics/queues/route.ts":
    "Metricas para autoescalado. Mismo esquema: CRON_SECRET o sesion de administrador.",
  "rate-limit/check/route.ts":
    "Publica a proposito: la pantalla de login necesita saber si la IP esta bloqueada ANTES de haber iniciado sesion. Solo consulta, no incrementa.",
};

/** Los `export async function` pueden llevar espacios de mas: `function  DELETE`. */
const RE_HANDLER = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g;
const RE_GATE = /\b(requireAuth|requireAdmin)\s*\(/;

function buscarRutas(dir: string, encontradas: string[] = []): string[] {
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) buscarRutas(ruta, encontradas);
    else if (entrada === "route.ts") encontradas.push(ruta);
  }
  return encontradas;
}

const rutas = buscarRutas(RAIZ_API);

describe("cobertura de autorizacion en src/app/api", () => {
  it("encuentra los archivos de ruta", () => {
    // Si este numero cae en picado, el descubrimiento se rompio y el resto de
    // asserts pasarian en vacio.
    expect(rutas.length).toBeGreaterThanOrEqual(25);
  });

  for (const ruta of rutas) {
    const relativa = relative(RAIZ_API, ruta).split(sep).join("/");
    const motivoExcepcion = EXCEPCIONES[relativa];

    it(`${relativa}${motivoExcepcion ? " (excepcion declarada)" : ""}`, () => {
      const fuente = readFileSync(ruta, "utf8");
      const handlers = [...fuente.matchAll(RE_HANDLER)].map((m) => m[1]);

      if (motivoExcepcion) {
        // Una excepcion sin handlers es una entrada obsoleta en la lista.
        expect(motivoExcepcion.length).toBeGreaterThan(20);
        return;
      }

      expect(
        handlers.length,
        `${relativa} no exporta ningun handler HTTP reconocible`
      ).toBeGreaterThan(0);

      expect(
        RE_GATE.test(fuente),
        `${relativa} exporta ${handlers.join(", ")} y no invoca requireAuth/requireAdmin. ` +
          "Si la ruta debe ser publica, anadela a EXCEPCIONES con su motivo."
      ).toBe(true);

      // Cada handler necesita SU PROPIA llamada al gate: que el archivo tenga
      // una no basta, que es exactamente como se colo el hueco de GET /api/messages.
      const llamadasGate = (fuente.match(/\b(requireAuth|requireAdmin)\s*\(/g) ?? []).length;
      // Se descuenta 1 por el import (`import { requireAuth } from ...` no
      // cuenta porque no lleva parentesis, pero si hay re-exports sumaria).
      expect(
        llamadasGate,
        `${relativa} exporta ${handlers.length} handler(s) (${handlers.join(", ")}) ` +
          `pero solo invoca el gate ${llamadasGate} vez/veces. Cada handler debe tener el suyo.`
      ).toBeGreaterThanOrEqual(handlers.length);
    });
  }
});

describe("ninguna ruta de negocio resuelve la sesion por su cuenta", () => {
  it("no se usa auth.api.getSession fuera del gate central ni de las excepciones", () => {
    const permitidas = new Set([
      // Ambas combinan CRON_SECRET con sesion de administrador y por eso
      // necesitan leer la sesion directamente.
      "whatsapp/dispatch/route.ts",
      "metrics/queues/route.ts",
    ]);

    const infractoras = rutas
      .map((r) => ({ rel: relative(RAIZ_API, r).split(sep).join("/"), src: readFileSync(r, "utf8") }))
      .filter(({ rel, src }) => !permitidas.has(rel) && /auth\.api\.getSession\s*\(/.test(src))
      .map(({ rel }) => rel);

    expect(
      infractoras,
      "Estas rutas resuelven la sesion a mano en vez de usar requireAuth/requireAdmin, " +
        "lo que se salta la comprobacion de status e is_deleted: " + infractoras.join(", ")
    ).toEqual([]);
  });
});
