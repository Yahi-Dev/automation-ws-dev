// src/app/api/settings/route.ts
// Configuración segura de Twilio y preferencias de envío.
// GET devuelve todo menos los secretos (solo flags de "está configurado").
// PUT hace upsert cifrando los secretos que vengan con valor nuevo.
import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/src/lib/authz";
import prisma from "@/src/lib/prisma";
import { HttpResponse } from "@/src/utils/httpResponse";
import { encryptSecret } from "@/src/lib/crypto";
import { clearTwilioConfigCache } from "@/src/lib/app-config";
import { clearTwilioClientCache } from "@/src/lib/twilio";

export const runtime = "nodejs";
const SINGLETON = "singleton";

const str = (v: unknown): string | null => (v == null || v === "" ? null : String(v));
const numOrNull = (v: unknown): number | null =>
  v === "" || v == null || Number.isNaN(Number(v)) ? null : Number(v);

/**
 * URL que la app usara como base para hablar con un tercero o para recibir
 * callbacks. Se valida aqui, ANTES de guardarla, ademas de en el punto de uso:
 * estos dos campos son la entrada de un SSRF con las credenciales de Twilio
 * adjuntas (contentBaseUrl) y de una fuga de datos personales ejecutada por la
 * propia infraestructura de Twilio (webhookBaseUrl).
 */
const urlSegura = (etiqueta: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || /^https:\/\//i.test(v), {
      message: `${etiqueta} debe empezar por https://`,
    })
    .refine(
      (v) => {
        if (v === "") return true;
        try {
          new URL(v);
          return true;
        } catch {
          return false;
        }
      },
      { message: `${etiqueta} no es una URL válida` }
    );

const settingsUpdateSchema = z.object({
  twilioAccountSid: z.string().trim().max(64).optional(),
  twilioApiKeySid: z.string().trim().max(64).optional(),
  whatsappFrom: z.string().trim().max(32).optional(),
  messagingServiceSid: z.string().trim().max(64).optional(),
  contentBaseUrl: urlSegura("La URL de la Content API").max(255).optional(),
  templateLanguage: z.string().trim().max(16).optional(),
  webhookBaseUrl: urlSegura("La URL base del webhook").max(255).optional(),
  batchSize: z.union([z.number().int().min(1).max(1000), z.literal(""), z.null()]).optional(),
  delayMs: z.union([z.number().int().min(0).max(600_000), z.literal(""), z.null()]).optional(),
  requireOptIn: z.boolean().optional(),
  // Secretos: opcionales; si no vienen, se conservan los ya guardados.
  twilioAuthToken: z.string().trim().min(1).optional(),
  twilioApiKeySecret: z.string().trim().min(1).optional(),
  webhookSecret: z.string().trim().min(1).optional(),
});

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if ("response" in gate) return gate.response;

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
  const gate = await requireAdmin(req);
  if ("response" in gate) return gate.response;

  const parsed = settingsUpdateSchema.safeParse(await req.json().catch(() => ({})));

  if (!parsed.success) {
    return HttpResponse.sendBadRequest("Configuración inválida", parsed.error.flatten());
  }

  const body = parsed.data;

  // ACTUALIZACION PARCIAL. Antes se construia el objeto entero con `str(...)`,
  // asi que un PUT que no incluyera, por ejemplo, `whatsappFrom` lo sobrescribia
  // con null: guardar la pantalla de Configuracion a medias borraba el remitente,
  // el Messaging Service o la URL del webhook. Ahora solo se escribe lo que viene.
  const data: Prisma.appSettingsUncheckedUpdateInput = {
    updatedBy: gate.user.email ?? "system",
  };

  const asignar = <K extends keyof Prisma.appSettingsUncheckedUpdateInput>(
    clave: K,
    valor: unknown,
    transformar: (v: unknown) => unknown = str
  ) => {
    if (valor !== undefined) {
      (data as Record<string, unknown>)[clave as string] = transformar(valor);
    }
  };

  asignar("twilioAccountSid", body.twilioAccountSid);
  asignar("twilioApiKeySid", body.twilioApiKeySid);
  asignar("whatsappFrom", body.whatsappFrom);
  asignar("messagingServiceSid", body.messagingServiceSid);
  asignar("contentBaseUrl", body.contentBaseUrl);
  asignar("templateLanguage", body.templateLanguage);
  asignar("webhookBaseUrl", body.webhookBaseUrl);
  asignar("batchSize", body.batchSize, numOrNull);
  asignar("delayMs", body.delayMs, numOrNull);

  // El gate de consentimiento SOLO cambia si se pide explicitamente.
  // Antes era `Boolean(body.requireOptIn)`: cualquier guardado en el que el
  // campo no viajase lo dejaba en false y desactivaba el fail-safe para siempre.
  if (body.requireOptIn !== undefined) {
    data.requireOptIn = body.requireOptIn;
  }

  // Secretos: solo se actualizan si viene un valor nuevo (dejar en blanco = conservar).
  if (body.twilioAuthToken) data.twilioAuthTokenEnc = encryptSecret(body.twilioAuthToken);
  if (body.twilioApiKeySecret) data.twilioApiKeySecretEnc = encryptSecret(body.twilioApiKeySecret);
  if (body.webhookSecret) data.webhookSecretEnc = encryptSecret(body.webhookSecret);

  await prisma.appSettings.upsert({
    where: { id: SINGLETON },
    // En la creacion, requireOptIn debe nacer en true aunque no venga en el
    // cuerpo: es el fail-safe de consentimiento.
    create: {
      id: SINGLETON,
      requireOptIn: true,
      ...(data as Prisma.appSettingsUncheckedCreateInput),
    },
    update: data,
  });

  clearTwilioConfigCache();
  // El cliente de Twilio se memoiza por credenciales: si cambian aqui hay que
  // descartarlo tambien, o el proceso seguiria enviando con las anteriores.
  clearTwilioClientCache();

  return HttpResponse.sendSuccess({}, "Configuración guardada");
}
