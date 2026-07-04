// src/app/api/whatsapp/check/route.ts
// Validación de número NO intrusiva: usa libphonenumber-js (no envía ningún mensaje).
// Antes esta ruta enviaba un WhatsApp real para "detectar" capacidad — eso spameaba
// y costaba dinero. Ahora solo valida formato/tipo.
import { NextRequest, NextResponse } from "next/server";
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { phone, country } = await req.json().catch(() => ({}));

    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ ok: false, error: "PHONE_REQUIRED" }, { status: 400 });
    }

    const parsed = parsePhoneNumberFromString(phone, country as CountryCode | undefined);
    const valid = Boolean(parsed?.isValid());
    const type = parsed?.getType();

    // Sin enviar nada no se puede confirmar 100% que el número tenga WhatsApp;
    // consideramos "alcanzable" a un número válido de tipo móvil (o desconocido).
    // La capacidad real se confirma con el estado de entrega del primer envío.
    const hasWhatsApp =
      valid && (type === undefined || type === "MOBILE" || type === "FIXED_LINE_OR_MOBILE");

    return NextResponse.json({
      ok: true,
      valid,
      hasWhatsApp,
      e164: parsed?.number ?? null,
      country: parsed?.country ?? null,
      type: type ?? null,
    });
  } catch (error) {
    console.error("Phone validation error:", error);
    return NextResponse.json({ ok: false, error: "VALIDATION_ERROR" }, { status: 500 });
  }
}
