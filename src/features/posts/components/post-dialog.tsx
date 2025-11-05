// src/features/posts/components/post-dialog.tsx
'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/src/components/ui/dialog"
import {
  Calendar,
  FileText,
  Image as ImageIcon,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Info,
} from "lucide-react"
import { useEffect, useState } from "react"
import { ScrollArea } from "@/src/components/ui/scroll-area"
import { PostsType } from "../types"
import { cn } from "@/src/lib/utils"
import Image from "next/image"
import { getPostById } from "../services/posts-service"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface PostDialogProps {
  id: number
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onEditClick?: (id: number) => void
}

export const PostDialog = ({ id, isOpen, onOpenChange, onEditClick }: PostDialogProps) => {
  const [post, setPost] = useState<PostsType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && id) {
      getPostById(id)
        .then((response) => {
          if (response.success && response.data) {
            const postData = Array.isArray(response.data) ? response.data[0] : response.data
            setPost(postData)
          }
        })
        .catch((error) => {
          console.error("Error loading post data:", error)
          setPost(null)
        })
        .finally(() => setLoading(false))
    }
  }, [isOpen, id])

  const handleOpenChange = (open: boolean) => {
    if (!open && loading) return
    onOpenChange(open)
  }

  if (!isOpen) return null

  if (!post && !loading) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[480px] w-[92vw] rounded-xl bg-white border-gray-200 fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">Post No Encontrado</DialogTitle>
            <DialogDescription className="text-gray-600">El post solicitado no fue encontrado.</DialogDescription>
          </DialogHeader>
          <div className="text-sm text-gray-600">Por favor intenta nuevamente desde la lista.</div>
        </DialogContent>
      </Dialog>
    )
  }

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[480px] w-[92vw] rounded-xl bg-white border-gray-200 fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">Cargando…</DialogTitle>
            <DialogDescription className="text-gray-600">Obteniendo información del post</DialogDescription>
          </DialogHeader>
          <div className="h-2 w-full rounded bg-gray-200 overflow-hidden">
            <div className="h-full w-1/2 animate-pulse bg-blue-500" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const isScheduled = post?.schedule && new Date(post.schedule) > new Date()
  const isExpired = post?.schedule && new Date(post.schedule) < new Date()

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-[700px] w-[95vw] rounded-xl bg-white border-gray-200 max-h-[90vh] p-0 overflow-hidden fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]"
        )}
        onInteractOutside={(e) => {
          if (loading) e.preventDefault()
        }}
      >
        <DialogHeader className="border-b border-gray-200 pb-4 px-6 pt-6 bg-gradient-to-r from-blue-50 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500 text-white">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  Información del Post
                </DialogTitle>
                <DialogDescription className="text-gray-600 mt-1">
                  Información completa sobre el post programado
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="w-full flex-1" style={{ maxHeight: "calc(90vh - 140px)" }}>
          <div className="grid grid-cols-1 gap-6 p-6">
            {/* Información Básica */}
            <section className="space-y-4 p-5 rounded-xl border border-gray-200 bg-gradient-to-br from-white to-blue-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Información Básica</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant={isScheduled ? "default" : isExpired ? "destructive" : "secondary"}>
                      {isScheduled ? "Programado" : isExpired ? "Expirado" : "Publicado"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoBlock
                      label="Programado para"
                      value={post?.schedule ? format(new Date(post.schedule), "PPP 'a las' HH:mm", { locale: es }) : "—"}
                      icon={<Calendar className="h-4 w-4" />}
                    />
                    <InfoBlock
                      label="Creado por"
                      value={post?.createdBy}
                      icon={<User className="h-4 w-4" />}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Contenido del Post */}
            <section className="space-y-4 p-5 rounded-xl border border-gray-200 bg-white">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-md bg-green-100 text-green-700">
                  <FileText className="h-4 w-4" />
                </div>
                Contenido del Post
              </h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Texto:</p>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                      {post?.text || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Longitud: {post?.text?.length || 0} caracteres</span>
                  <span>Máximo: 1000 caracteres</span>
                </div>
              </div>
            </section>

            {/* Imágenes */}
            {post?.images && post.images.length > 0 && (
              <section className="space-y-4 p-5 rounded-xl border border-gray-200 bg-white">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-md bg-purple-100 text-purple-700">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                  Imágenes ({post.images.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {post.images.map((image, index) => (
                    <div key={image.id} className="relative group">
                      <div className="aspect-square rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-100 hover:border-blue-500 transition-colors">
                        <Image
                          src={image.url}
                          alt={`Imagen ${index + 1} del post`}
                          width={200}
                          height={200}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        #{index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Metadatos */}
            <section className="space-y-4 p-5 rounded-xl border border-gray-200 bg-white">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-md bg-gray-100 text-gray-700">
                  <Clock className="h-4 w-4" />
                </div>
                Información de Auditoría
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoBlock
                  label="Fecha de creación"
                  value={post?.createdAt ? format(new Date(post.createdAt), "PPP 'a las' HH:mm", { locale: es }) : "—"}
                />
                <InfoBlock
                  label="Última actualización"
                  value={post?.updatedAt ? format(new Date(post.updatedAt), "PPP 'a las' HH:mm", { locale: es }) : "—"}
                />
                <InfoBlock
                  label="Creado por"
                  value={post?.createdBy || "—"}
                />
                <InfoBlock
                  label="Actualizado por"
                  value={post?.updatedBy || "—"}
                />
              </div>
            </section>

            {/* Estado */}
            <section className="space-y-4 p-5 rounded-xl border border-gray-200 bg-white">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-md bg-orange-100 text-orange-700">
                  <CheckCircle className="h-4 w-4" />
                </div>
                Estado del Post
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoBlock
                  label="Estado"
                  value={post?.isDeleted ? "Eliminado" : "Activo"}
                  icon={post?.isDeleted ?
                    <XCircle className="h-4 w-4 text-red-500" /> :
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  }
                />
                {(() => {
                  let programacionValue: string;
                  if (isScheduled) {
                    programacionValue = "Pendiente";
                  } else if (isExpired) {
                    programacionValue = "Expirado";
                  } else {
                    programacionValue = "Ejecutado";
                  }
                  let programacionIcon;
                  if (isScheduled) {
                    programacionIcon = <Clock className="h-4 w-4 text-blue-500" />;
                  } else if (isExpired) {
                    programacionIcon = <XCircle className="h-4 w-4 text-red-500" />;
                  } else {
                    programacionIcon = <CheckCircle className="h-4 w-4 text-green-500" />;
                  }
                  return (
                    <InfoBlock
                      label="Programación"
                      value={programacionValue}
                      icon={programacionIcon}
                    />
                  );
                })()}
              </div>
            </section>

            {/* Twilio Template info */}
            <section className="space-y-4 p-5 rounded-xl border border-gray-200 bg-white">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-md bg-red-100 text-red-700">
                  <Info className="h-4 w-4" />
                </div>
                Información de la Plantilla
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <InfoBlock
                  label="SID"
                  value={post?.contentTemplate?.sid || "—"}
                />
                <InfoBlock
                  label="Nombre Amigable"
                  value={post?.contentTemplate?.friendlyName || "—"}
                />
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-4 px-6 pb-6 border-t border-gray-200 bg-white">
            <div className="text-sm text-gray-600">
              Post ID: <span className="font-mono font-semibold">{post?.id}</span>
            </div>
            <div className="flex gap-3">
              {onEditClick && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onEditClick(post!.id)
                    onOpenChange(false)
                  }}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
              )}
              <Button
                onClick={() => onOpenChange(false)}
                className="px-6 py-2.5 text-sm font-semibold"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

/* ------- Helper Components ------- */

import { Button } from "@/src/components/ui/button"
import { Badge } from "@/src/components/ui/badge"

function InfoBlock({
  label,
  value,
  icon,
}: Readonly<{
  label: string
  value?: string | number
  icon?: React.ReactNode
}>) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className="text-sm font-semibold text-gray-900 bg-gray-50 rounded-md px-3 py-2 border border-gray-200">
        {value !== undefined && value !== null && value !== '' ? value : "—"}
      </p>
    </div>
  )
}