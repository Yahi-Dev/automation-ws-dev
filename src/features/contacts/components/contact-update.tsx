"use client"

import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Alert, AlertDescription } from "@/src/components/ui/alert"
import { Button } from "@/src/components/ui/button"
import { Loader2 } from "lucide-react"
import { useUpdateContact, useContactById } from "../hooks/use-contact"
import Link from "next/link"
import { useState, useEffect } from "react"
import { PhoneInput } from "@/src/components/shared/phone-input"
import { useRouter } from "next/navigation"

interface EditContactFormProps {
  readonly id: number
}

// Solo letras (incluye acentos) y espacios
const LETTERS_SPACES = /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/
const LETTERS_SPACES_ANY = /[^A-Za-zÁÉÍÓÚáéíóúÑñ ]+/g

export function EditContactForm({ id }: EditContactFormProps) {
  const router = useRouter()
  const [primaryLoading, setPrimaryLoading] = useState(true)
  const { contact } = useContactById(id)
  const { update, isLoading, error, clearError } = useUpdateContact(id)

  const [formData, setFormData] = useState<{ name: string; phone: string; country: string; _count: number }>({
    name: "",
    phone: "",
    country: "",
    _count: 0
  })

  const [errors, setErrors] = useState<Partial<{ name: string; phone: string }>>({})

  // helpers
  const setField = (key: "name" | "phone" | "country", value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    if (key !== "country" && errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  // Cargar datos del contacto cuando esté disponible
  useEffect(() => {
    if (contact) {
      const cleanedName = (contact.name || "").replaceAll(LETTERS_SPACES_ANY, "");
      const cleanedPhone = contact.phone || "";
      // Ensure _count is always a number
      let cleanCount = 0;
      if (typeof contact._count === "number") {
        cleanCount = contact._count;
      } else if (
        typeof contact._count === "object" &&
        contact._count !== null &&
        "messages" in contact._count
      ) {
        cleanCount = (contact._count as { messages: number }).messages;
      }
      if (formData.name !== cleanedName || formData.phone !== cleanedPhone) {
        setFormData({
          name: cleanedName,
          phone: cleanedPhone,
          country: contact.country ?? "",
          _count: cleanCount
        });
        setPrimaryLoading(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact]);

  // === Restringir a solo letras y espacios para nombre ===
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replaceAll(LETTERS_SPACES_ANY, "")
    setField("name", cleaned)
  }

  const blockNonLettersKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedNav = [
      "Backspace",
      "Tab",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
      "Delete",
    ]
    if (allowedNav.includes(e.key) || e.ctrlKey || e.metaKey) return
    if (!LETTERS_SPACES.test(e.key)) e.preventDefault()
  }

  const blockNonLettersBeforeInput: React.FormEventHandler<HTMLInputElement> = (e) => {
    const inputEvent = e.nativeEvent as InputEvent
    const data = inputEvent?.data || ""
    if (data && !LETTERS_SPACES.test(data)) e.preventDefault()
  }

  const handlePhoneChange = (value: string) => {
    setField("phone", value)
  }

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {}

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido"
    } else if (formData.name.length > 150) {
      newErrors.name = "El nombre no puede exceder 150 caracteres"
    } else if (!LETTERS_SPACES.test(formData.name)) {
      newErrors.name = "El nombre solo puede contener letras (incluye acentos) y espacios"
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "El teléfono es requerido"
    } else if (formData.phone.length > 20) {
      newErrors.phone = "El teléfono no puede exceder 20 caracteres"
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
      name: formData.name.replaceAll(/\s+/g, " ").trim(),
      country: formData.country || undefined,
    }

    const result = await update(payload)
    if (result?.success) router.push("/contacts")
  }

  if (primaryLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6 flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando contacto...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="bg-white border-b">
        <CardTitle className="text-3xl font-bold text-gray-900">Editar Contacto</CardTitle>
        <CardDescription className="text-lg text-gray-600">
          Modifica los campos para actualizar el contacto
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                  Nombre <span className="text-red-700">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Ej: Juan Pérez, María García..."
                  className="bg-white"
                  value={formData.name}
                  onChange={handleNameChange}
                  onKeyDown={blockNonLettersKey}
                  onBeforeInput={blockNonLettersBeforeInput}
                  disabled={isLoading}
                  maxLength={150}
                  required
                  inputMode="text"
                  autoComplete="off"
                  pattern="[A-Za-zÁÉÍÓÚáéíóúÑñ ]+"
                  title="Solo letras (incluye acentos) y espacios"
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                <p className="text-sm text-gray-500">
                  máximo 150 caracteres, <b>solo letras y espacios</b>
                  {" "}
                  <small className={`ml-1 text-muted-foreground
                  ${formData.name.length >= 150 ? "text-red-600" : ""}`}>{formData.name.length}/150</small>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">
                  Teléfono <span className="text-red-700">*</span>
                </Label>
                  <PhoneInput
                    disabled={formData._count > 0}
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    onCountryChange={(c) => setField("country", c ?? "")}
                    placeholder="Ingresa un número de teléfono"
                  />

                {errors.phone && <p className="text-sm text-red-600">{errors.phone}</p>}
                <p className={formData._count > 0 ? "text-sm text-red-300" : "text-sm text-gray-500"}>
                  {formData._count > 0 ? "No se puede modificar el teléfono de un contacto con mensajes asignados" : "máximo 20 caracteres"}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-8">
              <Link href="/contacts">
                <Button variant="outline" type="button" disabled={isLoading}>
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  "Actualizar Contacto"
                )}
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}