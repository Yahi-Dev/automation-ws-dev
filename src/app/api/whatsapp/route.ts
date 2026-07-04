// src/app/api/whatsapp/route.ts
// Envío masivo (broadcast) de una campaña/post a sus contactos asignados.
import { NextRequest } from "next/server";
import { auth } from "@/src/lib/auth";
import { HttpResponse } from "@/src/utils/httpResponse";
import { sendPostMessages } from "@/src/lib/campaign-send";

export const runtime = "nodejs";
// El envío en lote puede tardar; ampliamos el tiempo máximo de ejecución.
export const maxDuration = 300;

/**
 * POST /api/whatsapp
 * body: { postId: number, batchSize?, delayMs?, includeSent? }
 * Envía a los mensajes pending/failed del post, con gate de consentimiento y de
 * plantilla, tracking por mensaje y control de velocidad. Ver lib/campaign-send.ts.
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
