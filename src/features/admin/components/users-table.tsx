"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Check, X, ShieldCheck, User, Loader2 } from "lucide-react";
import { DataTable } from "@/src/components/data-table";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { getUsers, updateUser, type AdminUser } from "../services/admin-service";

const FILTERS = [
  { key: "pending", label: "Pendientes" },
  { key: "approved", label: "Aprobados" },
  { key: "rejected", label: "Rechazados" },
  { key: "", label: "Todos" },
];

function statusBadge(s: string) {
  if (s === "approved") return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Aprobado</Badge>;
  if (s === "rejected") return <Badge variant="destructive">Rechazado</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pendiente</Badge>;
}

export function UsersTable() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  const load = useCallback(async (status: string) => {
    setLoading(true);
    try {
      setUsers(await getUsers(status || undefined));
    } catch (e) {
      toast.error("Error al cargar usuarios", { description: e instanceof Error ? e.message : "" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  const act = async (id: string, action: "approve" | "reject" | "make_admin" | "make_user") => {
    try {
      await updateUser(id, action);
      toast.success("Usuario actualizado");
      await load(filter);
    } catch (e) {
      toast.error("Error", { description: e instanceof Error ? e.message : "" });
    }
  };

  const columns: ColumnDef<AdminUser>[] = [
    { accessorKey: "name", header: "Nombre" },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "phone", header: "Teléfono", cell: ({ row }) => <div>{(row.getValue("phone") as string) || "-"}</div> },
    { accessorKey: "status", header: "Estado", cell: ({ row }) => statusBadge(row.getValue("status") as string) },
    {
      accessorKey: "role",
      header: "Rol",
      cell: ({ row }) => <Badge variant="outline">{(row.getValue("role") as string) === "admin" ? "Admin" : "Usuario"}</Badge>,
    },
    {
      id: "actions",
      header: "Acciones",
      enableHiding: false,
      cell: ({ row }) => {
        const u = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {u.status !== "approved" && (
                <DropdownMenuItem onClick={() => act(u.id, "approve")}>
                  <Check className="mr-2 h-4 w-4 text-emerald-600" /> Aprobar
                </DropdownMenuItem>
              )}
              {u.status !== "rejected" && (
                <DropdownMenuItem onClick={() => act(u.id, "reject")}>
                  <X className="mr-2 h-4 w-4 text-red-600" /> Rechazar
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {u.role !== "admin" ? (
                <DropdownMenuItem onClick={() => act(u.id, "make_admin")}>
                  <ShieldCheck className="mr-2 h-4 w-4" /> Hacer admin
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => act(u.id, "make_user")}>
                  <User className="mr-2 h-4 w-4" /> Quitar admin
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key || "all"}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <DataTable columns={columns} data={users} searchPlaceholder="Buscar usuario..." />
      )}
    </div>
  );
}
