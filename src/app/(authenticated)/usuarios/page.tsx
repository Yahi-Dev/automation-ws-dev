import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/src/lib/auth";
import { UsersTable } from "@/src/features/admin/components/users-table";

export default async function UsuariosPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) redirect("/login");
  if (role !== "admin") redirect("/dashboard");

  return (
    <div className="container mx-auto px-5 py-6 pb-28">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Usuarios</h1>
        <p className="text-muted-foreground">
          Aprueba solicitudes de registro y gestiona los roles de acceso.
        </p>
      </div>
      <UsersTable />
    </div>
  );
}
