// src/app/api/whatsapp/route.ts
// Envío masivo (broadcast) de una campaña/post a sus contactos asignados.
import { NextRequest } from "next/server";
import { auth } from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";
import { redis } from "@/src/lib/redis";
import { CatchError } from "@/src/utils/catchError";
import { HttpResponse } from "@/src/utils/httpResponse";
import {
  sendWhatsAppMessage,
  isValidE164,
  getStatusCallbackUrl,
} from "@/src/lib/whatsapp";

export const runtime = "nodejs";
// El envío en lote puede tardar; ampliamos el tiempo máximo de ejecución.
export const maxDuration = 300;

const MESSAGES_CACHE_KEY = "messages-cache";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type SendResult = {
  messageId: number;
  contactId: number;
  ok: boolean;
  sid?: string;
  error?: string;
};

/**
 * POST /api/whatsapp
 * body: { postId: number, batchSize?: number, delayMs?: number, includeSent?: boolean }
 *
 * Envía a todos los mensajes "pending" (y "failed" para reintentar) del post,
 * en lotes con una pausa configurable entre mensajes (control de velocidad).
 * Si el post tiene un Content Template aprobado se usa ese (broadcast/marketing);
 * en caso contrario se envía el texto del post como mensaje libre (sandbox / 24h).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return HttpResponse.sendUnauthorized("Debes iniciar sesión para enviar mensajes");
    }

    const body = await req.json().catch(() => ({}));
    const postId = Number(body?.postId);
    if (!Number.isInteger(postId) || postId <= 0) {
      return HttpResponse.sendBadRequest("postId inválido");
    }

    // Control de velocidad / lotes (configurable por request o por entorno)
    const batchSize = Math.max(1, Number(body?.batchSize ?? process.env.WHATSAPP_BATCH_SIZE ?? 10));
    const delayMs = Math.max(0, Number(body?.delayMs ?? process.env.WHATSAPP_SEND_DELAY_MS ?? 1000));
    const includeSent = Boolean(body?.includeSent);

    // 1) Cargar post + su template (si tiene)
    const [post, postError] = await CatchError(
      prisma.posts.findFirst({
        where: { id: postId, isDeleted: false },
        include: { contentTemplate: true },
      })
    );
    if (postError) return HttpResponse.sendServerError("Error al cargar el post", postError);
    if (!post) return HttpResponse.sendNotFound("Post no encontrado");

    // 2) Mensajes a enviar: pendientes (+ fallidos para reintentar)
    const statusFilter = includeSent
      ? ["pending", "failed", "sent", "undelivered"]
      : ["pending", "failed"];

    const [pending, pendingError] = await CatchError(
      prisma.message.findMany({
        where: { postId, isDeleted: false, status: { in: statusFilter } },
        include: {
          contact: {
            select: { id: true, name: true, phone: true, whatsapp: true, consentState: true },
          },
        },
        orderBy: { id: "asc" },
      })
    );
    if (pendingError) return HttpResponse.sendServerError("Error al cargar los mensajes", pendingError);
    if (!pending || pending.length === 0) {
      return HttpResponse.sendBadRequest(
        "No hay mensajes pendientes para este post. Asigna contactos primero."
      );
    }

    const statusCallback = getStatusCallbackUrl();
    const contentSid = post.contentTemplate?.sid;
    const actor = session.user.email ?? "system";
    // Cumplimiento: nunca enviar a opted-out; opcionalmente exigir opt-in explícito.
    const requireOptIn = process.env.WHATSAPP_REQUIRE_OPT_IN === "true";

    // TODO (M4): cuando TwilioContentTemplate persista `approvalStatus`, bloquear el
    // envío de plantillas de marketing que no estén 'approved'. Ej.:
    //   if (contentSid && post.contentTemplate?.approvalStatus !== 'approved')
    //     return HttpResponse.sendBadRequest('La plantilla no está aprobada por WhatsApp');

    let sent = 0;
    let failed = 0;
    const results: SendResult[] = [];

    for (let i = 0; i < pending.length; i++) {
      const msg = pending[i];
      const phone = msg.contact?.phone ?? "";
      const consentState = msg.contact?.consentState ?? "unknown";

      // Gate de consentimiento: nunca enviar a quien hizo opt-out
      if (consentState === "opted_out") {
        failed++;
        await prisma.message
          .update({
            where: { id: msg.id },
            data: {
              status: "failed",
              errorCode: "CONSENT_OPT_OUT",
              errorMessage: "El contacto se dio de baja (opt-out)",
              updatedBy: actor,
              updatedAt: new Date(),
            },
          })
          .catch(() => {});
        results.push({ messageId: msg.id, contactId: msg.contactId, ok: false, error: "CONSENT_OPT_OUT" });
        continue;
      }

      // Opcional (marketing): exigir opt-in explícito
      if (requireOptIn && consentState !== "opted_in") {
        failed++;
        await prisma.message
          .update({
            where: { id: msg.id },
            data: {
              status: "failed",
              errorCode: "CONSENT_NOT_OPTED_IN",
              errorMessage: "El contacto no dio opt-in explícito",
              updatedBy: actor,
              updatedAt: new Date(),
            },
          })
          .catch(() => {});
        results.push({ messageId: msg.id, contactId: msg.contactId, ok: false, error: "CONSENT_NOT_OPTED_IN" });
        continue;
      }

      // Validación previa del número
      if (!phone || !isValidE164(phone)) {
        failed++;
        await prisma.message
          .update({
            where: { id: msg.id },
            data: {
              status: "failed",
              errorCode: "PHONE_INVALID",
              errorMessage: "Número no válido (formato E.164)",
              updatedBy: actor,
              updatedAt: new Date(),
            },
          })
          .catch(() => {});
        results.push({ messageId: msg.id, contactId: msg.contactId, ok: false, error: "PHONE_INVALID" });
        continue;
      }

      try {
        const contentVariables = contentSid
          ? { "1": msg.contact?.name ?? "Cliente" }
          : undefined;

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
            updatedBy: actor,
            updatedAt: new Date(),
          },
        });
        results.push({ messageId: msg.id, contactId: msg.contactId, ok: true, sid: tw.sid });
      } catch (err: unknown) {
        failed++;
        const e = err as { message?: string; code?: number | string };
        await prisma.message
          .update({
            where: { id: msg.id },
            data: {
              status: "failed",
              errorCode: e?.code != null ? String(e.code) : "TWILIO_ERROR",
              errorMessage: e?.message ?? "Error al enviar",
              updatedBy: actor,
              updatedAt: new Date(),
            },
          })
          .catch(() => {});
        results.push({
          messageId: msg.id,
          contactId: msg.contactId,
          ok: false,
          error: e?.message ?? "TWILIO_ERROR",
        });
      }

      // Control de velocidad: pausa entre mensajes (no tras el último)
      const isLast = i === pending.length - 1;
      if (!isLast && delayMs > 0) {
        // pausa normal entre mensajes; pausa doble al cerrar un lote
        const endOfBatch = (i + 1) % batchSize === 0;
        await sleep(endOfBatch ? delayMs * 2 : delayMs);
      }
    }

    await redis.del(MESSAGES_CACHE_KEY).catch(() => {});

    return HttpResponse.sendSuccess(
      { Data: { postId, total: pending.length, sent, failed, results }, Total: pending.length },
      `Envío procesado: ${sent} enviado(s), ${failed} fallido(s) de ${pending.length}`
    );
  } catch (error) {
    return HttpResponse.sendServerError("Error interno al enviar los mensajes", error);
  }
}
