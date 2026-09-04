// src/app/api/whatsapp/webhook/route.ts
// Recibe los callbacks de estado de Twilio (statusCallback) y actualiza el
// estado de cada mensaje: sent -> delivered -> read, o failed/undelivered.
import { NextRequest, NextResponse } from "next/server";
import { getTwilioConfig } from "@/src/lib/app-config";
import { isValidTwilioSignature, formToParams } from "@/src/lib/twilio-webhook";
import { safeEqual } from "@/src/lib/safe-compare";
import { queueEnabled, enqueueWebhookEvent } from "@/src/lib/queue";
import { applyWebhookStatus } from "@/src/lib/webhook-ingest";
import { yaProcesado } from "@/src/lib/webhook-replay";

export const runtime = "nodejs";

/** Tope de tamano del cuerpo. Un statusCallback de Twilio no llega a 2 KB. */
const MAX_BODY_BYTES = 64 * 1024;

export async function POST(req: NextRequest) {
  try {
    // Protección opcional por secreto compartido (?token=...)
    const { webhookSecret } = await getTwilioConfig();
    if (webhookSecret) {
      const token = req.nextUrl.searchParams.get("token");
      if (!safeEqual(token, webhookSecret)) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    // Tope de tamano ANTES de parsear: `formData()` bufferiza el cuerpo entero
    // y estas rutas no tienen rate-limit (las llama Twilio, no un usuario).
    const declarado = Number(req.headers.get("content-length") ?? 0);
    if (declarado > MAX_BODY_BYTES) {
      return new NextResponse("Payload too large", { status: 413 });
    }

    // Twilio envía application/x-www-form-urlencoded
    const form = await req.formData();

    // Validación de firma (opt-in): rechaza peticiones no firmadas por Twilio.
    if (!(await isValidTwilioSignature(req, formToParams(form)))) {
      return new NextResponse("Invalid signature", { status: 403 });
    }

    const messageSid = String(form.get("MessageSid") ?? form.get("SmsSid") ?? "");
    const rawStatus = String(form.get("MessageStatus") ?? form.get("SmsStatus") ?? "");
    const errorCode = form.get("ErrorCode") ? String(form.get("ErrorCode")) : null;

    if (!messageSid) {
      return new NextResponse("Missing MessageSid", { status: 400 });
    }

    // ANTI-REPLAY. Una peticion firmada capturada se podia reenviar tal cual:
    // la firma sigue siendo valida porque no lleva marca temporal ni nonce.
    // Colapsar (sid, estado) evita que un replay reabra un estado ya aplicado.
    if (await yaProcesado(`status:${messageSid}:${rawStatus}`)) {
      return new NextResponse("", { status: 200 });
    }

    // Con cola: encolamos el evento y respondemos al instante (absorbe ráfagas de
    // callbacks; el worker `webhook-ingest` hace el upsert). Sin cola: aplicamos ya.
    if (queueEnabled) {
      await enqueueWebhookEvent({ messageSid, rawStatus, errorCode, receivedAt: new Date().toISOString() });
    } else {
      await applyWebhookStatus({ messageSid, rawStatus, errorCode });
    }

    // Twilio espera 200 (vacío o TwiML)
    return new NextResponse("", { status: 200 });
  } catch (error) {
    console.error("Twilio webhook error:", error);
    // 500, NO 200. Antes se respondia 200 ante cualquier excepcion propia
    // (base de datos caida, Redis caido...) y Twilio daba el evento por
    // entregado: el estado de ese mensaje se perdia para siempre, sin rastro.
    // Con 5xx, Twilio reintenta y el evento se recupera solo.
    return new NextResponse("Internal error", { status: 500 });
  }
}
