// src/lib/authz.ts
// Autorizacion centralizada para rutas de API.
// - requireAuth: exige sesion valida Y cuenta aprobada (gate de estado en servidor).
// - requireAdmin: ademas exige rol admin.
// Uso:
//   const gate = await requireAuth(req);
//   if ("response" in gate) return gate.response;
//   const actor = gate.user.email ?? "system";
import { auth } from "./auth";
import { HttpResponse } from "@/src/utils/httpResponse";

export type SessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: string;
  status?: string;
  is_deleted?: boolean;
};

export type AuthGate = { user: SessionUser } | { response: ReturnType<typeof HttpResponse.sendUnauthorized> };

/** Exige sesion autenticada y cuenta aprobada (no pending/rejected, no eliminada). */
export async function requireAuth(req: Request): Promise<AuthGate> {
  const session = await auth.api.getSession({ headers: req.headers });
  const user = session?.user as SessionUser | undefined;

  if (!user) return { response: HttpResponse.sendUnauthorized("Debes iniciar sesión") };
  if (user.is_deleted) return { response: HttpResponse.sendForbidden("Cuenta deshabilitada") };
  // Gate de estado en el servidor: la aprobacion del admin es obligatoria a nivel de API,
  // no solo un mensaje de UI. Un usuario 'pending'/'rejected' no puede operar.
  if (user.status && user.status !== "approved") {
    return { response: HttpResponse.sendForbidden("Tu cuenta está pendiente de aprobación") };
  }
  return { user };
}

/** Exige, ademas de sesion aprobada, rol de administrador. */
export async function requireAdmin(req: Request): Promise<AuthGate> {
  const gate = await requireAuth(req);
  if ("response" in gate) return gate;
  if (gate.user.role !== "admin") {
    return { response: HttpResponse.sendForbidden("Requiere rol de administrador") };
  }
  return gate;
}

/** Identificador con el que se sella `createdBy`/`updatedBy` en las tablas. */
export function actorOf(user: SessionUser): string {
  return user.email ?? "desconocido";
}

export function isAdmin(user: SessionUser): boolean {
  return user.role === "admin";
}

/**
 * Anade la condicion de PROPIEDAD a un `where` de Prisma.
 *
 * Modelo de autorizacion del proyecto:
 *   - un usuario aprobado LEE todo el espacio de trabajo y CREA libremente;
 *   - pero solo MODIFICA o BORRA lo que el mismo creo (`createdBy = su correo`);
 *   - un administrador no tiene esa restriccion.
 *
 * Antes de esto, `createdBy` se escribia en cinco sitios y no aparecia en
 * ninguna clausula `where` del proyecto: cualquier usuario aprobado podia
 * editar y borrar contactos, campanas y mensajes de cualquier otro.
 *
 * Uso previsto con `updateMany`/`deleteMany`, que aplican la comprobacion en la
 * MISMA sentencia que la escritura (sin ventana de carrera). Si el resultado es
 * `count === 0`, el recurso no existe o no es del actor: responder 404 en ambos
 * casos, para no revelar la existencia de recursos ajenos.
 */
export function ownedWhere<T extends object>(
  user: SessionUser,
  base: T
): T & { createdBy?: string } {
  if (isAdmin(user)) return base;
  return { ...base, createdBy: actorOf(user) };
}
