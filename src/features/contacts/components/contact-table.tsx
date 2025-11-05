"use client"

import { useEffect, useState } from "react"
import { DataTable } from "@/src/components/data-table"
import { Button } from "@/src/components/ui/button"
import Image from "next/image"
import { MoreHorizontal, Edit, Trash2 } from "lucide-react"
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
import { ContactsType, NameCellProps } from '../types';
import { DeleteConfirmationModal } from "@/src/components/ui/delete"
import { Skeleton } from "@/src/components/ui/skeleton"
import { useDeleteContact, useGetAllContacts } from "../hooks/use-contact"

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

export default function ContactsTable() {
  const router = useRouter()
  const [primaryLoading, setPrimaryLoading] = useState(true)
  const { fetchAll, contacts, isLoading = false } = useGetAllContacts()
  const { remove: handleDelete } = useDeleteContact()

  const [currentContactId, setCurrentContactId] = useState<number | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  useEffect(() => {
    fetchAll()
    setPrimaryLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDeleteClick = (id: number) => {
    setCurrentContactId(id)
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!currentContactId) return
    try {
      await handleDelete(currentContactId)
      await fetchAll()
    } finally {
      setIsDeleteModalOpen(false)
    }
  }

  const columns: ColumnDef<ContactsType>[] = [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "Nombre",
      cell: ({ row }: NameCellProps) => {
        const name = row.original.name
        return <div className="max-w-xs truncate">{name}</div>
      },
    },
    { accessorKey: "phone", header: "Teléfono",
      cell: ({ row }) => {
        const phone = row.getValue("phone") as string
        return <div className="font-mono">{phone}</div>
      },
    },
    {
      accessorKey: "whatsapp",
      header: "WhatsApp",
      cell: ({ row }) => {
        const whatsapp = row.getValue("whatsapp") as boolean
        const phone = row.getValue("phone") as boolean
        const msg = `Hola 👋\nSoy Ever Burgos.\nCódigo: 123456\n¿Me confirmas?`;
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
        return (
          <Image
            onClick={() => window.open(url)}
            className="cursor-pointer"
            src={whatsapp ? "/whatsapp.png" : "/whatsapp-failed.png"}
            alt="alt"
            width={24}
            height={24}
          />
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: "Fecha de creación",
      cell: ({ row }) => {
        const raw = row.getValue("createdAt")
        const date = raw instanceof Date ? raw : new Date(raw as string | number | Date)
        return <div>{Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString()}</div>
      },
    },
    {
      accessorKey: "updatedAt",
      header: "Fecha de actualización",
      cell: ({ row }) => {
        const raw = row.getValue("updatedAt") as Date | string
        const date = raw instanceof Date ? raw : new Date(raw)
        return <div>{isNaN(date.getTime()) ? "-" : date.toLocaleDateString()}</div>
      },
    },
    {
      id: "actions",
      header: "Acciones",
      enableHiding: false,
      cell: ({ row }) => {
        const contact = row.original
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
                <DropdownMenuItem
                  onClick={() => router.push(`/contacts/${contact.id}/edit`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={typeof contact?._count?.messages === "number" && contact._count.messages > 0}
                  onSelect={(e) => e.preventDefault()}
                  onClick={() => handleDeleteClick(contact.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Eliminar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DeleteConfirmationModal
              open={isDeleteModalOpen && currentContactId === contact.id}
              onOpenChange={setIsDeleteModalOpen}
              onConfirm={handleConfirmDelete}
              entityName="Contacto"
              description="Esta acción no se puede deshacer. El contacto será eliminado permanentemente."
            >
              <span className="hidden" />
            </DeleteConfirmationModal>
          </>
        )
      },
    },
  ]

  const handleCreateContact = () => {
    router.push("/contacts/create")
  }

  return (
    <div className="container mx-auto py-5 px-5">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Gestión de Contactos</h1>
        <p className="text-muted-foreground">Administra los contactos del sistema</p>
      </div>

      {primaryLoading || isLoading ? (
        <TableSkeleton cols={columns.length} />
      ) : (
        <DataTable
          columns={columns}
          data={contacts}
          createButtonText="Agregar Contacto"
          showCreateButton={true}
          dateColumnId="createdAt"
          onCreateClick={handleCreateContact}
        />
      )}
    </div>
  )
}