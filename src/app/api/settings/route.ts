// src/app/api/settings/route.ts
// Configuración segura de Twilio y preferencias de envío.
// GET devuelve todo menos los secretos (solo flags de "está configurado").
// PUT hace upsert cifrando los secretos que vengan con valor nuevo.
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";
import { HttpResponse } from "@/src/utils/httpResponse";
import { encryptSecret } from "@/src/lib/crypto";
import { clearTwilioConfigCache } from "@/src/lib/app-config";

export const runtime = "nodejs";
const SINGLETON = "singleton";

const str = (v: unknown): string | null => (v == null || v === "" ? null : String(v));
const numOrNull = (v: unknown): number | null =>
  v === "" || v == null || Number.isNaN(Number(v)) ? null : Number(v);

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return HttpResponse.sendUnauthorized("Debes iniciar sesión");

  const s = await prisma.appSettings.findFirst();
  return HttpResponse.sendSuccess({
    Data: {
      twilioAccountSid: s?.twilioAccountSid ?? "",
      twilioApiKeySid: s?.twilioApiKeySid ?? "",
      whatsappFrom: s?.whatsappFrom ?? "",
      messagingServiceSid: s?.messagingServiceSid ?? "",
      contentBaseUrl: s?.contentBaseUrl ?? "",
      templateLanguage: s?.templateLanguage ?? "",
      batchSize: s?.batchSize ?? null,
      delayMs: s?.delayMs ?? null,
      webhookBaseUrl: s?.webhookBaseUrl ?? "",
      requireOptIn: s?.requireOptIn ?? false,
      // Flags de secretos (nunca se devuelven los valores)
      hasAuthToken: Boolean(s?.twilioAuthTokenEnc),
      hasApiKeySecret: Boolean(s?.twilioApiKeySecretEnc),
      hasWebhookSecret: Boolean(s?.webhookSecretEnc),
    },
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return HttpResponse.sendUnauthorized("Debes iniciar sesión");

  const body = await req.json().catch(() => ({}));

  const data: Prisma.appSettingsUncheckedUpdateInput = {
    twilioAccountSid: str(body.twilioAccountSid),
    twilioApiKeySid: str(body.twilioApiKeySid),
    whatsappFrom: str(body.whatsappFrom),
    messagingServiceSid: str(body.messagingServiceSid),
    contentBaseUrl: str(body.contentBaseUrl),
    templateLanguage: str(body.templateLanguage),
    batchSize: numOrNull(body.batchSize),
    delayMs: numOrNull(body.delayMs),
    webhookBaseUrl: str(body.webhookBaseUrl),
    requireOptIn: Boolean(body.requireOptIn),
    updatedBy: session.user.email ?? "system",
  };

  // Secretos: solo se actualizan si viene un valor nuevo (dejar en blanco = conservar).
  if (body.twilioAuthToken) data.twilioAuthTokenEnc = encryptSecret(String(body.twilioAuthToken));
  if (body.twilioApiKeySecret) data.twilioApiKeySecretEnc = encryptSecret(String(body.twilioApiKeySecret));
  if (body.webhookSecret) data.webhookSecretEnc = encryptSecret(String(body.webhookSecret));

  await prisma.appSettings.upsert({
    where: { id: SINGLETON },
    create: { id: SINGLETON, ...(data as Prisma.appSettingsUncheckedCreateInput) },
    update: data,
  });

  clearTwilioConfigCache();
  return HttpResponse.sendSuccess({}, "Configuración guardada");
}
