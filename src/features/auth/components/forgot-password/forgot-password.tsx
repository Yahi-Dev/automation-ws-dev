"use client"
import { useState } from "react"
import type React from "react"

import { Mail, ArrowLeft, Loader2, Shield } from "lucide-react"
import { authClient } from "@/src/lib/auth-client"
import AuthLayout from "@/src/components/auth/AuthLayout"
import { Input } from "@/src/components/ui/input"
import InputError from "@/src/components/shared/InputError"
import { Button } from "@/src/components/ui/button"
import TextLink from "@/src/components/shared/TextLink"


// Tipos del response esperado del authClient (ajústalos si tu SDK difiere)
type PasswordResetData = { status: boolean }
type PasswordResetError = { status?: number; message?: string }
type PasswordResetResponse = {
  data?: PasswordResetData | null
  error?: PasswordResetError | null
}

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setProcessing(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const { data, error: respError } =
        (await authClient.requestPasswordReset({
          email,
          redirectTo: "/reset-password",
        })) as PasswordResetResponse

      if (data?.status === true) {
        setSuccessMessage("A reset link will be sent if the account exists.")
        setEmail("")
      }

      if (respError) {
        if (respError.status === 401) {
          setError(respError.message ?? "Invalid credentials")
        } else {
          setError(respError.message ?? "An error occurred")
        }
      }
    } catch {
      setError("An error occurred")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <AuthLayout>
      <div className="relative min-h-screen overflow-hidden">
        <div className="relative flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-md">
            {successMessage && (
              <div className="mb-6 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-4 shadow-lg animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                    <Shield className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
                </div>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-3xl blur-xl" />
              <div className="relative rounded-3xl bg-white/95 backdrop-blur-sm p-8 shadow-2xl border border-white/20">
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-xl">
                    <Mail className="h-9 w-9" />
                  </div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-3">
                    ¿Olvidaste tu contraseña?
                  </h1>
                  <p className="text-gray-600 leading-relaxed">
                    No te preocupes, te enviaremos instrucciones para restablecerla de forma segura
                  </p>
                </div>

                <form onSubmit={submit} className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                      Correo electrónico
                    </label>
                    <div className="relative group">
                      <Mail
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-500 transition-colors duration-200"
                        size={18}
                      />
                      <Input
                        id="email"
                        type="email"
                        autoComplete="off"
                        value={email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                        placeholder="correo@ejemplo.com"
                        className="pl-12 h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 transition-all duration-200"
                        aria-invalid={!!error}
                      />
                    </div>
                    <InputError message={error ?? undefined} />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                    disabled={processing}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      "Enviar enlace de restablecimiento"
                    )}
                  </Button>
                </form>

                <div className="mt-8 text-center">
                  <TextLink
                    href="/login"
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-green-600 font-medium transition-colors duration-200 group"
                  >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
                    Volver al inicio de sesión
                  </TextLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}
