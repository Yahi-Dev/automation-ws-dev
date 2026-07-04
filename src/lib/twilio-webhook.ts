// src/lib/twilio-webhook.ts
// Validación de la firma X-Twilio-Signature de los webhooks entrantes.
// Es OPT-IN: solo valida si TWILIO_VALIDATE_SIGNATURE === "true" (así el desarrollo
// local por curl sigue funcionando; en producción se activa).
import twilio from "twilio";
import type { NextRequest } from "next/server";
import { getTwilioConfig } from "./app-config";

export async function isValidTwilioSignature(
  req: NextRequest,
  params: Record<string, string>
): Promise<boolean> {
  if (process.env.TWILIO_VALIDATE_SIGNATURE !== "true") return true;

  const { authToken } = await getTwilioConfig();
  if (!authToken) return false;

  const signature = req.headers.get("x-twilio-signature") ?? "";
  // URL pública que Twilio firmó. Detrás de un proxy, configura la app para que
  // req.nextUrl refleje el host público (o usa WHATSAPP_WEBHOOK_BASE_URL).
  const url = req.nextUrl?.href ?? req.url;

  try {
    return twilio.validateRequest(authToken, signature, url, params);
  } catch {
    return false;
  }
}

/** Convierte un FormData de Twilio en un objeto simple de strings. */
export function formToParams(form: FormData): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    if (typeof v === "string") params[k] = v;
  }
  return params;
}
