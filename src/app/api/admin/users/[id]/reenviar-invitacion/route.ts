// src/app/api/admin/users/[id]/reenviar-invitacion/route.ts
// Vuelve a enviar la invitación a una persona que todavía no ha entrado
// (solo rol admin). Mismo contrato de respuesta que POST /api/admin/users.
import { NextRequest } from "next/server";
import { requireAdmin } from "@/src/lib/authz";
import { auth } from "@/src/lib/auth";
import { consumirMarcaInvitacion, marcarInvitacion, tomarEnlace } from "@/src/lib/invitaciones";
import prisma from "@/src/lib/prisma";
import { HttpResponse } from "@/src/utils/httpResponse";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin(req);
  if ("response" in gate) return gate.response;

  try {
    const { id } = await params;

    const usuario = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        lastLogin: true,
        temporaryPassword: true,
        is_deleted: true,
      },
    });

    if (!usuario) return HttpResponse.sendNotFound("Usuario no encontrado");

    if (usuario.is_deleted) {
      return HttpResponse.sendBadRequest(
        "Esa cuenta está eliminada. Reactívala antes de volver a invitarla."
      );
    }

    // «Ya entró» se mide con dos señales, no solo con `lastLogin`: hoy el flujo
    // de acceso todavía no escribe esa columna, así que la marca fiable es que
    // la contraseña provisional ya no lo sea (la persona fijó la suya al
    // aceptar la invitación). Con cualquiera de las dos, no se reinvita: sería
    // regalar un enlace para cambiarle la contraseña a una cuenta en uso.
    const yaEntro = Boolean(usuario.lastLogin) || usuario.temporaryPassword === false;

    if (yaEntro) {
      return HttpResponse.sendBadRequest(
        "Esta persona ya entró en la plataforma y tiene su propia contraseña. Si la perdió, debe usar «Olvidé mi contraseña»."
      );
    }

    // Deja constancia de que la cuenta sigue sin estrenar. Es lo que consulta
    // el guardia `yaEntro` de arriba en el siguiente reenvío.
    await prisma.user.update({
      where: { id: usuario.id },
      data: { temporaryPassword: true, updated_by: gate.user.email ?? "admin" },
    });

    // Declara la intención para que `sendResetPassword` mande el texto de
    // INVITACIÓN y no el de restablecimiento (ver src/lib/auth.ts).
    marcarInvitacion(usuario.email);

    let falloElEnvio = false;
    try {
      await auth.api.requestPasswordReset({
        body: { email: usuario.email, redirectTo: "/aceptar-invitacion" },
      });
    } catch {
      falloElEnvio = true;
    }

    // Limpia la marca si el envío no llegó a ocurrir.
    consumirMarcaInvitacion(usuario.email);

    // Solo queda enlace guardado si el correo no llegó a salir.
    const enlaceInvitacion = tomarEnlace(usuario.email);
    const correoEnviado = !falloElEnvio && enlaceInvitacion === null;

    const mensaje = correoEnviado
      ? `Invitación reenviada a ${usuario.email}.`
      : enlaceInvitacion
        ? "No se pudo enviar el correo. Comparte el enlace de invitación con la persona."
        : "No se pudo enviar el correo ni recuperar el enlace. Vuelve a intentarlo en unos minutos.";

    return HttpResponse.sendCreated(
      {
        Data: {
          id: usuario.id,
          name: usuario.name,
          email: usuario.email,
          correoEnviado,
          ...(correoEnviado ? {} : { enlaceInvitacion }),
        },
      },
      mensaje
    );
  } catch (error) {
    return HttpResponse.sendServerError("Error al reenviar la invitación", error);
  }
}
