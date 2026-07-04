// src/app/api/whatsapp/dispatch/route.ts
// Despacha las campañas programadas cuya fecha ya venció y tienen mensajes pendientes.
// Pensado para un cron externo (Vercel Cron, etc.). Autoriza por token (?token=CRON_SECRET)
// o por sesión de administrador.
import { NextRequest } from "next/server";
import { auth } from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";
import { HttpResponse } from "@/src/utils/httpResponse";
import { sendPostMessages } from "@/src/lib/campaign-send";

export const runtime = "nodejs";
export const maxDuration = 300;

async function authorize(req: NextRequest): Promise<boolean> {
  const token = req.nextUrl.searchParams.get("token");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && token && token === cronSecret) return true;
  const session = await auth.api.getSession({ headers: req.headers });
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

async function handle(req: NextRequest) {
  if (!(await authorize(req))) return HttpResponse.sendForbidden("No autorizado");

  const duePosts = await prisma.posts.findMany({
    where: {
      isDeleted: false,
      schedule: { lte: new Date() },
      messages: { some: { isDeleted: false, status: { in: ["pending", "failed"] } } },
    },
    select: { id: true },
  });

  const summaries: Array<Record<string, unknown>> = [];
  for (const p of duePosts) {
    const outcome = await sendPostMessages(p.id, "cron");
    summaries.push(
      outcome.ok
        ? { postId: p.id, sent: outcome.sent, failed: outcome.failed, total: outcome.total }
        : { postId: p.id, skipped: outcome.reason }
    );
  }

  return HttpResponse.sendSuccess(
    { Data: { dispatched: duePosts.length, summaries } },
    `Dispatch: ${duePosts.length} campaña(s) procesada(s)`
  );
}

export async function POST(req: NextRequest) {
  return handle(req);
}
export async function GET(req: NextRequest) {
  return handle(req);
}
