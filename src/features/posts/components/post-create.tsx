// src/features/posts/components/post-create.tsx
"use client"

import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Alert, AlertDescription } from "@/src/components/ui/alert"
import { Button } from "@/src/components/ui/button"
import { Loader2, X, Upload } from "lucide-react"
import { useCreatePost, usePostImages } from "../hooks/use-posts"
import Link from "next/link"
import { useState } from "react"
import { Textarea } from "@/src/components/ui/textarea"
import { Badge } from "@/src/components/ui/badge"
import Image from "next/image"
import { toast } from "sonner"
import { makeFriendlyName } from "@/src/utils/template-name";

export function CreatePostForm() {
  const { create, isLoading, error, clearError } = useCreatePost()
  const { uploadImage, isUploading } = usePostImages()

  const [formData, setFormData] = useState({
    schedule: "",  text: "",
    friendlyName: "", templateType: ""
  })

  const [images, setImages] = useState<{ url: string; file?: File }[]>([])
  const [errors, setErrors] = useState<Partial<typeof formData & { images?: string }>>({})

  const setField = (id: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }))
    if (errors[id]) setErrors((prev) => ({ ...prev, [id]: undefined }))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar si ya existe una imagen
    if (images.length >= 1) {
      setErrors(prev => ({
        ...prev,
        images: "Solo puedes subir una imagen por post"
      }))
      // Limpiar input
      e.target.value = ""
      return
    }

    // Validaciones de imagen existentes
    if (!file.type.startsWith("image/")) {
      setErrors(prev => ({ ...prev, images: "Por favor selecciona un archivo de imagen válido" }))
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, images: "La imagen no puede ser mayor a 5MB" }))
      return
    }

    try {
      // Subir imagen al servidor
      const imageUrl = await uploadImage(file)

      // Agregar a la lista de imágenes (solo una)
      setImages(prev => [...prev, { url: imageUrl, file }])
      setErrors(prev => ({ ...prev, images: undefined }))

      // Limpiar input
      e.target.value = ""
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        images: error instanceof Error ? error.message : "Error al subir la imagen"
      }))
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {}

    if (!formData.schedule.trim()) {
      newErrors.schedule = "La fecha y hora de publicación son requeridas"
    } else {
      const selectedDate = new Date(formData.schedule)
      const now = new Date()

      // Validar si la fecha es pasada
      if (selectedDate <= now) {
        const timeDiff = now.getTime() - selectedDate.getTime()
        const minutesDiff = Math.floor(timeDiff / (1000 * 60))
        const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60))
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24))

        let timeAgo = ""
        if (daysDiff > 0) {
          timeAgo = `hace ${daysDiff} día${daysDiff > 1 ? 's' : ''}`
        } else if (hoursDiff > 0) {
          timeAgo = `hace ${hoursDiff} hora${hoursDiff > 1 ? 's' : ''}`
        } else if (minutesDiff > 0) {
          timeAgo = `hace ${minutesDiff} minuto${minutesDiff > 1 ? 's' : ''}`
        } else {
          timeAgo = "hace unos momentos"
        }

        newErrors.schedule = `La fecha y hora seleccionada ya pasó (${timeAgo}). Por favor, elige una fecha y hora futura.`

        // Mostrar toast informativo - FORMA SIMPLIFICADA
        toast.error(`La fecha seleccionada ya pasó ${timeAgo}. Elige una fecha futura para programar el post.`)
      }
    }

    if (!formData.text.trim()) {
      newErrors.text = "El texto del post es requerido"
    } else if (formData.text.length > 800) {
      newErrors.text = "El texto no puede exceder 800 caracteres"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    clearError()

    const payload = {
      ...formData,
      images: images.map(img => ({ url: img.url }))
    }

    const result = await create(payload)
    if (result?.success) {
      toast.success("Post creado exitosamente")
      setFormData({ schedule: "", text: "", friendlyName: "", templateType: "" })
      setImages([])
    }
  }

  const getLocalDateTime = () => {
    const now = new Date()
    // Añadir 1 hora por defecto
    now.setHours(now.getHours() + 1)
    return now.toISOString().slice(0, 16)
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="bg-white border-b">
        <CardTitle className="text-3xl font-bold text-gray-900">Crear Nuevo Post</CardTitle>
        <CardDescription className="text-lg text-gray-600">
          Programa un nuevo post para publicación
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-6">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Nombre Amigable */}
              <div className="space-y-2">
                <Label htmlFor="friendlyName" className="text-sm font-semibold text-gray-700">
                  Nombre Amigable <span className="text-red-700">*</span>
                </Label>
                <Input
                  id="friendlyName"
                  type="text"
                  readOnly
                  className="bg-white"
                  placeholder="mi_template_name"
                  value={makeFriendlyName({
                    text: formData.text,
                    lang: 'es', prefix: 'mi'
                  })}
                  onChange={(e) => setField("friendlyName", e.target.value)}
                  disabled={isLoading}
                  min={getLocalDateTime()}
                  required
                />
                {errors.friendlyName && (
                  <p className="text-sm text-red-600 font-medium">{errors.friendlyName}</p>
                )}
                <p className="text-sm text-gray-500">
                  el nombre amigable ayuda a identificar el post internamente
                </p>
              </div>

              {/* Tipo de plantilla */}
              <div className="space-y-2">
                <Label htmlFor="templateType" className="text-sm font-semibold text-gray-700">
                  Tipo de Plantilla <span className="text-red-700">*</span>
                </Label>
                <Select
                  value={formData.templateType}
                  onValueChange={(v) => setField("templateType", v)}
                  disabled={isLoading}
                  required
                >
                  <SelectTrigger id="templateType" className="bg-white">
                    <SelectValue placeholder="Selecciona el tipo de plantilla" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="twilio/text">twilio/text</SelectItem>
                    <SelectItem value="twilio/media">twilio/media</SelectItem>
                  </SelectContent>
                </Select>
                {errors.templateType && (
                  <p className="text-sm text-red-600 font-medium">{errors.templateType}</p>
                )}
                <p className="text-sm text-gray-500">
                  Define el tipo de contenido que se enviará (texto o media).
                </p>
              </div>

              {/* Fecha y Hora */}
              <div className="space-y-2">
                <Label htmlFor="schedule" className="text-sm font-semibold text-gray-700">
                  Fecha y Hora de Publicación <span className="text-red-700">*</span>
                </Label>
                <Input
                  id="schedule"
                  type="datetime-local"
                  className="bg-white"
                  value={formData.schedule}
                  onChange={(e) => setField("schedule", e.target.value)}
                  disabled={isLoading}
                  min={getLocalDateTime()}
                  required
                />
                {errors.schedule && (
                  <p className="text-sm text-red-600 font-medium">{errors.schedule}</p>
                )}
                <p className="text-sm text-gray-500">
                  Selecciona una fecha y hora futura para programar la publicación
                </p>
              </div>
            </div>

            {/* Contenido del Post */}
            <div className="space-y-2">
              <Label htmlFor="text" className="text-sm font-semibold text-gray-700">
                Contenido del Post <span className="text-red-700">*</span>
              </Label>
              <Textarea
                id="text"
                placeholder="Escribe el contenido del post aquí..."
                className="bg-white min-h-[120px] resize-vertical"
                value={formData.text}
                onChange={(e) => setField("text", e.target.value)}
                disabled={isLoading}
                maxLength={800}
                required
              />
              {errors.text && <p className="text-sm text-red-600">{errors.text}</p>}
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  Contenido del post (máximo 800 caracteres)
                </p>
                <Badge variant="outline" className="text-xs">
                  {formData.text.length}/800
                </Badge>
              </div>
            </div>

            {/* Subida de Imágenes */}
            <div className="space-y-2">
              <Label htmlFor="images" className="text-sm font-semibold text-gray-700">
                Imagen {formData.templateType === "twilio/media" ? <span className="text-red-700">*</span>
                : <span className="text-red-700">(No es necesario cargar imagen)</span>}
              </Label>

              <div className="space-y-4">
                {/* Input de subida - deshabilitado si ya hay imagen */}
                <div className="flex items-center gap-4">
                  <Input
                    id="images"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={formData.templateType === "twilio/text" || isLoading || isUploading || images.length >= 1}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={formData.templateType === "twilio/text" || isLoading || isUploading || images.length >= 1} // ← Deshabilitar cuando hay imagen
                    onClick={() => document.getElementById('images')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? "Subiendo..." : "Seleccionar"}
                  </Button>
                </div>

                {errors.images && <p className="text-sm text-red-600">{errors.images}</p>}

                {/* Vista previa de imagen (solo una) */}
                {images.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Imagen seleccionada:</Label>
                    <div className="grid grid-cols-1 gap-4 max-w-xs"> {/* ← Cambiado a una columna */}
                      {images.map((image, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-lg border overflow-hidden bg-gray-100">
                            <Image
                              src={image.url}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                              height={200}
                              width={200}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(index)}
                            disabled={isLoading}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actualizar el texto descriptivo */}
                <p className="text-sm text-gray-500">
                  Solo puedes subir una imagen por post. Formatos soportados: JPG, PNG, GIF. Tamaño máximo: 5MB.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-8">
            <Link href="/posts">
              <Button variant="outline" type="button" disabled={isLoading}>
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading || isUploading}>
              {(isLoading || isUploading) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUploading ? "Subiendo..." : "Creando..."}
                </>
              ) : (
                "Crear Post"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}