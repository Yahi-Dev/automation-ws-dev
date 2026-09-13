import { describe, it, expect } from "vitest";
import {
  MARGEN_MS,
  VENTANA_MS,
  estadoVentana,
  ventanaEnPalabras,
} from "@/src/lib/ventana-24h";

// La regla no es nuestra: WhatsApp solo admite texto libre durante las 24 h
// siguientes al ultimo mensaje de esa persona. Equivocarse aqui significa una
// de dos cosas, y las dos son malas: o se cobra un envio que Meta rechaza, o se
// le dice a quien usa la app que no puede contestar cuando si podia.

const AHORA = new Date("2026-09-13T12:00:00.000Z");
const hace = (ms: number) => new Date(AHORA.getTime() - ms);

const MINUTO = 60_000;
const HORA = 60 * MINUTO;

describe("estadoVentana", () => {
  it("esta abierta justo despues de recibir un mensaje", () => {
    const v = estadoVentana(hace(MINUTO), AHORA);
    expect(v.abierta).toBe(true);
    expect(v.restanteMs).toBeGreaterThan(23 * HORA);
  });

  it("sigue abierta a falta de varias horas", () => {
    expect(estadoVentana(hace(20 * HORA), AHORA).abierta).toBe(true);
  });

  it("se cierra pasadas las 24 horas", () => {
    const v = estadoVentana(hace(VENTANA_MS + MINUTO), AHORA);
    expect(v.abierta).toBe(false);
    expect(v.restanteMs).toBe(0);
  });

  // El margen existe para no apurar el ultimo minuto: entre que la pantalla
  // dice "te quedan 30 segundos" y el mensaje llega a Meta hay varios saltos de
  // red, y un envio fuera de plazo se cobra igual y se rechaza con 63016.
  it("se cierra un minuto ANTES del limite exacto", () => {
    const justoEnElMargen = hace(VENTANA_MS - MARGEN_MS + 1);
    expect(estadoVentana(justoEnElMargen, AHORA).abierta).toBe(false);

    const conMargenDeSobra = hace(VENTANA_MS - MARGEN_MS - MINUTO);
    expect(estadoVentana(conMargenDeSobra, AHORA).abierta).toBe(true);
  });

  // El margen se descuenta del tiempo DISPONIBLE, no de la hora que se ensena:
  // "se cierra a las 15:24" tiene que seguir siendo verdad.
  it("la hora de cierre son las 24 h exactas, sin descontar el margen", () => {
    const ultimo = hace(2 * HORA);
    const v = estadoVentana(ultimo, AHORA);
    expect(v.expiraAt?.getTime()).toBe(ultimo.getTime() + VENTANA_MS);
  });

  it("sin ningun mensaje recibido, la ventana no existe", () => {
    for (const vacio of [null, undefined]) {
      const v = estadoVentana(vacio, AHORA);
      expect(v.abierta).toBe(false);
      expect(v.expiraAt).toBeNull();
      expect(v.restanteMs).toBe(0);
    }
  });
});

describe("ventanaEnPalabras", () => {
  // Quien usa la app no tiene por que traducir "1380 min" ni "23:00:12".
  it("no usa numeros que haya que interpretar", () => {
    expect(ventanaEnPalabras(3 * HORA + 20 * MINUTO)).toBe("quedan 3 horas y 20 minutos");
    expect(ventanaEnPalabras(2 * HORA)).toBe("quedan 2 horas");
    expect(ventanaEnPalabras(HORA)).toBe("queda 1 hora");
    expect(ventanaEnPalabras(HORA + 5 * MINUTO)).toBe("queda 1 hora y 5 minutos");
    expect(ventanaEnPalabras(40 * MINUTO)).toBe("quedan 40 minutos");
  });

  it("avisa cuando queda menos de un minuto", () => {
    expect(ventanaEnPalabras(30_000)).toBe("queda menos de 1 minuto");
    expect(ventanaEnPalabras(MINUTO)).toBe("queda menos de 1 minuto");
  });

  it("dice claramente que se cerro, sin numeros negativos", () => {
    expect(ventanaEnPalabras(0)).toBe("ya se cerró");
    expect(ventanaEnPalabras(-5 * HORA)).toBe("ya se cerró");
  });
});
