// src/features/inbound/components/inbound-table.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { DataTable } from "@/src/components/data-table"
import { Button } from "@/src/components/ui/button"
import { Link2, Loader2, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog"
import { ColumnDef } from "@tanstack/react-table"
import { InboundMessageRow } from "../types"
import { Skeleton } from "@/src/components/ui/skeleton"
import { Badge } from "@/src/components/ui/badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useContactsForLinking, useGetAllInbound, useLinkInbound } from "../hooks/use-inbound"

// Declarado fuera del componente: no se recrea en cada render.
const TableSkeleton = ({ cols, rows = 8 }: { cols: number; rows?: number }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between px-4 lg:px-6 mb-1">
      <div className="flex items-center gap-2" />
      <Skeleton className="h-9 w-40" />
    </div>

    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="p-3 text-left">
                <Skeleton className="h-4 w-24" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-t">
              {Array.from({ length: cols }).map((__, c) => (
                <td key={c} className="p-3">
                  <Skeleton className="h-4 w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="flex items-center justify-between px-4 mt-3">
      <Skeleton className="hidden h-5 w-52 lg:block" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  </div>
)

export default function InboundTable() {
  const { fetchAll, inbound, isLoading } = useGetAllInbound()
  const { link, isLoading: isLinking } = useLinkInbound()
  const { contacts, loadContacts, isLoading: isLoadingContacts } = useContactsForLinking()

  const [handledAs, setHandledAs] = useState<string>("")
  const [linkOpen, setLinkOpen] = useState(false)
  const [current, setCurrent] = useState<InboundMessageRow | null>(null)
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null)

  useEffect(() => {
    fetchAll(handledAs ? { handledAs } : undefined)
  }, [fetchAll, handledAs])

  // Texto de la acción que tomó el sistema con el mensaje entrante.
  const getHandledText = (value: string) => {
    switch (value) {
      case 'opt_out': return 'Baja'
      case 'opt_in': return 'Alta'
      case 'ninguno': return 'Sin acción'
      case 'contacto_desconocido': return 'Contacto desconocido'
      default: return value || '—'
    }
  }

  // Mismos colores que el resto de la app: baja en rojo, alta en verde,
  // remitente sin registrar en ámbar y "sin acción" neutro.
  const renderHandledBadge = (value: string) => {
    switch (value) {
      case 'opt_out':
        return <Badge variant="destructive" data-tour="entrantes-accion">Baja</Badge>
      case 'opt_in':
        return <Badge data-tour="entrantes-accion" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Alta</Badge>
      case 'contacto_desconocido':
        return <Badge data-tour="entrantes-accion" className="bg-amber-100 text-amber-700 hover:bg-amber-100">Contacto desconocido</Badge>
      default:
        return <Badge variant="outline" data-tour="entrantes-accion">{getHandledText(value)}</Badge>
    }
  }

  const handleLinkClick = (message: InboundMessageRow) => {
    setCurrent(message)
    setSelectedContactId(null)
    setLinkOpen(true)
    if (contacts.length === 0) {
      loadContacts()
    }
  }

  const handleConfirmLink = async () => {
    if (!current || !selectedContactId) return
    const response = await link(current.id, selectedContactId)
    if (response) {
      setLinkOpen(false)
      await fetchAll(handledAs ? { handledAs } : undefined)
    }
  }

  const filteredContacts = useMemo(() => {
    // El backend vincula POR TELÉFONO, nunca por el contacto que se elija: un
    // mensaje debe quedar asociado a quien de verdad lo escribió, o la traza de
    // consentimiento dejaría de valer como prueba.
    //
    // Por eso la lista solo ofrece el contacto que tiene ese mismo número.
    // Mostrar todos y rechazar la elección después sería una trampa para quien
    // usa la app: elegiría un nombre y recibiría un error sin entender por qué.
    const telefono = current?.fromPhone?.replace(/^whatsapp:/i, "").trim()
    if (!telefono) return []

    return contacts.filter((c) => c.phone.trim() === telefono)
  }, [contacts, current])

  const columns: ColumnDef<InboundMessageRow>[] = [
    {
      accessorKey: "receivedAt",
      header: "Fecha de recepción",
      cell: ({ row }) => {
        const receivedAt = new Date(row.original.receivedAt)
        return (
          <div className="text-sm">
            {isNaN(receivedAt.getTime())
              ? '-'
              : format(receivedAt, "dd/MM/yyyy HH:mm", { locale: es })}
          </div>
        )
      },
    },
    {
      accessorKey: "fromPhone",
      header: "Teléfono",
      cell: ({ row }) => (
        <div className="font-mono text-sm">{row.getValue("fromPhone")}</div>
      ),
    },
    {
      accessorKey: "contactName",
      header: "Contacto",
      cell: ({ row }) => {
        const contact = row.original.contact
        if (!contact) {
          return <div className="text-sm text-muted-foreground italic" data-tour="entrantes-desconocido">Desconocido</div>
        }
        return (
          <div>
            <div className="font-medium">{contact.name}</div>
            <div className="text-sm text-gray-500 font-mono">{contact.phone}</div>
          </div>
        )
      },
    },
    {
      accessorKey: "body",
      header: "Mensaje",
      cell: ({ row }) => {
        const body = row.original.body ?? ""
        const truncatedText = body.length > 80 ? `${body.substring(0, 80)}...` : body
        return (
          <div
            className="max-w-xs cursor-help truncate"
            title={body.length > 80 ? body : undefined}
          >
            {truncatedText || '—'}
          </div>
        )
      },
    },
    {
      accessorKey: "handledAs",
      header: "Acción realizada",
      cell: ({ row }) => {
        const value = row.getValue("handledAs") as string
        return renderHandledBadge(value)
      },
    },
    {
      id: "actions",
      header: "Acciones",
      enableHiding: false,
      cell: ({ row }) => {
        const message = row.original
        // Solo los huérfanos (sin contacto) se pueden vincular.
        if (message.contactId !== null) {
          return <span className="text-sm text-muted-foreground">—</span>
        }
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0" data-tour="entrantes-vincular">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="ml-5">Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleLinkClick(message)}>
                <Link2 className="mr-2 h-4 w-4" />
                Vincular a contacto
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <div className="container mx-auto py-5 px-5">
      <div className="mb-6" data-tour="entrantes-encabezado">
        <h1 className="text-3xl font-bold">Mensajes Entrantes</h1>
        <p className="text-muted-foreground">
          Respuestas que llegan por WhatsApp y qué hizo el sistema con cada una
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2" data-tour="entrantes-filtros">
        {[
          { key: "", label: "Todos" },
          { key: "opt_out", label: "Bajas" },
          { key: "opt_in", label: "Altas" },
          { key: "ninguno", label: "Sin acción" },
          { key: "contacto_desconocido", label: "Desconocidos" },
        ].map((f) => (
          <Button
            key={f.key || "all"}
            variant={handledAs === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => setHandledAs(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <TableSkeleton cols={columns.length} />
      ) : (
        <DataTable
          columns={columns}
          data={inbound}
          showCreateButton={false}
          searchPlaceholder="Buscar en mensajes entrantes..."
          dateColumnId="receivedAt"
          showDateRangeFilter={true}
        />
      )}

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular a contacto</DialogTitle>
            <DialogDescription>
              Este mensaje llegó desde {current?.fromPhone ?? ""} y no está asociado
              a ningún contacto. Solo puede vincularse al contacto que tenga ese
              mismo número de teléfono; si todavía no existe, créalo primero desde
              Contactos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="max-h-64 overflow-y-auto rounded-md border">
              {isLoadingContacts ? (
                <div className="space-y-2 p-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : filteredContacts.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  No hay ningún contacto con el número {current?.fromPhone ?? ""}.
                  <br />
                  Créalo primero desde <strong>Contactos</strong> y vuelve aquí.
                </p>
              ) : (
                filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => setSelectedContactId(contact.id)}
                    className={`flex w-full flex-col items-start border-b px-3 py-2 text-left last:border-b-0 hover:bg-gray-50 ${
                      selectedContactId === contact.id ? "bg-emerald-50" : ""
                    }`}
                  >
                    <span className="font-medium">{contact.name}</span>
                    <span className="font-mono text-sm text-gray-500">{contact.phone}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)} disabled={isLinking}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmLink} disabled={!selectedContactId || isLinking}>
              {isLinking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
