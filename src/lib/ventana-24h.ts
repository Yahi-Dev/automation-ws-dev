// src/lib/ventana-24h.ts
//
// La ventana de 24 horas de WhatsApp.
//
// WhatsApp NO deja escribir texto libre a quien quieras cuando quieras. Solo se
// puede contestar con texto libre durante las 24 horas siguientes al ultimo
// mensaje que esa persona te haya enviado. Pasado ese plazo, el unico envio
// permitido es una plantilla aprobada por Meta, que es justo lo que hace el
// modulo de campanas.
//
// Por que vive en su propio archivo y no dentro del endpoint: la pantalla tiene
// que poder DECIR cuanto queda antes de que alguien escriba una respuesta larga
// para nada, y el endpoint tiene que VOLVER a comprobarlo antes de gastar
// dinero. Las dos partes usan la misma cuenta, asi que la cuenta se escribe una
// sola vez.
//
// Ojo con el reloj: lo que manda es la hora del servidor, no la del navegador.
// Por eso la pantalla no recalcula la ventana por su cuenta, sino que pinta lo
// que le dice el servidor.

/** Duracion de la ventana de servicio de WhatsApp. */
export const VENTANA_MS = 24 * 60 * 60 * 1000;

/**
 * Margen de seguridad al FINAL de la ventana.
 *
 * Entre que la pantalla pinta "te quedan 40 segundos" y el mensaje llega de
 * verdad a los servidores de Meta pasan varios saltos de red. Apurar el ultimo
 * minuto solo sirve para cobrar un envio que Meta va a rechazar con el error
 * 63016, y para que la persona vea un fallo que no entiende. Se cierra un
 * minuto antes y se le dice claramente que la ventana ya se cerro.
 */
export const MARGEN_MS = 60 * 1000;

export type EstadoVentana = {
  /** ¿Se puede mandar texto libre AHORA MISMO? */
  abierta: boolean;
  /** Cuando llego el ultimo mensaje de esa persona (null si nunca escribio). */
  ultimoEntranteAt: Date | null;
  /** Milisegundos que quedan de ventana. 0 si esta cerrada. */
  restanteMs: number;
  /** Momento exacto en que se cierra (null si nunca escribio). */
  expiraAt: Date | null;
};

/**
 * Calcula el estado de la ventana a partir del ultimo mensaje ENTRANTE.
 *
 * `ahora` se pasa por parametro para que las pruebas no dependan del reloj.
 */
export function estadoVentana(
  ultimoEntranteAt: Date | null | undefined,
  ahora: Date = new Date()
): EstadoVentana {
  if (!ultimoEntranteAt) {
    return { abierta: false, ultimoEntranteAt: null, restanteMs: 0, expiraAt: null };
  }

  const expiraAt = new Date(ultimoEntranteAt.getTime() + VENTANA_MS);
  // El margen se descuenta del tiempo DISPONIBLE, no de la hora que se enseña:
  // "se cierra a las 15:24" sigue siendo verdad, lo que se adelanta es el
  // momento en que la app deja de aceptar respuestas.
  const restanteMs = expiraAt.getTime() - ahora.getTime();
  const utilizableMs = restanteMs - MARGEN_MS;

  return {
    abierta: utilizableMs > 0,
    ultimoEntranteAt,
    restanteMs: Math.max(0, restanteMs),
    expiraAt,
  };
}

/**
 * "faltan 3 horas y 20 minutos" en palabras normales.
 *
 * Nada de "23:59:12" ni de "1440 min": quien usa la app no tiene por que
 * traducir nada mentalmente.
 */
export function ventanaEnPalabras(restanteMs: number): string {
  if (restanteMs <= 0) return "ya se cerró";

  const minutosTotales = Math.floor(restanteMs / 60_000);
  const horas = Math.floor(minutosTotales / 60);
  const minutos = minutosTotales % 60;

  if (horas === 0) {
    if (minutos <= 1) return "queda menos de 1 minuto";
    return `quedan ${minutos} minutos`;
  }
  if (horas === 1 && minutos === 0) return "queda 1 hora";
  if (minutos === 0) return `quedan ${horas} horas`;
  if (horas === 1) return `queda 1 hora y ${minutos} minutos`;
  return `quedan ${horas} horas y ${minutos} minutos`;
}
