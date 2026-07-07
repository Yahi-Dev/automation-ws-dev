// src/features/admin/services/admin-service.ts

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  status: string;
  role: string;
  phone: string | null;
  createdAt: string;
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
