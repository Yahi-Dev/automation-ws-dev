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
