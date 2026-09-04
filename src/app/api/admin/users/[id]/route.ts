// src/app/api/admin/users/[id]/route.ts
// Aprueba / rechaza / cambia rol de un usuario (solo rol admin).
import { NextRequest } from "next/server";
import { requireAdmin } from "@/src/lib/authz";
import prisma from "@/src/lib/prisma";
import { HttpResponse } from "@/src/utils/httpResponse";

export const runtime = "nodejs";

/** Se lanza dentro de la transaccion para abortarla sin escribir nada. */
class UltimoAdminError extends Error {
  constructor() {
    super("ULTIMO_ADMIN");
    this.name = "UltimoAdminError";
  }
}

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

  // Un administrador no puede degradarse ni rechazarse a si mismo. Sin esta
  // comprobacion, un solo clic dejaba el sistema sin acceso a /usuarios ni a
  // /configuracion, y recuperarlo exigia un UPDATE manual contra MySQL.
  const esAutoDegradacion = id === gate.user.id && (action === "make_user" || action === "reject");
  if (esAutoDegradacion) {
    return HttpResponse.sendBadRequest(
      "No puedes quitarte a ti mismo el acceso de administrador. Pídeselo a otro administrador."
    );
  }

  const quitaPrivilegios = action === "make_user" || action === "reject";

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // Si la accion quita privilegios, debe quedar al menos otro administrador
      // aprobado. Se comprueba DENTRO de la transaccion para que dos peticiones
      // simultaneas no puedan degradar a los dos ultimos admins a la vez.
      if (quitaPrivilegios) {
        const objetivo = await tx.user.findUnique({
          where: { id },
          select: { role: true, status: true, is_deleted: true },
        });

        if (!objetivo) return null;

        const eraAdminActivo =
          objetivo.role === "admin" && objetivo.status === "approved" && !objetivo.is_deleted;

        if (eraAdminActivo) {
          const otrosAdmins = await tx.user.count({
            where: {
              role: "admin",
              status: "approved",
              is_deleted: false,
              id: { not: id },
            },
          });

          if (otrosAdmins === 0) {
            throw new UltimoAdminError();
          }
        }
      }

      const fila = await tx.user.update({
        where: { id },
        select: { id: true, email: true, status: true, role: true },
        data,
      });

      // Revocar las sesiones vivas del usuario afectado. Sin esto, "rechazar" o
      // "quitar admin" no surtia efecto mientras la sesion siguiera abierta:
      // el cambio se escribia solo en MySQL y la sesion cacheada seguia viendo
      // el rol anterior.
      if (quitaPrivilegios) {
        await tx.session.deleteMany({ where: { userId: id } });
      }

      return fila;
    });

    if (!updated) return HttpResponse.sendNotFound("Usuario no encontrado");

    return HttpResponse.sendSuccess({ Data: updated }, "Usuario actualizado");
  } catch (error) {
    if (error instanceof UltimoAdminError) {
      return HttpResponse.sendBadRequest(
        "No se puede aplicar el cambio: es el único administrador aprobado que queda. " +
          "Nombra a otro administrador antes de quitarle el acceso a este."
      );
    }
    return HttpResponse.sendServerError("Error al actualizar el usuario", error);
  }
}
