// src/app/api/admin/users/route.ts
// Lista usuarios para el panel de administración (solo rol admin).
import { NextRequest } from "next/server";
import { auth } from "@/src/lib/auth";
import prisma from "@/src/lib/prisma";
import { HttpResponse } from "@/src/utils/httpResponse";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) return HttpResponse.sendUnauthorized("Debes iniciar sesión");
  if (role !== "admin") return HttpResponse.sendForbidden("Requiere rol de administrador");

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status")?.trim();

  const users = await prisma.user.findMany({
    where: {
      is_deleted: false,
      ...(status ? { status } : {}),
    },
    select: { id: true, name: true, email: true, status: true, role: true, phone: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return HttpResponse.sendSuccess({ Data: users, Total: users.length }, "Usuarios obtenidos");
}
