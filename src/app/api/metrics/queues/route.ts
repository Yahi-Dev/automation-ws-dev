// src/app/api/metrics/queues/route.ts
// Profundidad de las colas para autoescalado (HPA) y monitoreo.
// Autoriza por token (?token=CRON_SECRET) o por sesión de administrador.
import { NextRequest } from "next/server";
import { auth } from "@/src/lib/auth";
import { HttpResponse } from "@/src/utils/httpResponse";
import { queueEnabled, getQueueDepths } from "@/src/lib/queue";
import { safeEqual } from "@/src/lib/safe-compare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorize(req: NextRequest): Promise<boolean> {
  const token = req.nextUrl.searchParams.get("token");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && token && safeEqual(token, cronSecret)) return true;
  const session = await auth.api.getSession({ headers: req.headers });
  const user = (session?.user as { role?: string; status?: string } | undefined);
  return user?.role === "admin" && user?.status === "approved";
}

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return HttpResponse.sendForbidden("No autorizado");

  const depths = await getQueueDepths();
  return HttpResponse.sendSuccess(
    { Data: { enabled: queueEnabled, queues: depths ?? {} } },
    "Métricas de cola"
  );
}
