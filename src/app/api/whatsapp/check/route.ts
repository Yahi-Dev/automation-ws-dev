import { NextRequest, NextResponse } from "next/server";
import { getTwilioClient } from "@/lib/twilio";

// Valida un E.164 básico. Para validación fuerte, usa libphonenumber-js.
function toE164(raw: string) {
    const digits = raw.replace(/[^\d+]/g, "");
    if (!/^\+\d{7,15}$/.test(digits)) return null;
    return digits;
}

export async function POST(req: NextRequest) {
    try {
        const { phone, message, fallbackSms = false } = await req.json();

        const e164 = toE164(phone);
        if (!e164) {
            return NextResponse.json(
                { ok: false, error: "PHONE_INVALID" },
                { status: 400 }
            );
        }

        const client = getTwilioClient();
        const fromWhatsApp = process.env.TWILIO_PHONE_NUMBER;
        if (!fromWhatsApp) {
            return NextResponse.json(
                { ok: false, error: "WHATSAPP_FROM_MISSING" },
                { status: 500 }
            );
        }

        // 1) Intentar enviar por WhatsApp
        try {
            const msg = await client.messages.create({
                from: fromWhatsApp, // ej: "whatsapp:+14155238886"
                to: `whatsapp:${e164}`, // destino en canal WhatsApp
                body: message ?? "Hola 👋",
            });

            return NextResponse.json({
                ok: true,
                hasWhatsApp: true,
                sid: msg.sid,
                channel: "whatsapp",
            });
        } catch (err: any) {
            // Twilio lanza error con código numérico.
            // 63003: The 'to' number is not a WhatsApp-enabled number.
            // Otros errores de Twilio: credenciales, rate limit, etc.
            return NextResponse.json(
                { ok: false, error: err?.message ?? "TWILIO_ERROR", code: err?.code },
                { status: 502 }
            );
        }
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, error: e?.message ?? "UNEXPECTED_ERROR" },
            { status: 500 }
        );
    }
}
