// src/lib/twilio-webhook.ts
// Validación de la firma X-Twilio-Signature de los webhooks entrantes.
// FAIL-CLOSED: se valida SIEMPRE, salvo que se desactive explícitamente en
// desarrollo con TWILIO_VALIDATE_SIGNATURE="false" (p. ej. para pruebas por curl).
// En producción NO definir esa variable: la firma queda obligatoria.
import twilio from "twilio";
import type { NextRequest } from "next/server";
import { getTwilioConfig } from "./app-config";

/**
 * URL contra la que Twilio calculó la firma. Detrás de un proxy que termina TLS o
 * reescribe el host, se reconstruye desde WHATSAPP_WEBHOOK_BASE_URL (host público)
 * conservando path + query del request, para que la validación sea fiable y no haya
 * incentivo a desactivarla.
 */
function signatureUrl(req: NextRequest, base?: string): string {
  const current = req.nextUrl ?? new URL(req.url);
  if (base) {
    try {
      const b = new URL(base);
      return `${b.origin}${current.pathname}${current.search}`;
    } catch {
      // base malformada: caer al href del request
    }
  }
  return current.href ?? req.url;
}

export async function isValidTwilioSignature(
  req: NextRequest,
  params: Record<string, string>
): Promise<boolean> {
  // Escape de desarrollo (explícito). Por defecto (variable ausente) se valida.
  if (process.env.TWILIO_VALIDATE_SIGNATURE === "false") return true;

  const { authToken, webhookBaseUrl } = await getTwilioConfig();
  if (!authToken) return false; // sin authToken no se puede validar -> rechazar

  const signature = req.headers.get("x-twilio-signature") ?? "";
  const url = signatureUrl(req, webhookBaseUrl);

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
