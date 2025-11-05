"use client"

import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Alert, AlertDescription } from "@/src/components/ui/alert"
import { Button } from "@/src/components/ui/button"
import { Loader2 } from "lucide-react"
import { useCreateContact } from "../hooks/use-contact"
import Link from "next/link"
import { useState } from "react"
import { PhoneInput } from "@/src/components/shared/phone-input"
import { CountriesType } from "../types"

// Solo letras (incluye acentos) y espacios
const LETTERS_SPACES = /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/
const LETTERS_SPACES_ANY = /[^A-Za-zÁÉÍÓÚáéíóúÑñ ]+/g
interface Props { countries: CountriesType }

export function CreateContactForm({ countries }: Readonly<Props>) {
  const { create, isLoading, error, clearError } = useCreateContact()
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  })

  const [errors, setErrors] = useState<Partial<typeof formData>>({})
  const setField = (id: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }))
    if (errors[id]) setErrors((prev) => ({ ...prev, [id]: undefined }))
  }

  // --- Restricciones para nombre: SOLO letras (con acentos) y espacios ---
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

  const blockNonLettersBeforeInput = (
    e: React.FormEvent<HTMLInputElement> & { nativeEvent: InputEvent }
  ) => {
    const data = (e.nativeEvent && (e.nativeEvent as InputEvent).data) || ""
    if (data && !LETTERS_SPACES.test(data)) e.preventDefault()
  }

  const sanitizeOnPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text")
    const cleaned = pasted.replaceAll(LETTERS_SPACES_ANY, "")
    setField("name", (formData.name + cleaned).slice(0, 150))
  }
  // -----------------------------------------------------------

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
    }
    const result = await create(payload)
    if (result?.success) {
      setFormData({ name: "", phone: "" })
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="bg-white border-b">
        <CardTitle className="text-3xl font-bold text-gray-900">Crear Nuevo Contacto</CardTitle>
        <CardDescription className="text-lg text-gray-600">
          Completa los campos para crear un nuevo contacto
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
                onPaste={sanitizeOnPaste}
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
                Nombre completo del contacto (máximo 150 caracteres, <b>solo letras y espacios</b>){' '}
                <span className="ml-2 text-muted-foreground">{formData.name.length}/150</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">
                Teléfono <span className="text-red-700">*</span>
              </Label>

              <PhoneInput
                value={formData.phone}
                countries={countries}
                onChange={handlePhoneChange}
                placeholder="Ingresa un número de teléfono"
              />

              {errors.phone && <p className="text-sm text-red-600">{errors.phone}</p>}
              <p className="text-sm text-gray-500">
                Número de teléfono del contacto (máximo 20 caracteres)
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
                  Creando...
                </>
              ) : (
                "Crear Contacto"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}