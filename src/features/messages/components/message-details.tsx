// src/features/messages/components/message-details.tsx (NUEVO DISEÑO)
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Badge } from "@/src/components/ui/badge"
import { Skeleton } from "@/src/components/ui/skeleton"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar, User, Phone, FileText, Clock, CheckCircle, XCircle, Image as ImageIcon, MessageCircle, Send } from "lucide-react"
import { useMessageById } from "../hooks/use-message"
import Image from "next/image"

interface MessageDetailsProps {
  readonly id: number
}

export function MessageDetails({ id }: MessageDetailsProps) {
  const { message, loading, error } = useMessageById(id)

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-6xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-8 w-32" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !message) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <Card className="border-red-200">
          <CardContent className="p-8 text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {error || "Mensaje no encontrado"}
            </h3>
            <p className="text-gray-600 mb-6">
              No se pudo cargar la información del mensaje.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Reintentar
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'sent': return 'default'
      case 'delivered': return 'secondary'
      case 'failed': return 'destructive'
      default: return 'outline'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente'
      case 'sent': return 'Enviado'
      case 'delivered': return 'Entregado'
      case 'failed': return 'Fallido'
      default: return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'text-green-600 bg-green-50 border-green-200'
      case 'delivered': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'failed': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    }
  }

  // Obtener la primera imagen del post si existe
  const postImages = message.post?.images || []
  const firstImage = postImages[0]

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <MessageCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Detalles del Mensaje</h1>
              <p className="text-gray-600 mt-1">
                Información completa sobre el mensaje y su estado de envío
              </p>
            </div>
          </div>
        </div>

        <div className={`px-4 py-3 rounded-xl border-2 ${getStatusColor(message.status)} flex items-center gap-2`}>
          {getStatusIcon(message.status)}
          <span className="font-semibold">{getStatusText(message.status)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda - Post y Contacto */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tarjeta del Post */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-xl">
              <CardTitle className="flex items-center gap-3 text-white pt-1">
                <FileText className="h-6 w-6" />
                <span>Contenido del Mensaje</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {/* Imagen del post */}
              {firstImage && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <ImageIcon className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-gray-700">Imagen adjunta</span>
                  </div>
                  <div className="rounded-xl border-2 border-gray-200 overflow-hidden">
                    <div className="relative aspect-video w-full">
                      <Image
                        src={firstImage.url}
                        alt="Imagen del post"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw"
                      />
                    </div>
                  </div>
                  {postImages.length > 1 && (
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        +{postImages.length - 1} imagen(es) más
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              {/* Contenido del mensaje */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-gray-700">Texto del mensaje</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {message.post?.text || "No hay contenido disponible"}
                  </p>
                </div>
              </div>

              {/* Información del post */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">Programado para:</span>
                  </div>
                  <p className="text-gray-900 font-semibold">
                    {message.post?.schedule ? format(new Date(message.post.schedule), "PPP 'a las' HH:mm", { locale: es }) : 'No programado'}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="h-4 w-4" />
                    <span className="font-medium">Creado por:</span>
                  </div>
                  <p className="text-gray-900 font-semibold">
                    {message.post?.createdBy || 'No disponible'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha - Información del contacto y estado */}
        <div className="space-y-6">
          {/* Tarjeta del Contacto */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-xl">
              <CardTitle className="flex items-center gap-3 text-white pt-1">
                <User className="h-6 w-6" />
                <span>Información del Contacto</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {message.contact?.name}
                </h3>
                <p className="text-gray-600">Destinatario</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Teléfono</p>
                    <p className="font-mono font-semibold text-gray-900">
                      {message.contact?.phone}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tarjeta de Estado del Mensaje */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-xl">
              <CardTitle className="flex items-center gap-3 text-white pt-1">
                <Send className="h-6 w-6" />
                <span>Estado del Envío</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Estado actual:</span>
                  <Badge variant={getStatusVariant(message.status)} className="flex items-center gap-1">
                    {getStatusIcon(message.status)}
                    {getStatusText(message.status)}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Fecha de creación:</span>
                    <span className="font-semibold text-gray-900">
                      {format(new Date(message.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Fecha de envío:</span>
                    <span className="font-semibold text-gray-900">
                      {message.sentAt
                        ? format(new Date(message.sentAt), "dd/MM/yyyy HH:mm", { locale: es })
                        : 'Pendiente'
                      }
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Creado por:</span>
                    <span className="font-semibold text-gray-900">
                      {message.createdBy}
                    </span>
                  </div>
                </div>

                {message.updatedAt && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-blue-700">Última actualización:</span>
                      <span className="font-semibold text-blue-900">
                        {format(new Date(message.updatedAt), "dd/MM/yyyy HH:mm", { locale: es })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Timeline de estados (opcional) */}
      <Card className="mt-6 border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-t-xl">
          <CardTitle className="flex items-center gap-3 text-white pt-1">
            <Clock className="h-6 w-6" />
            <span>Historial del Mensaje</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="font-semibold text-gray-900">Mensaje creado</p>
                <p className="text-sm text-gray-600">
                  {format(new Date(message.createdAt), "PPP 'a las' HH:mm", { locale: es })}
                </p>
              </div>
            </div>

            {message.sentAt && (
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">Mensaje enviado</p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(message.sentAt), "PPP 'a las' HH:mm", { locale: es })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}