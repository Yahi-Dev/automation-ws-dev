// src/features/admin/services/admin-service.ts

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  status: string;
  role: string;
  phone: string | null;
  createdAt: string;
  // Señales de "esta persona ya estrenó la cuenta". Son opcionales: si el
  // listado no las trae, damos por hecho que aún no ha entrado y dejamos que el
  // backend lo decida al reenviar la invitación.
  lastLogin?: string | null;
  temporaryPassword?: boolean;
}

export async function getUsers(status?: string): Promise<AdminUser[]> {
  const url = new URL("/api/admin/users", window.location.origin);
  if (status) url.searchParams.set("status", status);
  url.searchParams.set("limit", "500"); // usuarios administrables: una sola página acotada
  const res = await fetch(url.toString());
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Error al cargar usuarios");
  return (json.data ?? []) as AdminUser[];
}

export async function updateUser(
  id: string,
  action: "approve" | "reject" | "make_admin" | "make_user"
): Promise<void> {
  const res = await fetch(`/api/admin/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Error al actualizar el usuario");
}

// Resultado de invitar (o reinvitar) a una persona. `enlaceInvitacion` sólo llega
// cuando el correo no se pudo enviar, para que el admin lo pase a mano.
export interface InvitacionResult {
  id: string;
  name: string;
  email: string;
  correoEnviado: boolean;
  enlaceInvitacion?: string | null;
}

export async function crearUsuario(input: { name: string; email: string }): Promise<InvitacionResult> {
  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: input.name, email: input.email }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Error al crear el usuario");
  return json.data as InvitacionResult;
}

export async function reenviarInvitacion(id: string): Promise<InvitacionResult> {
  const res = await fetch(`/api/admin/users/${id}/reenviar-invitacion`, { method: "POST" });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Error al reenviar la invitación");
  return json.data as InvitacionResult;
}
