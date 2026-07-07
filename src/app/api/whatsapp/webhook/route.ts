// src/app/api/whatsapp/webhook/route.ts
// Recibe los callbacks de estado de Twilio (statusCallback) y actualiza el
// estado de cada mensaje: sent -> delivered -> read, o failed/undelivered.
import { NextRequest, NextResponse } from "next/server";
import { getTwilioConfig } from "@/src/lib/app-config";
import { isValidTwilioSignature, formToParams } from "@/src/lib/twilio-webhook";
import { queueEnabled, enqueueWebhookEvent } from "@/src/lib/queue";
import { applyWebhookStatus } from "@/src/lib/webhook-ingest";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Protección opcional por secreto compartido (?token=...)
    const { webhookSecret } = await getTwilioConfig();
    if (webhookSecret) {
      const token = req.nextUrl.searchParams.get("token");
      if (token !== webhookSecret) {
        return new NextResponse("Forbidden", { status: 403 });
      }
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
    // Respondemos 200 para evitar reintentos en bucle por errores de parsing nuestros.
    return new NextResponse("", { status: 200 });
  }
}
