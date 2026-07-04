// src/lib/whatsapp.ts
// Helper central para el envío de mensajes de WhatsApp vía Twilio.
import { getTwilioClient } from "./twilio";

export type SendWhatsAppParams = {
  /** Teléfono destino en E.164 (con o sin prefijo "whatsapp:"). */
  to: string;
  /** Cuerpo de texto libre (sandbox / ventana de 24h). */
  body?: string;
  /** SID de un Content Template de Twilio ("HX..."). Tiene prioridad sobre `body`. */
  contentSid?: string;
  /** Variables para el template, ej: { "1": "Juan" }. */
  contentVariables?: Record<string, string>;
  /** URL pública a la que Twilio enviará actualizaciones de estado. */
  statusCallback?: string;
};

/** Opciones aceptadas por client.messages.create que usamos aquí. */
type TwilioCreateOptions = {
  from: string;
  to: string;
  body?: string;
  contentSid?: string;
  contentVariables?: string;
  statusCallback?: string;
};

/** Normaliza un teléfono a la dirección de canal WhatsApp de Twilio. */
export function toWhatsAppAddress(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith("whatsapp:")) return trimmed;
  const digits = trimmed.replace(/[^\d+]/g, "");
  const e164 = digits.startsWith("+") ? digits : `+${digits}`;
  return `whatsapp:${e164}`;
}

/** Validación básica de E.164. Para validación fuerte usar libphonenumber-js. */
export function isValidE164(phone: string): boolean {
  const digits = phone.replace("whatsapp:", "").replace(/[^\d+]/g, "");
  return /^\+\d{7,15}$/.test(digits);
}

/**
 * URL pública (si está configurada) para recibir callbacks de estado de Twilio.
 * Twilio NO puede alcanzar localhost: define TWILIO_STATUS_CALLBACK_URL (o
 * WHATSAPP_WEBHOOK_BASE_URL) con una URL pública (ngrok, dominio, etc.) para
 * que los estados delivered/read/failed se actualicen automáticamente.
 */
export function getStatusCallbackUrl(): string | undefined {
  const base =
    process.env.TWILIO_STATUS_CALLBACK_URL ||
    process.env.WHATSAPP_WEBHOOK_BASE_URL ||
    "";
  if (!base) return undefined;

  let url = base.includes("/api/whatsapp/webhook")
    ? base
    : `${base.replace(/\/$/, "")}/api/whatsapp/webhook`;

  // Secreto compartido opcional para proteger el webhook
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (secret && !url.includes("token=")) {
    url += `${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(secret)}`;
  }
  return url;
}

/** Envía un único mensaje de WhatsApp vía Twilio. */
export async function sendWhatsAppMessage(params: SendWhatsAppParams) {
  const { to, body, contentSid, contentVariables, statusCallback } = params;
  const client = getTwilioClient();

  // Sender de WhatsApp: preferir el sender aprobado (producción); si no, el sandbox.
  const rawFrom = process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_PHONE_NUMBER;
  if (!rawFrom) {
    throw new Error(
      "Sender de WhatsApp no configurado (define TWILIO_WHATSAPP_FROM o TWILIO_PHONE_NUMBER)"
    );
  }
  const from = toWhatsAppAddress(rawFrom);

  const opts: TwilioCreateOptions = {
    from,
    to: toWhatsAppAddress(to),
  };

  if (contentSid) {
    opts.contentSid = contentSid;
    if (contentVariables && Object.keys(contentVariables).length > 0) {
      opts.contentVariables = JSON.stringify(contentVariables);
    }
  } else {
    opts.body = body ?? "";
  }

  if (statusCallback) opts.statusCallback = statusCallback;

  return client.messages.create(opts);
}

/** Mapea el MessageStatus de Twilio a nuestro estado interno. */
export function mapTwilioStatus(twilioStatus?: string): string {
  switch ((twilioStatus || "").toLowerCase()) {
    case "queued":
    case "accepted":
    case "scheduled":
      return "queued";
    case "sending":
    case "sent":
      return "sent";
    case "delivered":
      return "delivered";
    case "read":
      return "read";
    case "failed":
      return "failed";
    case "undelivered":
      return "undelivered";
    default:
      return twilioStatus || "pending";
  }
}

/** Rango de "avance" de un estado, para no retroceder con callbacks fuera de orden. */
export function statusRank(status: string): number {
  const order = ["pending", "queued", "sent", "delivered", "read"];
  const idx = order.indexOf(status);
  return idx === -1 ? -1 : idx;
}
