// src/features/consent/components/consent-table.tsx
"use client"

import { useEffect, useState } from "react"
import { DataTable } from "@/src/components/data-table"
import { Button } from "@/src/components/ui/button"
import { Badge } from "@/src/components/ui/badge"
import { Skeleton } from "@/src/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select"
import { Download } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  CONSENT_EVENT_OPTIONS,
  CONSENT_FILTRO_TODOS,
  CONSENT_SOURCE_OPTIONS,
  ConsentEventRow,
} from "../types"
import { useExportConsentCsv, useGetAllConsentEvents } from "../hooks/use-consent"

export default function ConsentTable() {
  const { fetchAll, events, isLoading } = useGetAllConsentEvents()
  const { exportCsv } = useExportConsentCsv()

  const [event, setEvent] = useState<string>(CONSENT_FILTRO_TODOS)
  const [source, setSource] = useState<string>(CONSENT_FILTRO_TODOS)

  // El centinela "todos" no viaja al backend: se traduce a "sin filtro".
  const filtrosActivos = {
    event: event === CONSENT_FILTRO_TODOS ? undefined : event,
    source: source === CONSENT_FILTRO_TODOS ? undefined : source,
  }

  useEffect(() => {
    fetchAll(filtrosActivos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, source])

  const getEventVariant = (event: string) =>
    event === "opt_out" ? "destructive" : "default"

  const getEventText = (event: string) => {
    switch (event) {
      case "opt_in": return "Alta"
      case "opt_out": return "Baja"
      default: return event
    }
  }

  const getSourceText = (source: string | null) => {
    switch (source) {
      case "inbound": return "Respuesta del contacto"
      case "manual": return "Registro manual"
      case "import": return "Importación"
      case "api": return "API"
      default: return source || "-"
    }
  }

  const columns: ColumnDef<ConsentEventRow>[] = [
    {
      accessorKey: "createdAt",
      header: "Fecha",
      cell: ({ row }) => {
        const createdAt = row.original.createdAt
        return (
          <div className="text-sm whitespace-nowrap">
            {format(createdAt, "dd/MM/yyyy HH:mm", { locale: es })}
          </div>
        )
      },
    },
    {
      accessorKey: "contactName",
      header: "Contacto",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.contactName}</div>
          <div className="text-sm text-gray-500 font-mono">{row.original.contactPhone}</div>
        </div>
      ),
    },
    {
      accessorKey: "event",
      header: "Evento",
      cell: ({ row }) => {
        const event = row.getValue("event") as string
        return (
          <Badge variant={getEventVariant(event)}>
            {getEventText(event)}
          </Badge>
        )
      },
    },
    {
      accessorKey: "source",
      header: "Origen",
      cell: ({ row }) => {
        const { source, keyword } = row.original
        return (
          <div>
            <div className="text-sm">{getSourceText(source)}</div>
            {keyword && (
              <div className="text-xs text-gray-500 uppercase">
                Palabra clave: {keyword}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "raw",
      header: "Evidencia",
      cell: ({ row }) => {
        const raw = row.original.raw
        if (!raw) {
          return <div className="text-sm text-gray-500" data-tour="consentimiento-evidencia">Sin evidencia registrada</div>
        }
        const truncatedText = raw.length > 80 ? `${raw.substring(0, 80)}...` : raw
        return (
          <div
            className="max-w-xs cursor-help truncate" data-tour="consentimiento-evidencia"
            title={raw.length > 80 ? raw : undefined}
          >
            {truncatedText}
          </div>
        )
      },
    },
    {
      accessorKey: "createdBy",
      header: "Registrado por",
      cell: ({ row }) => {
        const { createdBy, source } = row.original
        // En las respuestas entrantes no hay usuario: lo registró el propio
        // contacto al responder por WhatsApp.
        const texto = createdBy || (source === "inbound" ? "El propio contacto" : "-")
        return <div className="text-sm">{texto}</div>
      },
    },
  ]

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

  return (
    <div className="container mx-auto py-5 px-5">
      <div className="mb-6" data-tour="consentimiento-encabezado">
        <h1 className="text-3xl font-bold">Seguimiento de Consentimiento</h1>
        <p className="text-muted-foreground">
          Historial de altas y bajas de cada contacto. Es la prueba de que aceptaron recibir mensajes.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2" data-tour="consentimiento-filtros">
        {CONSENT_EVENT_OPTIONS.map((f) => (
          <Button
            key={f.value}
            variant={event === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setEvent(f.value)}
          >
            {f.label}
          </Button>
        ))}

        <Select value={source} onValueChange={setSource}>
          <SelectTrigger data-tour="consentimiento-origen" className="h-8 w-[220px]">
            <SelectValue placeholder="Todos los orígenes" />
          </SelectTrigger>
          <SelectContent>
            {CONSENT_SOURCE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          className="ml-auto" data-tour="consentimiento-exportar"
          onClick={() => exportCsv(filtrosActivos)}
        >
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton cols={columns.length} />
      ) : (
        <DataTable
          columns={columns}
          data={events}
          showCreateButton={false}
          searchPlaceholder="Buscar por contacto, evidencia..."
          dateColumnId="createdAt"
          showDateRangeFilter={true}
        />
      )}
    </div>
  )
}
