// src/app/api/admin/users/route.ts
// GET  -> lista usuarios para el panel de administración (solo rol admin).
// POST -> da de alta a una persona (nombre + correo) y le envía la invitación.
import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { requireAdmin } from "@/src/lib/authz";
import { auth } from "@/src/lib/auth";
import { consumirMarcaInvitacion, marcarInvitacion, tomarEnlace } from "@/src/lib/invitaciones";
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
    // `lastLogin` y `temporaryPassword` no se pintan en la tabla: sirven para
    // saber si la persona ya estrenó la cuenta y así ofrecer «Reenviar
    // invitación» solo a quien todavía no ha entrado (mismo criterio que aplica
    // el endpoint de reenvío).
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      role: true,
      phone: true,
      createdAt: true,
      lastLogin: true,
      temporaryPassword: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return HttpResponse.sendSuccess({ Data: users, Total: users.length }, "Usuarios obtenidos");
}

const crearUsuarioSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(150, "El nombre no puede pasar de 150 caracteres"),
  // Se normaliza ANTES de validar: el correo es la clave de la cuenta y de la
  // invitación, así que " Ana@Correo.com " y "ana@correo.com" tienen que ser el
  // mismo usuario. better-auth también guarda el correo en minúsculas.
  email: z.string().trim().toLowerCase().pipe(z.email("El correo electrónico no es válido")),
});

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if ("response" in gate) return gate.response;

  try {
    const parsed = crearUsuarioSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return HttpResponse.sendBadRequest("Datos inválidos", parsed.error.flatten());
    }

    const { name, email } = parsed.data;
    const actor = gate.user.email ?? "admin";

    const existente = await prisma.user.findUnique({
      where: { email },
      select: { id: true, is_deleted: true },
    });

    if (existente) {
      return HttpResponse.sendBadRequest(
        existente.is_deleted
          ? "Ese correo pertenece a una cuenta eliminada. Hay que reactivarla desde la lista de usuarios; no se puede crear otra con el mismo correo."
          : "Ya existe un usuario con ese correo electrónico."
      );
    }

    // Contraseña de usar y tirar: nadie la va a conocer ni a necesitar. La
    // cuenta necesita una para existir, y la persona fijará la suya al aceptar
    // la invitación.
    const contrasenaDescartable = randomBytes(48).toString("base64url");

    // Se crea con el contexto interno de better-auth (mismo hash de contraseña
    // y misma fila `account` que un alta normal) en vez de con
    // `auth.api.signUpEmail`.
    //
    // Motivo: `signUpEmail` inicia sesión automáticamente, y el plugin
    // `nextCookies` vuelca la cookie de sesión resultante en la respuesta de
    // ESTA petición. Es decir: el administrador que crea el usuario saldría de
    // su propia sesión y entraría en la del recién invitado. Aquí no se crea
    // ninguna sesión, así que no hay cookie que se pueda colar.
    const contextoAuth = await auth.$context;
    const hash = await contextoAuth.password.hash(contrasenaDescartable);

    const creado = await contextoAuth.internalAdapter.createUser({
      email,
      name,
      emailVerified: false,
    });

    await contextoAuth.internalAdapter.createAccount({
      userId: creado.id,
      providerId: "credential",
      accountId: creado.id,
      password: hash,
    });

    // Lo crea un administrador: no tiene que pasar por la cola de aprobación.
    const usuario = await prisma.user.update({
      where: { id: creado.id },
      data: {
        status: "approved",
        role: "user",
        temporaryPassword: true,
        isNew: true,
        created_by: actor,
      },
      select: { id: true, name: true, email: true },
    });

    // La invitación reutiliza el restablecimiento de contraseña de better-auth
    // (token que caduca y de un solo uso). El texto del correo lo decide
    // `sendResetPassword` en src/lib/auth.ts, y para que mande el de invitación
    // en vez del de "restablece tu contraseña" hay que DECLARARLO antes: el
    // callback no recibe ningún dato que distinga los dos casos.
    marcarInvitacion(email);

    let falloElEnvio = false;
    try {
      await auth.api.requestPasswordReset({
        body: { email, redirectTo: "/aceptar-invitacion" },
      });
    } catch {
      falloElEnvio = true;
    }

    // Si el envío ni siquiera llegó a ocurrir, la marca sigue viva: se limpia
    // para que no contamine un "olvidé mi contraseña" del minuto siguiente.
    consumirMarcaInvitacion(email);

    // El enlace solo sigue en el almacén efímero si el correo NO llegó a salir
    // (`sendResetPassword` lo consume cuando el envío va bien). Se lee siempre,
    // para no dejarlo colgado en memoria.
    const enlaceInvitacion = tomarEnlace(email);
    const correoEnviado = !falloElEnvio && enlaceInvitacion === null;

    // La cuenta ya existe: un fallo de correo NO deshace nada. Se devuelve 201
    // con el enlace para que el administrador se lo pase a mano.
    const mensaje = correoEnviado
      ? `Usuario creado. Se envió la invitación a ${usuario.email}.`
      : enlaceInvitacion
        ? "Usuario creado, pero no se pudo enviar el correo. Comparte el enlace de invitación con la persona."
        : "Usuario creado, pero no se pudo enviar el correo ni recuperar el enlace. Usa «Reenviar invitación».";

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
    return HttpResponse.sendServerError("Error al crear el usuario", error);
  }
}
