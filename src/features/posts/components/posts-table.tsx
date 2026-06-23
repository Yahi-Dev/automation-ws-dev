// src/features/posts/components/posts-table.tsx - Actualizado
"use client"

import { useEffect, useState, useCallback } from "react"
import { DataTable } from "@/src/components/data-table"
import { Button } from "@/src/components/ui/button"
import { MoreHorizontal, Edit, Trash2, Image as ImageIcon, Eye, Send, Loader2 } from "lucide-react"
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
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { PostsType } from "../types"
import { DeleteConfirmationModal } from "@/src/components/ui/delete"
import { Skeleton } from "@/src/components/ui/skeleton"
import { useDeletePost, useGetAllPosts } from "../hooks/use-posts"
import { useSendCampaign } from "@/src/features/messages/hooks/use-message"
import { Badge } from "@/src/components/ui/badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { PostDialog } from "./post-dialog"

const TableSkeleton = ({ cols, rows = 8 }: { cols: number; rows?: number }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between px-4 lg:px-6 mb-1">
      <div className="flex items-center gap-2">
      </div>
      <Skeleton className="h-9 w-40" />
    </div>

    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={`col-header-skeleton-${cols}-${i}`} className="p-3 text-left">
                <Skeleton className="h-4 w-24" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={`col-body-skeleton-${rows}-${r}`} className="border-t">
              {Array.from({ length: cols }).map((__, c) => (
                <td key={`col-body-skeleton-${rows}-${r}-${c}`} className="p-3">
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

export default function PostsTable() {
  const router = useRouter()
  const [primaryLoading, setPrimaryLoading] = useState(true)
  const { fetchAll, posts } = useGetAllPosts()
  const { remove: handleDelete } = useDeletePost()
  const { send: handleSend, isLoading: isSending } = useSendCampaign()

  const [currentPostId, setCurrentPostId] = useState<number | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [inspectPostId, setInspectPostId] = useState<number | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [sendPostId, setSendPostId] = useState<number | null>(null)
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)

  useEffect(() => {
    fetchAll()
    setPrimaryLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDeleteClick = (id: number) => {
    setCurrentPostId(id)
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!currentPostId) return
    try {
      await handleDelete(currentPostId)
      await fetchAll()
    } finally {
      setIsDeleteModalOpen(false)
    }
  }

  const handleCreatePost = () => {
    router.push("/posts/create")
  }

  const handleInspectClick = useCallback((id: number) => {
    setInspectPostId(id)
    setIsDialogOpen(true)
  }, [])

  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false)
    setInspectPostId(null)
  }, [])

  const handleEditClick = useCallback((id: number) => {
    router.push(`/posts/${id}/edit`)
  }, [router])

  const handleSendClick = (id: number) => {
    setSendPostId(id)
    setIsSendModalOpen(true)
  }

  const handleConfirmSend = async () => {
    if (!sendPostId) return
    await handleSend(sendPostId)
    setIsSendModalOpen(false)
    setSendPostId(null)
    await fetchAll()
  }

  const columns: ColumnDef<PostsType>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => (
        <div className="font-mono text-sm">{row.getValue("id")}</div>
      )
    },
    {
      accessorKey: "schedule",
      header: "Programado",
      cell: ({ row }) => {
        const schedule = row.getValue("schedule") as Date
        const now = new Date()
        const isPast = schedule < now
        return (
          <div className="space-y-1">
            <div className={`font-medium ${isPast ? 'text-gray-500' : 'text-green-600'}`}>
              {format(schedule, "PPP", { locale: es })}
            </div>
            <div className="text-sm text-gray-500">
              {format(schedule, "HH:mm", { locale: es })}
            </div>
            {isPast && (
              <Badge variant="outline" className="text-xs">
                Expirado
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "text",
      header: "Contenido",
      cell: ({ row }) => {
        const text = row.getValue("text") as string
        const truncatedText = text.length > 100 ? `${text.substring(0, 100)}...` : text
        return (
          <div
            className="max-w-xs cursor-help truncate"
            title={text.length > 100 ? text : undefined}
          >
            {truncatedText}
          </div>
        )
      },
    },
    {
      accessorKey: "images",
      header: "Imágenes",
      cell: ({ row }) => {
        const images = row.getValue("images") as unknown[]
        return (
          <div className="flex items-center space-x-1">
            <ImageIcon className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">{images?.length || 0}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "createdBy",
      header: "Creado por",
      cell: ({ row }) => {
        const createdBy = row.getValue("createdBy") as string
        return <div className="text-sm">{createdBy}</div>
      }
    },
    {
      accessorKey: "createdAt",
      header: "Fecha de creación",
      cell: ({ row }) => {
        const raw = row.getValue("createdAt") as Date
        return (
          <div className="text-sm">
            {format(raw, "dd/MM/yyyy HH:mm", { locale: es })}
          </div>
        )
      },
    },
    {
      id: "actions",
      header: "Acciones",
      enableHiding: false,
      cell: ({ row }) => {
        const post = row.original
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
                <DropdownMenuItem onClick={() => handleInspectClick(post.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Inspeccionar
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!post?._count?.messages || post._count.messages === 0}
                  onClick={() => handleSendClick(post.id)}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Enviar campaña
                </DropdownMenuItem>
                {/*<DropdownMenuItem onClick={() => router.push(`/posts/${post.id}/edit`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem> */}
                <DropdownMenuItem
                  disabled={typeof post?._count?.messages === "number" && post._count.messages > 0}
                  onSelect={(e) => e.preventDefault()}
                  onClick={() => handleDeleteClick(post.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Eliminar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DeleteConfirmationModal
              open={isDeleteModalOpen && currentPostId === post.id}
              onOpenChange={setIsDeleteModalOpen}
              onConfirm={handleConfirmDelete}
              entityName="Post"
              description="Esta acción no se puede deshacer. El post y todas sus imágenes serán eliminados permanentemente."
            >
              <span className="hidden" />
            </DeleteConfirmationModal>
          </>
        )
      },
    },
  ]

  return (
    <div className="container mx-auto py-5 px-5">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Gestión de Posts</h1>
        <p className="text-muted-foreground">Administra los posts programados para publicación</p>
      </div>

      {primaryLoading ? (
        <TableSkeleton cols={columns.length} />
      ) : (
        <DataTable
          columns={columns}
          data={posts}
          createButtonText="Nuevo Post"
          showCreateButton={true}
          onCreateClick={handleCreatePost}
          searchPlaceholder="Buscar en contenido..."
          dateColumnId="schedule"
          showDateRangeFilter={true}
        />
      )}

      {/* Diálogo de Inspección */}
      {inspectPostId && (
        <PostDialog
          id={inspectPostId}
          isOpen={isDialogOpen}
          onOpenChange={handleDialogClose}
          onEditClick={handleEditClick}
        />
      )}

      {/* Confirmación de envío de campaña */}
      <Dialog open={isSendModalOpen} onOpenChange={setIsSendModalOpen}>
        <DialogContent className="sm:max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Enviar campaña por WhatsApp
            </DialogTitle>
            <DialogDescription>
              Se enviará el mensaje a{" "}
              <strong>
                {posts.find((p) => p.id === sendPostId)?._count?.messages ?? 0} contacto(s)
              </strong>{" "}
              asignados que estén pendientes. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSendModalOpen(false)}
              disabled={isSending}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirmSend} disabled={isSending}>
              {isSending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {isSending ? "Enviando..." : "Enviar ahora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}