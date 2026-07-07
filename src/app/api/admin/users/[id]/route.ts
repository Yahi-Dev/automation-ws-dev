// src/app/api/admin/users/[id]/route.ts
// Aprueba / rechaza / cambia rol de un usuario (solo rol admin).
import { NextRequest } from "next/server";
import { requireAdmin } from "@/src/lib/authz";
import prisma from "@/src/lib/prisma";
import { HttpResponse } from "@/src/utils/httpResponse";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin(req);
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body?.action as string;

  const data: { status?: string; role?: string; updated_by?: string } = {
    updated_by: gate.user.email ?? "admin",
  };

  if (action === "approve") data.status = "approved";
  else if (action === "reject") data.status = "rejected";
  else if (action === "make_admin") data.role = "admin";
  else if (action === "make_user") data.role = "user";
  else return HttpResponse.sendBadRequest("Acción inválida");

  try {
    const updated = await prisma.user.update({
      where: { id },
      select: { id: true, email: true, status: true, role: true },
      data,
    });
    return HttpResponse.sendSuccess({ Data: updated }, "Usuario actualizado");
  } catch (error) {
    return HttpResponse.sendServerError("Error al actualizar el usuario", error);
  }
}
