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

  const message = await prisma.message.findFirst({
    where: { providerSid: messageSid },
    select: { id: true, status: true },
  });
  if (!message) return "unknown";

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
  await bumpCacheVersion("dashboard").catch(() => {}); // refresca métricas cacheadas
  return "updated";
}
