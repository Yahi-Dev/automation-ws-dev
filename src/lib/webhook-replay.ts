// src/lib/webhook-replay.ts
//
// Proteccion anti-replay para los webhooks de Twilio.
//
// La firma `X-Twilio-Signature` autentica el ORIGEN, pero no lleva marca
// temporal ni nonce: una peticion firmada capturada sigue siendo valida
// indefinidamente y se puede reenviar tal cual. En esta aplicacion eso permitia
// reaplicar un estado ya procesado o, en el endpoint de entrada, repetir un
// cambio de consentimiento.
//
// Se resuelve con una marca de "ya visto" con caducidad. Usa el mismo
// almacenamiento que el resto de la app (Redis si esta configurado; si no, el
// mapa en memoria del proceso, que ya tiene cota y barrido).
import { redis } from "./redis";

/** Ventana en la que un mismo evento se considera repetido. */
const TTL_SEGUNDOS = Math.max(60, Number(process.env.WEBHOOK_REPLAY_TTL_SECONDS ?? 24 * 3600));

/**
 * Registra el evento y dice si YA se habia visto.
 *
 * Devuelve `true` si es un duplicado (hay que ignorarlo) y `false` la primera
 * vez. Ante un fallo del almacenamiento devuelve `false`: es preferible
 * procesar un duplicado -que aguas abajo es idempotente gracias al guard de
 * `statusRank`- que descartar un evento legitimo.
 */
export async function yaProcesado(clave: string): Promise<boolean> {
  const k = `wh:seen:${clave}`;

  try {
    const previo = await redis.get<number>(k);
    if (previo) return true;

    await redis.set(k, 1, { ex: TTL_SEGUNDOS });
    return false;
  } catch {
    return false;
  }
}
