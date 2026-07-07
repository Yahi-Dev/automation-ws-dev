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

export const runtime = "nodejs";

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
    // 200 para que Twilio no reintente en bucle por errores nuestros.
    return twiml();
  }
}
