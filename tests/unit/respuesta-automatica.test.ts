import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * La marca con la que se guardan las contestaciones que manda la app sola.
 *
 * Se escribe en DOS sitios que no se importan entre si: el webhook la guarda
 * en `sentBy` y la pantalla de conversacion la compara para poner la etiqueta
 * "Respuesta automatica". Si una de las dos cambia, no falla nada: la etiqueta
 * deja de salir EN SILENCIO y la contestacion automatica de un BAJA pasa a
 * parecer escrita a mano por alguien. Este test ata las dos puntas.
 */
const MARCA = "respuesta-automatica";

const WEBHOOK = join(
  process.cwd(),
  "src/app/api/whatsapp/inbound/route.ts"
);
const DIALOGO = join(
  process.cwd(),
  "src/features/inbound/components/dialogo-conversacion.tsx"
);

describe("marca de la respuesta automatica", () => {
  it("el webhook guarda las respuestas automaticas con esa marca", () => {
    const fuente = readFileSync(WEBHOOK, "utf8");
    expect(fuente).toContain(`sentBy: "${MARCA}"`);
  });

  it("la pantalla de conversacion busca exactamente esa marca", () => {
    const fuente = readFileSync(DIALOGO, "utf8");
    expect(fuente).toContain(`AUTOR_AUTOMATICO = "${MARCA}"`);
    expect(fuente).toContain("enviadoPor === AUTOR_AUTOMATICO");
  });

  // El registro es informativo: si falla, la persona TIENE que recibir igual su
  // confirmacion de baja. Antes de esto no habia registro ninguno, asi que el
  // riesgo que se introduce es justo ese, y por eso va dentro de un try/catch.
  it("un fallo al registrar no puede tumbar la respuesta al remitente", () => {
    const fuente = readFileSync(WEBHOOK, "utf8");
    const funcion = fuente.slice(
      fuente.indexOf("async function registrarRespuestaAutomatica"),
      fuente.indexOf("/** Respuesta TwiML")
    );
    expect(funcion).toContain("try {");
    expect(funcion).toContain("} catch (error) {");
  });
});
