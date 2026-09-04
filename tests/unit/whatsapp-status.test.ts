import { describe, it, expect } from "vitest";
import { mapTwilioStatus, statusRank, isValidE164, toWhatsAppAddress } from "@/src/lib/whatsapp";

describe("mapTwilioStatus", () => {
  it("colapsa los estados previos al envio en 'queued'", () => {
    for (const s of ["queued", "accepted", "scheduled", "QUEUED"]) {
      expect(mapTwilioStatus(s)).toBe("queued");
    }
  });

  it("colapsa sending y sent en 'sent'", () => {
    expect(mapTwilioStatus("sending")).toBe("sent");
    expect(mapTwilioStatus("sent")).toBe("sent");
  });

  it("mapea los estados terminales tal cual", () => {
    expect(mapTwilioStatus("delivered")).toBe("delivered");
    expect(mapTwilioStatus("read")).toBe("read");
    expect(mapTwilioStatus("failed")).toBe("failed");
    expect(mapTwilioStatus("undelivered")).toBe("undelivered");
  });

  it("un estado ausente no produce ningun cambio", () => {
    expect(mapTwilioStatus(undefined)).toBeNull();
    expect(mapTwilioStatus("")).toBeNull();
  });

  // Antes, un estado no documentado se devolvia CRUDO y acababa escrito en
  // message.status: statusRank le daba -1, con lo que el guard anti-retroceso
  // de webhook-ingest no lo frenaba. Ahora se descarta (null = "sin cambio"),
  // que ademas evita romper la columna, que es VARCHAR(16).
  it("descarta los estados que Twilio no documenta", () => {
    expect(mapTwilioStatus("teletransportado")).toBeNull();
    expect(mapTwilioStatus("un-estado-larguisimo-que-no-cabe-en-la-columna")).toBeNull();
  });
});

describe("statusRank", () => {
  it("ordena el avance normal del ciclo de vida", () => {
    expect(statusRank("pending")).toBeLessThan(statusRank("queued"));
    expect(statusRank("queued")).toBeLessThan(statusRank("sent"));
    expect(statusRank("sent")).toBeLessThan(statusRank("delivered"));
    expect(statusRank("delivered")).toBeLessThan(statusRank("read"));
  });

  it("devuelve -1 para los estados de fallo, que quedan fuera del orden", () => {
    expect(statusRank("failed")).toBe(-1);
    expect(statusRank("undelivered")).toBe(-1);
  });
});

describe("isValidE164", () => {
  it("acepta numeros E.164 validos", () => {
    expect(isValidE164("+18095551234")).toBe(true);
    expect(isValidE164("+34600123456")).toBe(true);
  });

  // Es un validador TOLERANTE a proposito: descarta separadores antes de
  // comprobar el formato, en coherencia con toWhatsAppAddress(), que hace la
  // misma normalizacion justo antes de enviar. Un numero con espacios o
  // guiones se acepta porque acabara saliendo normalizado hacia Twilio.
  it("tolera separadores porque normaliza antes de validar", () => {
    expect(isValidE164("+1 809 555 1234")).toBe(true);
    expect(isValidE164("+1-809-555-1234")).toBe(true);
    expect(isValidE164("whatsapp:+18095551234")).toBe(true);
  });

  it("rechaza lo que no puede normalizarse a E.164", () => {
    expect(isValidE164("8095551234")).toBe(false); // sin prefijo +
    expect(isValidE164("")).toBe(false);
    expect(isValidE164("+123456")).toBe(false); // menos de 7 digitos
    expect(isValidE164("+1234567890123456")).toBe(false); // mas de 15 digitos
  });
});

describe("toWhatsAppAddress", () => {
  it("antepone el prefijo whatsapp: que exige Twilio", () => {
    expect(toWhatsAppAddress("+18095551234")).toBe("whatsapp:+18095551234");
  });

  it("no duplica el prefijo si ya viene puesto", () => {
    expect(toWhatsAppAddress("whatsapp:+18095551234")).toBe("whatsapp:+18095551234");
  });
});
