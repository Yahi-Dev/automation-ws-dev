"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Send, RefreshCw, Loader2 } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  getTemplates,
  submitForApproval,
  refreshApproval,
  type TemplateItem,
} from "../services/templates-service";

function statusBadge(status: string | null) {
  switch (status) {
    case "approved":
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Aprobada</Badge>;
    case "pending":
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pendiente</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rechazada</Badge>;
    case "received":
      return <Badge variant="outline">Creada</Badge>;
    default:
      return <Badge variant="outline">—</Badge>;
  }
}

export function TemplatesTable() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [current, setCurrent] = useState<TemplateItem | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("UTILITY");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTemplates(await getTemplates());
    } catch (e) {
      toast.error("Error al cargar plantillas", { description: e instanceof Error ? e.message : "" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openSubmit = (t: TemplateItem) => {
    setCurrent(t);
    setName(t.friendlyName.replace(/[^a-z0-9_]/gi, "_").toLowerCase().slice(0, 60));
    setCategory(t.category ?? "UTILITY");
    setSubmitOpen(true);
  };

  const handleSubmit = async () => {
    if (!current) return;
    setBusy(true);
    try {
      await submitForApproval(current.sid, name, category);
      toast.success("Enviada a aprobación", { description: "El estado quedó en pendiente." });
      setSubmitOpen(false);
      await load();
    } catch (e) {
      toast.error("Error al enviar a aprobación", { description: e instanceof Error ? e.message : "" });
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = async (t: TemplateItem) => {
    try {
      const status = await refreshApproval(t.sid);
      toast.success("Estado actualizado", { description: status ? `Estado: ${status}` : "Sin cambios" });
      await load();
    } catch (e) {
      toast.error("Error al actualizar el estado", { description: e instanceof Error ? e.message : "" });
    }
  };

  const columns: ColumnDef<TemplateItem>[] = [
    { accessorKey: "friendlyName", header: "Nombre" },
    {
      accessorKey: "category",
      header: "Categoría",
      cell: ({ row }) => <div>{(row.getValue("category") as string) || "—"}</div>,
    },
    {
      accessorKey: "language",
      header: "Idioma",
      cell: ({ row }) => <div className="uppercase">{row.getValue("language") as string}</div>,
    },
    {
      accessorKey: "approvalStatus",
      header: "Estado",
      cell: ({ row }) => statusBadge(row.getValue("approvalStatus") as string | null),
    },
    {
      accessorKey: "createdAt",
      header: "Creada",
      cell: ({ row }) => {
        const d = new Date(row.getValue("createdAt") as string);
        return <div className="text-sm">{isNaN(d.getTime()) ? "-" : d.toLocaleDateString()}</div>;
      },
    },
    {
      id: "actions",
      header: "Acciones",
      enableHiding: false,
      cell: ({ row }) => {
        const t = row.original;
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
              <DropdownMenuItem onClick={() => openSubmit(t)}>
                <Send className="mr-2 h-4 w-4" />
                Enviar a aprobación
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleRefresh(t)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualizar estado
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div>
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <DataTable columns={columns} data={templates} searchPlaceholder="Buscar plantilla..." />
      )}

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar plantilla a aprobación</DialogTitle>
            <DialogDescription>
              WhatsApp requiere un nombre único (minúsculas, números y guion bajo) y una categoría.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre de la plantilla</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="mi_template_whatsapp" />
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTILITY">Utilidad (notificaciones)</SelectItem>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="AUTHENTICATION">Autenticación</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={busy || !name.trim()}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
