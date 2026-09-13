// src/lib/webhook-ingest.ts
// Aplica un evento de estado de Twilio a la fila del mensaje correspondiente.
// Extraído del route para poder ejecutarlo tanto de forma síncrona (fallback sin
// cola) como desde el worker `webhook-ingest` (cuando la cola está habilitada).
import prisma from "./prisma";
import { redis, bumpCacheVersion } from "./redis";
import { mapTwilioStatus, statusRank } from "./whatsapp";

const MESSAGES_CACHE_KEY = "messages-cache";

export type WebhookStatusEvent = {
  messageSid: string;
  rawStatus: string;
  errorCode: string | null;
};

export type ApplyResult = "updated" | "skipped" | "unknown";

/**
 * Actualiza el estado del mensaje (sent -> delivered -> read, o failed/undelivered),
 * evitando retroceder por callbacks fuera de orden. Idempotente: reaplicar el mismo
 * evento no cambia nada (el guard de rango lo absorbe).
 */
export async function applyWebhookStatus(evt: WebhookStatusEvent): Promise<ApplyResult> {
  const { messageSid, rawStatus, errorCode } = evt;
  if (!messageSid) return "unknown";

  const status = mapTwilioStatus(rawStatus);

  // Estado que Twilio no documenta: se ignora en lugar de escribirlo crudo.
  // Antes acababa en `message.status` saltandose el guard anti-retroceso.
  if (status === null) return "skipped";

  const message = await prisma.message.findFirst({
    where: { providerSid: messageSid },
    select: { id: true, status: true },
  });

  // No es un mensaje de campana: puede ser una RESPUESTA suelta enviada desde
  // la pantalla de entrantes. Sin esto, esas respuestas se quedaban para
  // siempre en "enviando" y quien contestaba no llegaba a saber nunca si el
  // mensaje habia llegado de verdad.
  if (!message) return aplicarEstadoARespuesta(messageSid, status, errorCode);

  // No retroceder de estado (ej. un "delivered" que llega tras un "read"),
  // pero permitir siempre marcar fallos.
  const isFailure = status === "failed" || status === "undelivered";
  if (!isFailure && statusRank(status) >= 0 && statusRank(status) < statusRank(message.status)) {
    return "skipped";
  }

  const data: {
    status: string;
    updatedAt: Date;
    updatedBy: string;
    deliveredAt?: Date;
    readAt?: Date;
    errorCode?: string;
  } = {
    status,
    updatedAt: new Date(),
    updatedBy: "twilio-webhook",
  };
  if (status === "delivered") data.deliveredAt = new Date();
  if (status === "read") {
    data.readAt = new Date();
    data.deliveredAt = new Date(); // si "read" llega sin "delivered" previo, lo inferimos
  }
  if (errorCode) data.errorCode = errorCode;

  await prisma.message.update({ where: { id: message.id }, data });
  await redis.del(MESSAGES_CACHE_KEY).catch(() => {});
  // El detalle del mensaje se cachea 300 s con la clave `message-<id>`, y aqui
  // no se invalidaba: la pantalla de detalle mostraba el estado ANTERIOR hasta
  // cinco minutos despues de que Twilio confirmara la entrega.
  await redis.del(`message-${message.id}`).catch(() => {});
  await bumpCacheVersion("dashboard").catch(() => {}); // refresca métricas cacheadas
  return "updated";
}

/**
 * Mismo avance de estado, pero sobre `outbound_replies`.
 *
 * Se separa en su propia funcion en vez de generalizar la de arriba porque las
 * dos tablas no comparten columnas: `message` lleva `updatedBy` y pertenece a
 * una campana; una respuesta lleva `sentBy` y no pertenece a ninguna. Unirlas
 * con condicionales dejaria una funcion que no se entiende de un vistazo.
 */
async function aplicarEstadoARespuesta(
  messageSid: string,
  status: string,
  errorCode: string | null
): Promise<ApplyResult> {
  const respuesta = await prisma.outboundReplies.findFirst({
    where: { providerSid: messageSid },
    select: { id: true, status: true },
  });
  if (!respuesta) return "unknown";

  const esFallo = status === "failed" || status === "undelivered";
  if (!esFallo && statusRank(status) >= 0 && statusRank(status) < statusRank(respuesta.status)) {
    return "skipped";
  }

  const data: {
    status: string;
    deliveredAt?: Date;
    readAt?: Date;
    errorCode?: string;
  } = { status };
  if (status === "delivered") data.deliveredAt = new Date();
  if (status === "read") {
    data.readAt = new Date();
    data.deliveredAt = new Date(); // un "read" sin "delivered" previo lo implica
  }
  if (errorCode) data.errorCode = errorCode;

  await prisma.outboundReplies.update({ where: { id: respuesta.id }, data });
  return "updated";
}
