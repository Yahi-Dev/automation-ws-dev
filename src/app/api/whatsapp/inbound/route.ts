// src/app/api/whatsapp/inbound/route.ts
// Recibe mensajes ENTRANTES de WhatsApp (Twilio "A message comes in") y procesa
// palabras clave de consentimiento: STOP/BAJA -> opt-out, ALTA/START -> opt-in.
// Es distinto del statusCallback (webhook/route.ts), que solo trae estados.
import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/src/lib/redis";
import { detectConsentKeyword, findContactByPhone, applyConsent } from "@/src/lib/consent";
import { getTwilioConfig } from "@/src/lib/app-config";
import { isValidTwilioSignature, formToParams } from "@/src/lib/twilio-webhook";
import { safeEqual } from "@/src/lib/safe-compare";

import { yaProcesado } from "@/src/lib/webhook-replay";

export const runtime = "nodejs";

/** Tope de tamano del cuerpo entrante de Twilio. */
const MAX_BODY_BYTES = 64 * 1024;

const CONTACTS_CACHE_KEY = "contacts-cache";

/** Respuesta TwiML (Twilio la usa para auto-responder). */
function twiml(message?: string) {
  const inner = message ? `<Message>${escapeXml(message)}</Message>` : "";
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`,
    { status: 200, headers: { "Content-Type": "text/xml" } }
  );
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function POST(req: NextRequest) {
  try {
    // Protección opcional por secreto compartido (?token=...)
    const { webhookSecret } = await getTwilioConfig();
    if (webhookSecret) {
      const token = req.nextUrl.searchParams.get("token");
      if (!safeEqual(token, webhookSecret)) return new NextResponse("Forbidden", { status: 403 });
    }

    // Tope de tamano ANTES de parsear: formData() bufferiza el cuerpo entero y
    // esta ruta no tiene rate-limit (la llama Twilio, no un usuario).
    const declarado = Number(req.headers.get("content-length") ?? 0);
    if (declarado > MAX_BODY_BYTES) {
      return new NextResponse("Payload too large", { status: 413 });
    }

    const form = await req.formData();

    // Validación de firma (opt-in): rechaza peticiones no firmadas por Twilio.
    if (!(await isValidTwilioSignature(req, formToParams(form)))) {
      return new NextResponse("Invalid signature", { status: 403 });
    }

    const from = String(form.get("From") ?? "");
    const body = String(form.get("Body") ?? "");
    if (!from) return twiml();

    const { type, keyword } = detectConsentKeyword(body);
    if (!type) return twiml(); // no es palabra clave de consentimiento: no auto-responder

    const contact = await findContactByPhone(from);
    if (!contact) return twiml(); // remitente desconocido: ignorar

    // ANTI-REPLAY: la firma de Twilio no lleva marca temporal ni nonce, asi que
    // una peticion capturada se puede reenviar indefinidamente. Sin esto, un
    // replay de un "ALTA" antiguo podia REVERTIR una baja posterior.
    const sid = String(form.get("MessageSid") ?? form.get("SmsMessageSid") ?? "");
    const claveEvento = sid ? `inbound:${sid}` : `inbound:${from}:${type}:${body.slice(0, 40)}`;
    if (await yaProcesado(claveEvento)) return twiml();

    await applyConsent({
      contactId: contact.id,
      event: type,
      source: "inbound",
      keyword,
      raw: body,
    });
    await redis.del(CONTACTS_CACHE_KEY).catch(() => {});

    const reply =
      type === "opt_out"
        ? "Has sido dado de baja y no recibirás más mensajes. Responde ALTA para volver a suscribirte."
        : "¡Suscripción confirmada! Volverás a recibir nuestros mensajes.";
    return twiml(reply);
  } catch (error) {
    console.error("Inbound webhook error:", error);
    // 500, NO 200. Antes se respondia 200 ante cualquier excepcion propia, con
    // lo que una caida de la base de datos hacia que Twilio diera por entregada
    // una BAJA que nunca se registro: el contacto seguia recibiendo mensajes y
    // no quedaba ningun rastro. Con 5xx, Twilio reintenta.
    return new NextResponse("Internal error", { status: 500 });
  }
}
