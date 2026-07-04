// src/app/api/whatsapp/webhook/route.ts
// Recibe los callbacks de estado de Twilio (statusCallback) y actualiza el
// estado de cada mensaje: sent -> delivered -> read, o failed/undelivered.
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { redis } from "@/src/lib/redis";
import { mapTwilioStatus, statusRank } from "@/src/lib/whatsapp";
import { getTwilioConfig } from "@/src/lib/app-config";
import { isValidTwilioSignature, formToParams } from "@/src/lib/twilio-webhook";

export const runtime = "nodejs";

const MESSAGES_CACHE_KEY = "messages-cache";

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

    const status = mapTwilioStatus(rawStatus);

    // Buscar el mensaje por el SID del proveedor
    const message = await prisma.message.findFirst({
      where: { providerSid: messageSid },
      select: { id: true, status: true },
    });

    if (!message) {
      // Desconocido para nosotros; respondemos 200 para que Twilio no reintente.
      return new NextResponse("", { status: 200 });
    }

    // Evitar retroceder de estado por callbacks fuera de orden
    // (ej.: un "delivered" que llega después de "read"), pero permitir
    // siempre marcar fallos.
    const isFailure = status === "failed" || status === "undelivered";
    if (!isFailure && statusRank(status) >= 0 && statusRank(status) < statusRank(message.status)) {
      return new NextResponse("", { status: 200 });
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
      // si llega "read" sin haber registrado delivered, lo inferimos
      data.deliveredAt = new Date();
    }
    if (errorCode) data.errorCode = errorCode;

    await prisma.message.update({ where: { id: message.id }, data });
    await redis.del(MESSAGES_CACHE_KEY).catch(() => {});

    // Twilio espera 200 (vacío o TwiML)
    return new NextResponse("", { status: 200 });
  } catch (error) {
    console.error("Twilio webhook error:", error);
    // Respondemos 200 para evitar reintentos en bucle por errores de parsing nuestros.
    return new NextResponse("", { status: 200 });
  }
}
