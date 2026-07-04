// src/app/api/settings/test/route.ts
// Prueba la conexión con Twilio usando la config actual (DB/env).
import { NextRequest } from "next/server";
import { auth } from "@/src/lib/auth";
import { HttpResponse } from "@/src/utils/httpResponse";
import { getTwilioClientFromConfig } from "@/src/lib/twilio";
import { getTwilioConfig, clearTwilioConfigCache } from "@/src/lib/app-config";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return HttpResponse.sendUnauthorized("Debes iniciar sesión");

  try {
    clearTwilioConfigCache();
    const cfg = await getTwilioConfig();
    if (!cfg.accountSid) {
      return HttpResponse.sendBadRequest("Falta el Account SID de Twilio");
    }
    const client = await getTwilioClientFromConfig();
    const account = await client.api.v2010.accounts(cfg.accountSid).fetch();
    return HttpResponse.sendSuccess(
      { Data: { ok: true, friendlyName: account.friendlyName, status: account.status } },
      `Conexión OK con Twilio (${account.friendlyName})`
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error desconocido";
    return HttpResponse.sendBadRequest(`No se pudo conectar con Twilio: ${msg}`);
  }
}
