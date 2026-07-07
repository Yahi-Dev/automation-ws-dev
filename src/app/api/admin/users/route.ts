// src/app/api/admin/users/route.ts
// Lista usuarios para el panel de administración (solo rol admin).
import { NextRequest } from "next/server";
import { requireAdmin } from "@/src/lib/authz";
import prisma from "@/src/lib/prisma";
import { HttpResponse } from "@/src/utils/httpResponse";
import { parsePagination } from "@/src/lib/pagination";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if ("response" in gate) return gate.response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status")?.trim();
  const { limit } = parsePagination(searchParams);

  const users = await prisma.user.findMany({
    where: {
      is_deleted: false,
      ...(status ? { status } : {}),
    },
    select: { id: true, name: true, email: true, status: true, role: true, phone: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return HttpResponse.sendSuccess({ Data: users, Total: users.length }, "Usuarios obtenidos");
}
