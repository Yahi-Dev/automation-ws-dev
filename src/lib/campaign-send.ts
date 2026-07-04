// src/lib/campaign-send.ts
// Lógica central de envío de una campaña (post) a sus contactos pendientes.
// Reutilizada por POST /api/whatsapp y por el dispatch programado.
import prisma from "./prisma";
import { redis } from "./redis";
import { sendWhatsAppMessage, isValidE164, getStatusCallbackUrl } from "./whatsapp";
import { getTwilioConfig } from "./app-config";

const MESSAGES_CACHE_KEY = "messages-cache";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type SendResult = {
  messageId: number;
  contactId: number;
  ok: boolean;
  sid?: string;
  error?: string;
};

export type SendPostOutcome =
  | { ok: false; reason: "not_found" | "template_rejected" | "template_not_approved" | "no_pending"; message: string }
  | { ok: true; postId: number; total: number; sent: number; failed: number; results: SendResult[] };

export async function sendPostMessages(
  postId: number,
  actor: string,
  opts?: { batchSize?: number; delayMs?: number; includeSent?: boolean; requireOptIn?: boolean }
): Promise<SendPostOutcome> {
  const cfg = await getTwilioConfig();
  const batchSize = Math.max(1, Number(opts?.batchSize ?? cfg.batchSize));
  const delayMs = Math.max(0, Number(opts?.delayMs ?? cfg.delayMs));
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

  const statusFilter = includeSent
    ? ["pending", "failed", "sent", "undelivered"]
    : ["pending", "failed"];

  const pending = await prisma.message.findMany({
    where: { postId, isDeleted: false, status: { in: statusFilter } },
    include: { contact: { select: { id: true, name: true, phone: true, consentState: true } } },
    orderBy: { id: "asc" },
  });
  if (pending.length === 0) {
    return { ok: false, reason: "no_pending", message: "No hay mensajes pendientes para este post." };
  }

  const statusCallback = await getStatusCallbackUrl();
  const contentSid = post.contentTemplate?.sid;

  let sent = 0;
  let failed = 0;
  const results: SendResult[] = [];

  const markFailed = async (id: number, code: string, msg: string) => {
    await prisma.message
      .update({ where: { id }, data: { status: "failed", errorCode: code, errorMessage: msg, updatedBy: actor, updatedAt: new Date() } })
      .catch(() => {});
  };

  for (let i = 0; i < pending.length; i++) {
    const msg = pending[i];
    const phone = msg.contact?.phone ?? "";
    const consentState = msg.contact?.consentState ?? "unknown";

    if (consentState === "opted_out") {
      failed++;
      await markFailed(msg.id, "CONSENT_OPT_OUT", "El contacto se dio de baja (opt-out)");
      results.push({ messageId: msg.id, contactId: msg.contactId, ok: false, error: "CONSENT_OPT_OUT" });
      continue;
    }
    if (requireOptIn && consentState !== "opted_in") {
      failed++;
      await markFailed(msg.id, "CONSENT_NOT_OPTED_IN", "El contacto no dio opt-in explícito");
      results.push({ messageId: msg.id, contactId: msg.contactId, ok: false, error: "CONSENT_NOT_OPTED_IN" });
      continue;
    }
    if (!phone || !isValidE164(phone)) {
      failed++;
      await markFailed(msg.id, "PHONE_INVALID", "Número no válido (formato E.164)");
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
        data: { status: "sent", sentAt: new Date(), providerSid: tw.sid, errorCode: null, errorMessage: null, updatedBy: actor, updatedAt: new Date() },
      });
      results.push({ messageId: msg.id, contactId: msg.contactId, ok: true, sid: tw.sid });
    } catch (err: unknown) {
      failed++;
      const e = err as { message?: string; code?: number | string };
      await markFailed(msg.id, e?.code != null ? String(e.code) : "TWILIO_ERROR", e?.message ?? "Error al enviar");
      results.push({ messageId: msg.id, contactId: msg.contactId, ok: false, error: e?.message ?? "TWILIO_ERROR" });
    }

    const isLast = i === pending.length - 1;
    if (!isLast && delayMs > 0) {
      const endOfBatch = (i + 1) % batchSize === 0;
      await sleep(endOfBatch ? delayMs * 2 : delayMs);
    }
  }

  await redis.del(MESSAGES_CACHE_KEY).catch(() => {});
  return { ok: true, postId, total: pending.length, sent, failed, results };
}
