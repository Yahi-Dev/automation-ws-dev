import { describe, it, expect } from "vitest";
import { esFalloPermanente } from "@/src/lib/campaign-send";

/**
 * Estados terminales del pipeline de envio.
 *
 * Antes, "failed" era SIEMPRE reelegible: `findDuePostIds` seguia devolviendo la
 * campana mientras quedara un `failed`, y el reclamo lo volvia a poner en
 * `queued` para que la misma puerta lo rechazara otra vez. Con 20.000 contactos
 * importados sin opt-in eso son ~40.000 UPDATE por minuto, indefinidamente y sin
 * enviar un solo mensaje.
 */
describe("esFalloPermanente", () => {
  it("los fallos de consentimiento son definitivos", () => {
    // Reintentar un opt-out no solo es inutil: es exactamente lo que la ley
    // prohibe hacer.
    expect(esFalloPermanente("CONSENT_OPT_OUT")).toBe(true);
    expect(esFalloPermanente("CONSENT_NOT_OPTED_IN")).toBe(true);
  });

  it("un telefono con formato invalido no mejora reintentando", () => {
    expect(esFalloPermanente("PHONE_INVALID")).toBe(true);
  });

  it("los codigos de Twilio/Meta de destino inalcanzable son definitivos", () => {
    expect(esFalloPermanente("21211")).toBe(true); // numero no valido
    expect(esFalloPermanente("63003")).toBe(true); // canal sin direccion destino
    expect(esFalloPermanente("131026")).toBe(true); // mensaje no entregable
  });

  it("los fallos transitorios SI se reintentan", () => {
    expect(esFalloPermanente("TWILIO_CIRCUIT_OPEN")).toBe(false);
    expect(esFalloPermanente("TWILIO_ERROR")).toBe(false);
    expect(esFalloPermanente("20429")).toBe(false); // too many requests
    expect(esFalloPermanente("30001")).toBe(false); // fallo de cola
  });

  it("tolera ausencia de codigo sin marcar nada como definitivo", () => {
    expect(esFalloPermanente(null)).toBe(false);
    expect(esFalloPermanente(undefined)).toBe(false);
    expect(esFalloPermanente("")).toBe(false);
  });

  it("distingue mayusculas: no se marca de mas por accidente", () => {
    expect(esFalloPermanente("consent_opt_out")).toBe(false);
  });
});
