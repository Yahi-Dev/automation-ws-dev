// src/app/api/whatsapp/route.ts
// Envío masivo (broadcast) de una campaña/post a sus contactos asignados.
import { NextRequest } from "next/server";
import { auth } from "@/src/lib/auth";
import { HttpResponse } from "@/src/utils/httpResponse";
import { sendPostMessages } from "@/src/lib/campaign-send";
import { queueEnabled, enqueueCampaign } from "@/src/lib/queue";
import prisma from "@/src/lib/prisma";

export const runtime = "nodejs";
// El envío en lote puede tardar; ampliamos el tiempo máximo de ejecución.
export const maxDuration = 300;

/**
 * POST /api/whatsapp
 * body: { postId: number, batchSize?, delayMs?, includeSent? }
 *
 * Con cola habilitada (REDIS_URL + worker): ENCOLA el envío y responde 202 al
 * instante; el worker procesa por lotes con reintentos y los estados avanzan por
 * el webhook. Sin cola: envía de forma SÍNCRONA (fallback, comportamiento previo).
 * Gate de consentimiento y de plantilla, tracking por mensaje. Ver lib/campaign-send.ts.
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

    const actor = session.user.email ?? "system";

    // --- Camino asíncrono: encolar y responder de inmediato ---
    if (queueEnabled) {
      // Validaciones baratas antes de encolar (evita jobs inútiles).
      const post = await prisma.posts.findFirst({ where: { id: postId, isDeleted: false }, select: { id: true } });
      if (!post) return HttpResponse.sendNotFound("Post no encontrado");

      const pendingCount = await prisma.message.count({
        where: { postId, isDeleted: false, status: { in: body?.includeSent ? ["pending", "failed", "sent", "undelivered"] : ["pending", "failed"] } },
      });
      if (pendingCount === 0) return HttpResponse.sendBadRequest("No hay mensajes pendientes para este post.");

      const jobId = await enqueueCampaign({
        postId,
        actor,
        batchSize: body?.batchSize,
        delayMs: body?.delayMs,
        includeSent: body?.includeSent,
      });

      // data: null a propósito -> la UI muestra el `message` (no cuenta "0 enviados").
      return HttpResponse.sendAccepted(
        `Envío encolado: ${pendingCount} mensaje(s) en proceso. Los estados se actualizarán automáticamente.`,
        { jobId, Total: pendingCount }
      );
    }

    // --- Camino síncrono (fallback sin cola) ---
    const outcome = await sendPostMessages(postId, actor, {
      batchSize: body?.batchSize,
      delayMs: body?.delayMs,
      includeSent: body?.includeSent,
    });

    if (!outcome.ok) {
      if (outcome.reason === "not_found") return HttpResponse.sendNotFound(outcome.message);
      return HttpResponse.sendBadRequest(outcome.message);
    }

    return HttpResponse.sendSuccess(
      { Data: outcome, Total: outcome.total },
      `Envío procesado: ${outcome.sent} enviado(s), ${outcome.failed} fallido(s) de ${outcome.total}`
    );
  } catch (error) {
    return HttpResponse.sendServerError("Error interno al enviar los mensajes", error);
  }
}
