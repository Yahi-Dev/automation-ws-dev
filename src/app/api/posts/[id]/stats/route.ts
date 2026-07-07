// src/app/api/posts/[id]/stats/route.ts
// Desglose de estados de los mensajes de una campaña (post) para el monitoreo.
import { NextRequest } from "next/server";
import { requireAuth } from "@/src/lib/authz";
import prisma from "@/src/lib/prisma";
import { HttpResponse } from "@/src/utils/httpResponse";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAuth(req);
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return HttpResponse.sendBadRequest("Id inválido");
  }

  const grouped = await prisma.message.groupBy({
    by: ["status"],
    where: { postId, isDeleted: false },
    _count: { _all: true },
  });

  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const g of grouped) {
    byStatus[g.status] = g._count._all;
    total += g._count._all;
  }

  const sum = (...ss: string[]) => ss.reduce((a, s) => a + (byStatus[s] ?? 0), 0);
  const summary = {
    total,
    pending: sum("pending", "queued"),
    sent: sum("sent"),
    delivered: sum("delivered"),
    read: sum("read"),
    failed: sum("failed", "undelivered"),
  };

  return HttpResponse.sendSuccess({ Data: { postId, ...summary, byStatus } }, "Stats de la campaña");
}
