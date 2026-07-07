// src/app/api/whatsapp/dispatch/route.ts
// Despacha las campañas programadas cuya fecha ya venció y tienen mensajes pendientes.
// Pensado para un cron externo (Vercel Cron, etc.). Autoriza por token (?token=CRON_SECRET)
// o por sesión de administrador.
import { NextRequest } from "next/server";
import { auth } from "@/src/lib/auth";
import { HttpResponse } from "@/src/utils/httpResponse";
import { dispatchDue } from "@/src/lib/dispatch";
import { safeEqual } from "@/src/lib/safe-compare";

export const runtime = "nodejs";
export const maxDuration = 300;

async function authorize(req: NextRequest): Promise<boolean> {
  const token = req.nextUrl.searchParams.get("token");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && token && safeEqual(token, cronSecret)) return true;
  const session = await auth.api.getSession({ headers: req.headers });
  const role = (session?.user as { role?: string; status?: string } | undefined);
  return role?.role === "admin" && role?.status === "approved";
}

async function handle(req: NextRequest) {
  if (!(await authorize(req))) return HttpResponse.sendForbidden("No autorizado");

  // Con cola: encola un job por campaña vencida (procesa el worker). Sin cola: envía síncrono.
  const result = await dispatchDue("cron");

  return HttpResponse.sendSuccess(
    { Data: result },
    `Dispatch: ${result.dispatched} campaña(s) ${result.mode === "queued" ? "encolada(s)" : "procesada(s)"}`
  );
}

export async function POST(req: NextRequest) {
  return handle(req);
}
export async function GET(req: NextRequest) {
  return handle(req);
}
