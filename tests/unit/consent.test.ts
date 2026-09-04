import { describe, it, expect } from "vitest";
import {
  detectConsentKeyword,
  normalizeInboundPhone,
} from "@/src/lib/consent";

describe("detectConsentKeyword", () => {
  it("detecta las palabras de baja en cualquier capitalizacion", () => {
    for (const kw of ["stop", "STOP", "Baja", "cancelar", "UNSUBSCRIBE", "salir"]) {
      expect(detectConsentKeyword(kw).type).toBe("opt_out");
    }
  });

  it("detecta las palabras de alta", () => {
    for (const kw of ["start", "ALTA", "subscribe", "unstop"]) {
      expect(detectConsentKeyword(kw).type).toBe("opt_in");
    }
  });

  it("usa solo el primer token, ignorando el resto del mensaje", () => {
    expect(detectConsentKeyword("stop por favor").type).toBe("opt_out");
    expect(detectConsentKeyword("  baja  ").keyword).toBe("baja");
  });

  it("no detecta nada en un mensaje normal", () => {
    expect(detectConsentKeyword("hola buenas tardes").type).toBeNull();
    expect(detectConsentKeyword("").type).toBeNull();
  });

  it("detecta la palabra con puntuacion pegada", () => {
    for (const texto of ["STOP.", "BAJA!", "¡BAJA!", "baja...", "¿alta?"]) {
      expect(detectConsentKeyword(texto).type, texto).not.toBeNull();
    }
    expect(detectConsentKeyword("STOP.").type).toBe("opt_out");
    expect(detectConsentKeyword("¡BAJA!").keyword).toBe("baja");
    expect(detectConsentKeyword("¿alta?").type).toBe("opt_in");
  });

  it("ignora los acentos al comparar", () => {
    expect(detectConsentKeyword("no me escribas más").type).toBe("opt_out");
    expect(detectConsentKeyword("NO ME ESCRIBAS MÁS").type).toBe("opt_out");
  });

  it("detecta la baja expresada como frase completa", () => {
    for (const frase of [
      "quiero darme de baja",
      "darme de baja",
      "no me escribas mas",
      "dejar de recibir",
      "unsubscribe me",
    ]) {
      expect(detectConsentKeyword(frase).type, frase).toBe("opt_out");
    }
  });

  it("tolera saludos y despedidas alrededor de la frase", () => {
    expect(detectConsentKeyword("Hola, quiero darme de baja, gracias").type).toBe("opt_out");
    expect(detectConsentKeyword("darme de baja por favor").type).toBe("opt_out");
  });

  // La deteccion es CONSERVADORA a proposito: un falso positivo da de baja a
  // alguien que no lo pidio, y con el opt-in exigido por defecto solo esa
  // persona puede revertirlo escribiendo ALTA. Estos casos NO se detectan y
  // deben seguir sin detectarse; el mensaje queda igualmente guardado en
  // `inbound_messages` para que un humano lo revise.
  it("no detecta la frase negada ni matizada", () => {
    expect(detectConsentKeyword("no quiero darme de baja todavia").type).toBeNull();
    expect(detectConsentKeyword("no quiero darme de baja").type).toBeNull();
  });

  it("no detecta la palabra mencionada de pasada en un mensaje largo", () => {
    expect(
      detectConsentKeyword(
        "Buenas, me dieron de baja en el gimnasio y queria saber si el descuento sigue disponible"
      ).type
    ).toBeNull();
    expect(detectConsentKeyword("me llego la factura de la baja del mes pasado").type).toBeNull();
  });
});

describe("normalizeInboundPhone", () => {
  it("quita el prefijo whatsapp: de Twilio", () => {
    expect(normalizeInboundPhone("whatsapp:+18095551234")).toBe("+18095551234");
    expect(normalizeInboundPhone("WhatsApp:+18095551234")).toBe("+18095551234");
  });

  it("deja intacto un E.164 sin prefijo y tolera entrada vacia", () => {
    expect(normalizeInboundPhone("+18095551234")).toBe("+18095551234");
    expect(normalizeInboundPhone("")).toBe("");
  });
});
