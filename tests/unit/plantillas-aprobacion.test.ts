import { describe, it, expect } from "vitest";
import {
  SID_PLANTILLA,
  ESTADOS_APROBACION,
  explicarEstadoPlantilla,
} from "@/src/lib/plantillas-aprobacion";

/**
 * WhatsApp solo deja escribirle a alguien que NO te ha escrito antes con un
 * texto que ellos hayan aprobado. La app creaba una plantilla por campaña y
 * nunca la mandaba a revisar ni comprobaba el resultado.
 *
 * Con el número de pruebas eso no se nota, porque el sandbox no lo exige. Con
 * un número real es una difusión a 3.000 personas fallando 3.000 veces, con los
 * intentos cobrados y la calificación de calidad del número por el suelo.
 */

describe("SID_PLANTILLA", () => {
  // El sid se interpola en la URL de la Content API, que viaja con las
  // credenciales de Twilio en la cabecera. No es cosmetico.
  it("acepta un sid de Twilio bien formado", () => {
    expect(SID_PLANTILLA.test("HX" + "a".repeat(32))).toBe(true);
    expect(SID_PLANTILLA.test("HX0123456789abcdef0123456789ABCDEF")).toBe(true);
  });

  it("rechaza cualquier cosa que no lo sea", () => {
    for (const malo of [
      "HX123",
      "SM" + "a".repeat(32),
      "HX" + "a".repeat(31),
      "HX" + "a".repeat(33),
      "HX" + "g".repeat(32),
      "HX" + "a".repeat(32) + "/../../Accounts",
      "",
    ]) {
      expect(SID_PLANTILLA.test(malo)).toBe(false);
    }
  });
});

describe("explicarEstadoPlantilla", () => {
  it("dice que se puede enviar cuando está aprobada", () => {
    expect(explicarEstadoPlantilla("approved")).toContain("aprobado");
  });

  // Lo importante aqui: que NO hay que hacer nada. Si no lo dice, la persona
  // borra la campana y crea otra, y vuelve a empezar la espera.
  it("en revisión, dice que no hay que hacer nada y que sale sola", () => {
    const texto = explicarEstadoPlantilla("pending");
    expect(texto).toContain("revisando");
    expect(texto).toContain("No hay que hacer nada");
    expect(texto).toContain("sale sola");
  });

  it("si la rechazaron, dice el motivo y qué hacer", () => {
    const texto = explicarEstadoPlantilla("rejected", "Contenido promocional no permitido");
    expect(texto).toContain("rechazó");
    expect(texto).toContain("Contenido promocional no permitido");
    expect(texto).toContain("Crea una campaña nueva");
  });

  it("sin motivo de rechazo, sigue explicando qué hacer", () => {
    const texto = explicarEstadoPlantilla("rejected", null);
    expect(texto).toContain("rechazó");
    expect(texto).toContain("Crea una campaña nueva");
  });

  // Un estado desconocido NO puede leerse como "todo bien": es justo el caso en
  // el que hay que mirar, no el que hay que ignorar.
  it("un estado desconocido no se hace pasar por aprobado", () => {
    for (const raro of [null, undefined, "", "loquesea"]) {
      const texto = explicarEstadoPlantilla(raro);
      expect(texto).toContain("no se puede enviar");
      expect(texto).not.toContain("ya está aprobado");
    }
  });

  it("ningún aviso usa vocabulario técnico", () => {
    const textos = [
      ...ESTADOS_APROBACION.map((e) => explicarEstadoPlantilla(e)),
      explicarEstadoPlantilla(null),
    ];
    for (const texto of textos) {
      const bajo = texto.toLowerCase();
      for (const jerga of ["approvalstatus", "template", "content sid", "api", "payload"]) {
        expect(bajo).not.toContain(jerga);
      }
      // Y que diga algo, no dos palabras.
      expect(texto.length).toBeGreaterThan(50);
    }
  });
});
