// src/features/messages/components/messages-table.tsx
"use client"

import { useEffect, useState } from "react"
import { DataTable } from "@/src/components/data-table"
import { Button } from "@/src/components/ui/button"
import { MoreHorizontal, Eye, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { MessageWithRelations } from "../types"
import { DeleteConfirmationModal } from "@/src/components/ui/delete"
import { Skeleton } from "@/src/components/ui/skeleton"
import { Badge } from "@/src/components/ui/badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useDeleteMessage, useGetAllMessages } from "../hooks/use-message"

export default function MessagesTable() {
  const router = useRouter()
  const { fetchAll, messages, isLoading } = useGetAllMessages()
  const { remove: handleDelete } = useDeleteMessage()

  const [currentMessageId, setCurrentMessageId] = useState<number | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDeleteClick = (id: number) => {
    setCurrentMessageId(id)
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!currentMessageId) return
    try {
      await handleDelete(currentMessageId)
      await fetchAll()
    } finally {
      setIsDeleteModalOpen(false)
    }
  }

  const handleAssignMessage = () => {
    router.push("/messages/assign")
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'sent': return 'default'
      case 'delivered': return 'secondary'
      case 'read': return 'secondary'
      case 'failed': return 'destructive'
      case 'undelivered': return 'destructive'
      default: return 'outline'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente'
      case 'queued': return 'En cola'
      case 'sent': return 'Enviado'
      case 'delivered': return 'Entregado'
      case 'read': return 'Leído'
      case 'failed': return 'Fallido'
      case 'undelivered': return 'No entregado'
      default: return status
    }
  }

  const columns: ColumnDef<MessageWithRelations>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => (
        <div className="font-mono text-sm">{row.getValue("id")}</div>
      )
    },
    {
      accessorKey: "post.text",
      header: "Contenido del Post",
      cell: ({ row }) => {
        const post = row.original.post
        const truncatedText = post.text.length > 80 ? `${post.text.substring(0, 80)}...` : post.text
        return (
          <div
            className="max-w-xs cursor-help truncate"
            title={post.text.length > 80 ? post.text : undefined}
          >
            {truncatedText}
          </div>
        )
      },
    },
    {
      accessorKey: "contact.name",
      header: "Contacto",
      cell: ({ row }) => {
        const contact = row.original.contact
        return (
          <div>
            <div className="font-medium">{contact.name}</div>
            <div className="text-sm text-gray-500 font-mono">{contact.phone}</div>
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge variant={getStatusVariant(status)}>
            {getStatusText(status)}
          </Badge>
        )
      },
    },
    {
      accessorKey: "post.schedule",
      header: "Programado",
      cell: ({ row }) => {
        const schedule = new Date(row.original.post.schedule)
        return (
          <div className="text-sm">
            {format(schedule, "dd/MM/yyyy HH:mm", { locale: es })}
          </div>
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: "Fecha de creación",
      cell: ({ row }) => {
        const createdAt = new Date(row.original.createdAt)
        return (
          <div className="text-sm">
            {format(createdAt, "dd/MM/yyyy HH:mm", { locale: es })}
          </div>
        )
      },
    },
    {
      accessorKey: "sentAt",
      header: "Enviado",
      cell: ({ row }) => {
        const sentAt = row.original.sentAt
        return (
          <div className="text-sm">
            {sentAt ? format(sentAt, "dd/MM/yyyy HH:mm", { locale: es }) : '-'}
          </div>
        )
      },
    },
    {
      id: "actions",
      header: "Acciones",
      enableHiding: false,
      cell: ({ row }) => {
        const message = row.original
        return (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Abrir menú</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="ml-5">Acciones</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push(`/messages/${message.id}`)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Detalles
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  onClick={() => handleDeleteClick(message.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Eliminar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DeleteConfirmationModal
              open={isDeleteModalOpen && currentMessageId === message.id}
              onOpenChange={setIsDeleteModalOpen}
              onConfirm={handleConfirmDelete}
              entityName="Mensaje"
              description="Esta acción no se puede deshacer. El mensaje será eliminado permanentemente."
            >
              <span className="hidden" />
            </DeleteConfirmationModal>
          </>
        )
      },
    },
  ]

  const TableSkeleton = ({ cols, rows = 8 }: { cols: number; rows?: number }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-4 lg:px-6 mb-1">
        <div className="flex items-center gap-2">
          {/* <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" /> */}
        </div>
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

  return (
    <div className="container mx-auto py-5 px-5">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Gestión de Mensajes</h1>
        <p className="text-muted-foreground">Administra los mensajes asignados a contactos</p>
      </div>

      {isLoading ? (
        <TableSkeleton cols={columns.length} />
      ) : (
        <DataTable
          columns={columns}
          data={messages}
          createButtonText="Asignar Mensaje"
          showCreateButton={true}
          onCreateClick={handleAssignMessage}
          searchPlaceholder="Buscar en mensajes..."
          dateColumnId="createdAt"
          showDateRangeFilter={true}
        />
      )}
    </div>
  )
}