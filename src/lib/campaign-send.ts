// src/lib/campaign-send.ts
// Lógica central de envío de una campaña (post) a sus contactos pendientes.
// Reutilizada por POST /api/whatsapp (fallback síncrono) y por el worker `campaign-send`.
//
// Idempotencia (competing consumers / reintentos): cada mensaje se "reclama" con un
// updateMany condicional (pending/failed -> queued). Solo el worker que gana el reclamo
// envía; si un job se reintenta tras un fallo parcial, los ya enviados (status "sent")
// no vuelven a seleccionarse. Los "queued" colgados (envío iniciado pero proceso caído)
// se recuperan tras STUCK_MS.
import prisma from "./prisma";
import { redis, bumpCacheVersion } from "./redis";
import { sendWhatsAppMessage, isValidE164, getStatusCallbackUrl, twilioBreaker } from "./whatsapp";
import { getTwilioConfig } from "./app-config";
import { captureError } from "./logger";

const MESSAGES_CACHE_KEY = "messages-cache";
const STUCK_MS = 90_000; // un "queued" más viejo que esto se considera colgado y es recuperable
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Máximo de filas seleccionadas por ejecución (evita cargar la campaña entera). */
const MAX_POR_EJECUCION = Math.max(1, Number(process.env.WHATSAPP_MAX_PER_RUN ?? 500));

/** Intentos antes de dar un mensaje por perdido. */
const MAX_INTENTOS = Math.max(1, Number(process.env.WHATSAPP_MAX_ATTEMPTS ?? 3));

/**
 * Códigos de error que NO tiene sentido reintentar nunca.
 *
 * Los tres primeros son decisiones nuestras (consentimiento, formato); los
 * numéricos son de Twilio/Meta: número no válido, no registrado en WhatsApp o
 * imposible de entregar. Reintentarlos solo genera escritura y coste.
 */
const ERRORES_PERMANENTES = new Set([
  "CONSENT_OPT_OUT",
  "CONSENT_NOT_OPTED_IN",
  "PHONE_INVALID",
  "21211", // 'To' number is not a valid phone number
  "63003", // Channel could not find To address
  "131026", // Message undeliverable (Meta)
]);

export function esFalloPermanente(codigo: string | null | undefined): boolean {
  return codigo != null && ERRORES_PERMANENTES.has(codigo);
}

export type SendResult = {
  messageId: number;
  contactId: number;
  ok: boolean;
  sid?: string;
  error?: string;
};

export type SendPostOutcome =
  | { ok: false; reason: "not_found" | "template_rejected" | "template_not_approved" | "no_pending"; message: string }
  | {
      ok: true;
      postId: number;
      total: number;
      sent: number;
      failed: number;
      /** Mensajes elegibles que quedaron fuera de ESTA ejecucion (por el tope). */
      pendientesRestantes: number;
      /** El breaker de Twilio corto la ejecucion antes de terminar. */
      cortadoPorBreaker: boolean;
      results: SendResult[];
    };

export async function sendPostMessages(
  postId: number,
  actor: string,
  opts?: { batchSize?: number; delayMs?: number; includeSent?: boolean; requireOptIn?: boolean }
): Promise<SendPostOutcome> {
  const cfg = await getTwilioConfig();
  // Clamp server-side: el cliente NO puede desactivar el throttle ni disparar lotes
  // gigantes (evita abuso de credito Twilio / suspension de cuenta). Configurable por env.
  const MAX_BATCH = Math.max(1, Number(process.env.WHATSAPP_MAX_BATCH_SIZE ?? 100));
  const MIN_DELAY = Math.max(0, Number(process.env.WHATSAPP_MIN_DELAY_MS ?? 200));
  const reqBatch = Number(opts?.batchSize ?? cfg.batchSize) || 1;
  const reqDelay = Number(opts?.delayMs ?? cfg.delayMs) || 0;
  const batchSize = Math.min(MAX_BATCH, Math.max(1, reqBatch));
  const delayMs = Math.max(MIN_DELAY, reqDelay);
  const includeSent = Boolean(opts?.includeSent);
  const requireOptIn = opts?.requireOptIn ?? cfg.requireOptIn;

  const post = await prisma.posts.findFirst({
    where: { id: postId, isDeleted: false },
    include: { contentTemplate: true },
  });
  if (!post) return { ok: false, reason: "not_found", message: "Post no encontrado" };

  // Gate de plantilla
  const template = post.contentTemplate;
  if (template) {
    if (template.approvalStatus === "rejected") {
      return { ok: false, reason: "template_rejected", message: "La plantilla fue rechazada por WhatsApp." };
    }
    if (template.category === "MARKETING" && template.approvalStatus !== "approved") {
      return { ok: false, reason: "template_not_approved", message: "La plantilla de marketing no está aprobada." };
    }
  }

  // Estados elegibles para enviar (sin incluir "queued", que es el marcador de reclamo).
  const baseStatuses = includeSent
    ? ["pending", "failed", "sent", "undelivered"]
    : ["pending", "failed"];

  // Seleccionamos elegibles + "queued" colgados (recuperación de envíos interrumpidos).
  //
  // Dos condiciones nuevas frente a la versión anterior:
  //   - `terminalAt: null` y `attempts < MAX_INTENTOS` excluyen los mensajes ya
  //     cerrados. Sin esto, un fallo permanente se re-reclamaba cada 60 s para
  //     siempre (40.000 UPDATE/min con 20.000 contactos, sin enviar nada).
  //   - `take` acota la ejecución. Antes no había límite: una campaña de
  //     500.000 destinatarios se hidrataba entera en memoria (~300 MB) y
  //     tumbaba el worker por falta de heap antes de terminar.
  const stuckCutoff = new Date(Date.now() - STUCK_MS);
  const pending = await prisma.message.findMany({
    where: {
      postId,
      isDeleted: false,
      terminalAt: null,
      attempts: { lt: MAX_INTENTOS },
      OR: [
        { status: { in: baseStatuses } },
        { status: "queued", updatedAt: { lt: stuckCutoff } },
      ],
    },
    include: { contact: { select: { id: true, name: true, phone: true, consentState: true } } },
    orderBy: { id: "asc" },
    take: MAX_POR_EJECUCION,
  });
  if (pending.length === 0) {
    return { ok: false, reason: "no_pending", message: "No hay mensajes pendientes para este post." };
  }

  const statusCallback = await getStatusCallbackUrl();
  const contentSid = post.contentTemplate?.sid;

  let sent = 0;
  let failed = 0;
  let cortadoPorBreaker = false;
  const results: SendResult[] = [];

  /**
   * Marca un mensaje como fallido.
   *
   * Si el código es de fallo permanente, o si ya se agotaron los intentos, se
   * fija `terminalAt`: el mensaje deja de ser elegible y no vuelve a reclamarse.
   */
  const markFailed = async (id: number, code: string, msg: string, intentosPrevios: number) => {
    const intentos = intentosPrevios + 1;
    const esTerminal = esFalloPermanente(code) || intentos >= MAX_INTENTOS;

    await prisma.message
      .update({
        where: { id },
        data: {
          status: "failed",
          errorCode: code,
          errorMessage: msg,
          attempts: intentos,
          lastAttemptAt: new Date(),
          terminalAt: esTerminal ? new Date() : null,
          updatedBy: actor,
          updatedAt: new Date(),
        },
      })
      .catch(() => {});
  };

  for (let i = 0; i < pending.length; i++) {
    const msg = pending[i];
    const phone = msg.contact?.phone ?? "";
    const consentState = msg.contact?.consentState ?? "unknown";

    // Si el breaker de Twilio está abierto, cortamos este run: los mensajes no
    // reclamados quedan pendientes y se reintentan luego (el job reintenta con backoff).
    if (twilioBreaker.isOpen()) {
      cortadoPorBreaker = true;
      break;
    }

    // --- Reclamo idempotente: pending/failed/(queued colgado) -> queued ---
    // Si otro worker o intento ya lo reclamó/envió, count === 0 y lo saltamos.
    const claim = await prisma.message.updateMany({
      where: {
        id: msg.id,
        // Las mismas condiciones que la seleccion: entre el findMany y este
        // reclamo pudo cerrarse el mensaje desde otro worker.
        terminalAt: null,
        attempts: { lt: MAX_INTENTOS },
        OR: [
          { status: { in: baseStatuses } },
          { status: "queued", updatedAt: { lt: stuckCutoff } },
        ],
      },
      data: {
        status: "queued",
        // El contador se incrementa AL RECLAMAR, no al fallar: asi un proceso
        // que muera a mitad tambien consume intento y no puede reintentarse
        // indefinidamente por la via de los "queued" colgados.
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
        updatedBy: actor,
        updatedAt: new Date(),
      },
    });
    if (claim.count === 0) continue;

    if (consentState === "opted_out") {
      failed++;
      await markFailed(msg.id, "CONSENT_OPT_OUT", "El contacto se dio de baja (opt-out)", msg.attempts);
      results.push({ messageId: msg.id, contactId: msg.contactId, ok: false, error: "CONSENT_OPT_OUT" });
      continue;
    }
    if (requireOptIn && consentState !== "opted_in") {
      failed++;
      await markFailed(msg.id, "CONSENT_NOT_OPTED_IN", "El contacto no dio opt-in explícito", msg.attempts);
      results.push({ messageId: msg.id, contactId: msg.contactId, ok: false, error: "CONSENT_NOT_OPTED_IN" });
      continue;
    }
    if (!phone || !isValidE164(phone)) {
      failed++;
      await markFailed(msg.id, "PHONE_INVALID", "Número no válido (formato E.164)", msg.attempts);
      results.push({ messageId: msg.id, contactId: msg.contactId, ok: false, error: "PHONE_INVALID" });
      continue;
    }

    try {
      const contentVariables = contentSid ? { "1": msg.contact?.name ?? "Cliente" } : undefined;
      const tw = await sendWhatsAppMessage({
        to: phone,
        body: contentSid ? undefined : post.text,
        contentSid,
        contentVariables,
        statusCallback,
      });
      sent++;
      await prisma.message.update({
        where: { id: msg.id },
        data: {
          status: "sent",
          sentAt: new Date(),
          providerSid: tw.sid,
          errorCode: null,
          errorMessage: null,
          lastAttemptAt: new Date(),
          updatedBy: actor,
          updatedAt: new Date(),
        },
      });
      results.push({ messageId: msg.id, contactId: msg.contactId, ok: true, sid: tw.sid });
    } catch (err: unknown) {
      failed++;
      const e = err as { message?: string; code?: number | string; circuitOpen?: boolean };
      const code = e?.circuitOpen ? "TWILIO_CIRCUIT_OPEN" : e?.code != null ? String(e.code) : "TWILIO_ERROR";
      await markFailed(msg.id, code, e?.message ?? "Error al enviar", msg.attempts);
      captureError(err, { where: "campaign-send", messageId: msg.id, postId });
      results.push({ messageId: msg.id, contactId: msg.contactId, ok: false, error: e?.message ?? "TWILIO_ERROR" });
    }

    const isLast = i === pending.length - 1;
    if (!isLast && delayMs > 0) {
      const endOfBatch = (i + 1) % batchSize === 0;
      await sleep(endOfBatch ? delayMs * 2 : delayMs);
    }
  }

  await redis.del(MESSAGES_CACHE_KEY).catch(() => {});
  await bumpCacheVersion("dashboard").catch(() => {});

  // Cuantos siguen siendo elegibles. Es lo que permite al worker reencolar la
  // campana hasta terminarla, en lugar de depender del escaneo de cada 60 s.
  const pendientesRestantes = await prisma.message.count({
    where: {
      postId,
      isDeleted: false,
      terminalAt: null,
      attempts: { lt: MAX_INTENTOS },
      status: { in: baseStatuses },
    },
  });

  return {
    ok: true,
    postId,
    total: pending.length,
    sent,
    failed,
    pendientesRestantes,
    cortadoPorBreaker,
    results,
  };
}
