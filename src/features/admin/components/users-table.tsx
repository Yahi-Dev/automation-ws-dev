"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Check, X, ShieldCheck, User, Loader2, Mail, Copy, UserPlus } from "lucide-react";
import { DataTable } from "@/src/components/data-table";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import {
  getUsers,
  updateUser,
  crearUsuario,
  reenviarInvitacion,
  type AdminUser,
  type InvitacionResult,
} from "../services/admin-service";

const FILTERS = [
  { key: "pending", label: "Pendientes" },
  { key: "approved", label: "Aprobados" },
  { key: "rejected", label: "Rechazados" },
  { key: "", label: "Todos" },
];

// Validación mínima en cliente: el servidor vuelve a comprobarlo.
const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function statusBadge(s: string) {
  if (s === "approved") return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Aprobado</Badge>;
  if (s === "rejected") return <Badge variant="destructive">Rechazado</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pendiente</Badge>;
}

// Recuadro con el enlace de invitación, para cuando el correo no se pudo enviar.
function EnlaceInvitacion({ invitacion }: { invitacion: InvitacionResult }) {
  const enlace = invitacion.enlaceInvitacion;

  const copiar = async () => {
    if (!enlace) return;
    try {
      await navigator.clipboard.writeText(enlace);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar", { description: "Selecciona el enlace y cópialo a mano." });
    }
  };

  return (
    <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm text-amber-800">
        No se pudo enviar el correo a <span className="font-medium">{invitacion.email}</span>. Copia este enlace y
        pásaselo tú (WhatsApp, otro correo, en persona…): al abrirlo elegirá su contraseña y entrará en la plataforma.
      </p>
      {enlace ? (
        <p className="rounded border bg-white p-2 font-mono text-xs break-all text-gray-700">{enlace}</p>
      ) : (
        <p className="text-sm text-amber-800">El servidor no devolvió el enlace. Vuelve a intentarlo más tarde.</p>
      )}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={copiar} disabled={!enlace}>
          <Copy className="mr-2 h-4 w-4" /> Copiar enlace
        </Button>
        <span className="text-xs text-amber-700">El enlace caduca y sólo sirve una vez.</span>
      </div>
    </div>
  );
}

export function UsersTable() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [crearOpen, setCrearOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [errorNombre, setErrorNombre] = useState("");
  const [errorCorreo, setErrorCorreo] = useState("");
  const [errorServidor, setErrorServidor] = useState("");
  const [busy, setBusy] = useState(false);
  // Sólo se rellenan cuando el correo falló: entonces hay que enseñar el enlace.
  const [invitacionCreada, setInvitacionCreada] = useState<InvitacionResult | null>(null);
  const [invitacionReenviada, setInvitacionReenviada] = useState<InvitacionResult | null>(null);

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

  const openCrear = () => {
    setNombre("");
    setCorreo("");
    setErrorNombre("");
    setErrorCorreo("");
    setErrorServidor("");
    setInvitacionCreada(null);
    setCrearOpen(true);
  };

  const handleCrear = async () => {
    const name = nombre.trim();
    const email = correo.trim();
    // Mismo minimo que exige el servidor (2 caracteres): si aqui dejaramos
    // pasar uno solo, la respuesta seria un generico "Datos inválidos".
    setErrorNombre(name.length >= 2 ? "" : "Escribe el nombre de la persona (mínimo 2 caracteres).");
    setErrorCorreo(CORREO_RE.test(email) ? "" : "Escribe un correo válido.");
    setErrorServidor("");
    if (name.length < 2 || !CORREO_RE.test(email)) return;

    setBusy(true);
    try {
      const invitacion = await crearUsuario({ name, email });
      await load(filter);
      if (invitacion.correoEnviado) {
        toast.success("Usuario creado", { description: `Se envió la invitación a ${invitacion.email}.` });
        setCrearOpen(false);
      } else {
        // El correo no salió: dejamos el diálogo abierto con el enlace a la vista.
        toast.warning("Usuario creado, pero el correo no se pudo enviar", {
          description: "Copia el enlace de invitación y pásaselo a la persona.",
        });
        setInvitacionCreada(invitacion);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      setErrorServidor(message || "Error al crear el usuario");
      toast.error("Error al crear el usuario", { description: message });
    } finally {
      setBusy(false);
    }
  };

  const handleReenviar = async (u: AdminUser) => {
    try {
      const invitacion = await reenviarInvitacion(u.id);
      if (invitacion.correoEnviado) {
        toast.success("Invitación reenviada", { description: `Se envió de nuevo a ${invitacion.email}.` });
      } else {
        toast.warning("El correo no se pudo enviar", {
          description: "Copia el enlace de invitación y pásaselo a la persona.",
        });
        setInvitacionReenviada(invitacion);
      }
    } catch (e) {
      toast.error("Error al reenviar la invitación", { description: e instanceof Error ? e.message : "" });
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
              {/* Sólo tiene sentido para quien todavía no ha estrenado la cuenta:
                  mismo criterio que aplica el endpoint de reenvío. */}
              {!u.lastLogin && u.temporaryPassword !== false && (
                <DropdownMenuItem onClick={() => handleReenviar(u)}>
                  <Mail className="mr-2 h-4 w-4" /> Reenviar invitación
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
        <DataTable
          columns={columns}
          data={users}
          searchPlaceholder="Buscar usuario..."
          createButtonText="Crear usuario"
          showCreateButton={true}
          onCreateClick={openCrear}
        />
      )}

      <Dialog open={crearOpen} onOpenChange={setCrearOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear usuario</DialogTitle>
            <DialogDescription>
              {invitacionCreada
                ? "El usuario ya existe, pero la invitación no salió por correo."
                : "Le llegará una invitación por correo para que elija su contraseña y entre."}
            </DialogDescription>
          </DialogHeader>

          {invitacionCreada ? (
            <EnlaceInvitacion invitacion={invitacionCreada} />
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="María López"
                  disabled={busy}
                />
                {errorNombre && <p className="text-sm text-red-600">{errorNombre}</p>}
              </div>
              <div className="space-y-2">
                <Label>Correo</Label>
                <Input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="maria@empresa.com"
                  disabled={busy}
                />
                {errorCorreo && <p className="text-sm text-red-600">{errorCorreo}</p>}
              </div>
              {errorServidor && (
                <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorServidor}</p>
              )}
            </div>
          )}

          <DialogFooter>
            {invitacionCreada ? (
              <Button onClick={() => setCrearOpen(false)}>Listo</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setCrearOpen(false)} disabled={busy}>
                  Cancelar
                </Button>
                <Button onClick={handleCrear} disabled={busy || !nombre.trim() || !correo.trim()}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  Crear e invitar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!invitacionReenviada} onOpenChange={(open) => !open && setInvitacionReenviada(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enlace de invitación</DialogTitle>
            <DialogDescription>La invitación se generó, pero no salió por correo.</DialogDescription>
          </DialogHeader>
          {invitacionReenviada && <EnlaceInvitacion invitacion={invitacionReenviada} />}
          <DialogFooter>
            <Button onClick={() => setInvitacionReenviada(null)}>Listo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
