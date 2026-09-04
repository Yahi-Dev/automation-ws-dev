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

  // Limitaciones REALES de la implementacion actual, documentadas como tal.
  // La tarea 5.2 del plan amplia la deteccion a frases y puntuacion; cuando se
  // haga, estos casos pasan a esperar "opt_out" y el test falla a proposito.
  it("[limitacion conocida] no detecta la palabra con puntuacion pegada", () => {
    expect(detectConsentKeyword("STOP.").type).toBeNull();
  });

  it("[limitacion conocida] no detecta la baja expresada como frase", () => {
    expect(detectConsentKeyword("quiero darme de baja").type).toBeNull();
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
