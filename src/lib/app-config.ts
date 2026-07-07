// src/lib/app-config.ts
// Resuelve la configuración de Twilio/envío desde la tabla app_settings (secretos
// cifrados), con fallback a variables de entorno. Cacheada 30s por proceso.
import prisma from "./prisma";
import { decryptSecret } from "./crypto";

export type TwilioConfig = {
  accountSid?: string;
  authToken?: string;
  apiKeySid?: string;
  apiKeySecret?: string;
  whatsappFrom?: string;
  messagingServiceSid?: string;
  contentBaseUrl: string;
  templateLanguage: string;
  batchSize: number;
  delayMs: number;
  webhookBaseUrl?: string;
  webhookSecret?: string;
  requireOptIn: boolean;
};

let cache: { value: TwilioConfig; at: number } | null = null;
const TTL_MS = 30_000;

export function clearTwilioConfigCache() {
  cache = null;
}

export async function getTwilioConfig(): Promise<TwilioConfig> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;

  let s: Awaited<ReturnType<typeof prisma.appSettings.findFirst>> = null;
  try {
    s = await prisma.appSettings.findFirst();
  } catch {
    // sin tabla/DB: usar solo env
  }

  const env = process.env;
  const value: TwilioConfig = {
    accountSid: s?.twilioAccountSid || env.TWILIO_ACCOUNT_SID,
    authToken: decryptSecret(s?.twilioAuthTokenEnc) || env.TWILIO_AUTH_TOKEN,
    apiKeySid: s?.twilioApiKeySid || env.TWILIO_API_KEY_SID,
    apiKeySecret: decryptSecret(s?.twilioApiKeySecretEnc) || env.TWILIO_API_KEY_SECRET,
    whatsappFrom: s?.whatsappFrom || env.TWILIO_WHATSAPP_FROM || env.TWILIO_PHONE_NUMBER,
    messagingServiceSid: s?.messagingServiceSid || env.TWILIO_MESSAGING_SERVICE_SID,
    contentBaseUrl: s?.contentBaseUrl || env.TWILIO_CONTENT_BASE_URL || "https://content.twilio.com/v1",
    templateLanguage: s?.templateLanguage || env.TWILIO_TEMPLATE_LANGUAGE_CODE || "es",
    batchSize: s?.batchSize ?? Number(env.WHATSAPP_BATCH_SIZE ?? 10),
    delayMs: s?.delayMs ?? Number(env.WHATSAPP_SEND_DELAY_MS ?? 1000),
    webhookBaseUrl: s?.webhookBaseUrl || env.WHATSAPP_WEBHOOK_BASE_URL,
    webhookSecret: decryptSecret(s?.webhookSecretEnc) || env.WHATSAPP_WEBHOOK_SECRET,
    // Fail-safe de consentimiento: por defecto TRUE (no enviar a quien no dio opt-in).
    // Solo aplica si no hay ajuste en app_settings; se puede desactivar con
    // WHATSAPP_REQUIRE_OPT_IN=false o desde Configuración (admin).
    requireOptIn: s?.requireOptIn ?? env.WHATSAPP_REQUIRE_OPT_IN !== "false",
  };

  cache = { value, at: Date.now() };
  return value;
}
