import { describe, it, expect, afterEach, vi } from "vitest";
import {
  consumirMarcaInvitacion,
  guardarEnlace,
  marcarInvitacion,
  tomarEnlace,
} from "@/src/lib/invitaciones";

/**
 * El almacen efimero decide DOS cosas del alta de usuarios:
 *   - si el administrador ve el enlace de invitacion (cuando el correo no sale);
 *   - si el correo que se envia dice "te han invitado" o "restablece tu
 *     contrasena".
 *
 * Lo segundo es lo que motiva la marca explicita: antes se deducia del estado de
 * la cuenta (`temporaryPassword` + `lastLogin`) y a cualquier usuario antiguo que
 * pulsara "olvide mi contrasena" le llegaba el correo de invitacion.
 */
describe("almacen efimero de invitaciones", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("devuelve el enlace guardado una sola vez", () => {
    guardarEnlace("ana@correo.com", "https://app/reset/abc");

    expect(tomarEnlace("ana@correo.com")).toBe("https://app/reset/abc");
    expect(tomarEnlace("ana@correo.com")).toBeNull();
  });

  it("normaliza el correo: da igual como se escriba", () => {
    guardarEnlace("  Ana@Correo.com ", "https://app/reset/abc");

    expect(tomarEnlace("ana@correo.com")).toBe("https://app/reset/abc");
  });

  it("no devuelve nada para un correo que nunca se guardo", () => {
    expect(tomarEnlace("nadie@correo.com")).toBeNull();
  });

  it("descarta el enlace cuando pasa la ventana de vida", () => {
    vi.useFakeTimers();
    guardarEnlace("tarde@correo.com", "https://app/reset/abc");

    vi.advanceTimersByTime(61_000);

    expect(tomarEnlace("tarde@correo.com")).toBeNull();
  });

  it("sin marca previa, el envio es un restablecimiento normal", () => {
    expect(consumirMarcaInvitacion("antiguo@correo.com")).toBe(false);
  });

  it("con marca previa, el envio es una invitacion, y solo la primera vez", () => {
    marcarInvitacion("nuevo@correo.com");

    expect(consumirMarcaInvitacion("nuevo@correo.com")).toBe(true);
    // Un "olvide mi contrasena" posterior de la misma persona ya no puede
    // colarse como invitacion.
    expect(consumirMarcaInvitacion("nuevo@correo.com")).toBe(false);
  });

  it("la marca de una persona no afecta a otra", () => {
    marcarInvitacion("invitada@correo.com");

    expect(consumirMarcaInvitacion("otra@correo.com")).toBe(false);
    expect(consumirMarcaInvitacion("invitada@correo.com")).toBe(true);
  });

  it("la marca tambien caduca", () => {
    vi.useFakeTimers();
    marcarInvitacion("olvidada@correo.com");

    vi.advanceTimersByTime(61_000);

    expect(consumirMarcaInvitacion("olvidada@correo.com")).toBe(false);
  });
});
