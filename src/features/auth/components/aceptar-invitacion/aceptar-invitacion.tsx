"use client"

import type React from "react"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import { CheckCircle, Eye, EyeOff, KeyRound, Lock, PartyPopper, ShieldAlert } from "lucide-react"

import AuthLayout from "@/src/components/auth/AuthLayout"
import InputError from "@/src/components/shared/InputError"
import TextLink from "@/src/components/shared/TextLink"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { authClient } from "@/src/lib/auth-client"

// Misma longitud mínima que exige better-auth en el servidor: si aquí pidiéramos
// menos, el formulario dejaría enviar y el rechazo llegaría del backend en inglés.
const LONGITUD_MINIMA = 8

// Tipos de la respuesta de resetPassword (los mismos que usa la pantalla de reset).
type ResetPasswordData = { status: boolean }
type ResetPasswordError = { status?: number; message?: string; code?: string }
type ResetPasswordResponse = { data?: ResetPasswordData | null; error?: ResetPasswordError | null }

/**
 * better-auth devuelve los errores en inglés y con códigos técnicos
 * (INVALID_TOKEN, PASSWORD_TOO_SHORT...). Aquí se convierten en algo que la
 * persona invitada pueda entender y, sobre todo, que le diga qué hacer.
 */
function traducirError(error: ResetPasswordError): string {
  const pista = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase()

  if (error.status === 429 || pista.includes("too many")) {
    return "Se han hecho demasiados intentos seguidos. Espera unos minutos y vuelve a probar."
  }
  if (pista.includes("token")) {
    return "Este enlace ya no sirve: caduca al poco tiempo y solo se puede usar una vez. Pídele al administrador que te envíe una invitación nueva."
  }
  if (pista.includes("short")) {
    return `La contraseña es demasiado corta: necesita al menos ${LONGITUD_MINIMA} caracteres.`
  }
  if (pista.includes("long")) {
    return "La contraseña es demasiado larga. Elige una más corta."
  }
  return "No se pudo crear la contraseña. Vuelve a intentarlo en unos segundos."
}

/** Marco blanco común a los tres estados de la pantalla. */
function Tarjeta({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center p-4">
      <div className="relative z-10 w-full max-w-md">
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg">{children}</div>
      </div>
    </div>
  )
}

function Encabezado({
  icono,
  titulo,
  subtitulo,
}: {
  icono: React.ReactNode
  titulo: string
  subtitulo: string
}) {
  return (
    <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-8 py-6">
      <div className="flex items-center justify-center space-x-3">
        <div className="rounded-full bg-white/20 p-3 shadow-lg backdrop-blur-sm">{icono}</div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-white">{titulo}</h2>
          <p className="text-sm text-white/90">{subtitulo}</p>
        </div>
      </div>
    </div>
  )
}

export default function AceptarInvitacionForm() {
  const search = useSearchParams()
  const router = useRouter()

  // La invitación siempre llega como /aceptar-invitacion?token=...
  const token = search.get("token") ?? ""

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [verPassword, setVerPassword] = useState(false)
  const [verConfirmPassword, setVerConfirmPassword] = useState(false)

  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)

  // Tras crear la contraseña dejamos leer el mensaje de éxito un momento y
  // luego llevamos a /login (hay además un enlace por si no quiere esperar).
  useEffect(() => {
    if (!listo) return
    const temporizador = setTimeout(() => router.push("/login"), 2500)
    return () => clearTimeout(temporizador)
  }, [listo, router])

  const passwordCorta = password.length > 0 && password.length < LONGITUD_MINIMA
  const noCoinciden = confirmPassword.length > 0 && password !== confirmPassword
  const enviarDeshabilitado =
    procesando || password.length < LONGITUD_MINIMA || password !== confirmPassword

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError("El enlace de invitación no es válido.")
      return
    }
    if (password.length < LONGITUD_MINIMA) {
      setError(`La contraseña debe tener al menos ${LONGITUD_MINIMA} caracteres.`)
      return
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setProcesando(true)
    try {
      // Se reutiliza el flujo de restablecimiento de better-auth: el token de la
      // invitación es el mismo que emite requestPasswordReset.
      const { data, error: respError } = (await authClient.resetPassword({
        newPassword: password,
        token,
      })) as ResetPasswordResponse

      if (data?.status === true) {
        setPassword("")
        setConfirmPassword("")
        setListo(true)
        return
      }

      setError(respError ? traducirError(respError) : "No se pudo crear la contraseña. Vuelve a intentarlo.")
    } catch {
      setError("No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.")
    } finally {
      setProcesando(false)
    }
  }

  // 1) Enlace sin token: no tiene sentido enseñar el formulario.
  if (!token) {
    return (
      <AuthLayout title="Enlace no válido" description="No podemos identificar tu invitación">
        <Tarjeta>
          <Encabezado
            icono={<ShieldAlert className="h-6 w-6 text-white" />}
            titulo="Enlace no válido"
            subtitulo="Falta la información de la invitación"
          />
          <div className="space-y-4 bg-white p-8 text-center">
            <p className="text-sm text-gray-600">
              El enlace que abriste está incompleto o se cortó al copiarlo desde el correo. Ábrelo
              pulsando directamente el botón del mensaje que recibiste.
            </p>
            <p className="text-sm text-gray-600">
              Si aun así no funciona, pídele al administrador que te envíe una invitación nueva.
            </p>
            <p className="pt-2 text-sm">
              <TextLink href="/login" className="font-medium text-emerald-600 hover:underline">
                Ir a iniciar sesión
              </TextLink>
            </p>
          </div>
        </Tarjeta>
      </AuthLayout>
    )
  }

  // 2) Contraseña creada: mensaje de bienvenida y salida hacia el login.
  if (listo) {
    return (
      <AuthLayout title="¡Todo listo!" description="Tu cuenta ya está activa">
        <Tarjeta>
          <Encabezado
            icono={<PartyPopper className="h-6 w-6 text-white" />}
            titulo="¡Todo listo!"
            subtitulo="Tu contraseña quedó guardada"
          />
          <div className="space-y-4 bg-white p-8 text-center">
            <p className="text-sm text-gray-600">
              Ya puedes iniciar sesión con tu correo y la contraseña que acabas de crear. Te
              llevamos a la pantalla de inicio de sesión en un momento.
            </p>
            <p className="pt-2 text-sm">
              <TextLink href="/login" className="font-medium text-emerald-600 hover:underline">
                Iniciar sesión ahora
              </TextLink>
            </p>
          </div>
        </Tarjeta>
      </AuthLayout>
    )
  }

  // 3) Formulario de primer acceso.
  return (
    <AuthLayout title="Te damos la bienvenida" description="Crea tu contraseña para entrar en Automation WS">
      <Tarjeta>
        <Encabezado
          icono={<KeyRound className="h-6 w-6 text-white" />}
          titulo="Crea tu contraseña"
          subtitulo="Es tu primer acceso a la plataforma"
        />

        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8">
          <p className="text-sm text-gray-600">
            Elige la contraseña con la que entrarás a partir de ahora. Debe tener al menos{" "}
            {LONGITUD_MINIMA} caracteres.
          </p>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
              <Input
                id="password"
                type={verPassword ? "text" : "password"}
                placeholder="Escribe tu contraseña"
                value={password}
                autoComplete="new-password"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                className="rounded-xl border-gray-200 py-3 pl-10 pr-12 transition-all duration-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                aria-invalid={passwordCorta}
              />
              <button
                type="button"
                onClick={() => setVerPassword(!verPassword)}
                aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-400 transition-colors hover:text-gray-600"
              >
                {verPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {passwordCorta && (
              <InputError message={`La contraseña debe tener al menos ${LONGITUD_MINIMA} caracteres.`} />
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="password_confirmation" className="block text-sm font-semibold text-gray-700">
              Repite la contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
              <Input
                id="password_confirmation"
                type={verConfirmPassword ? "text" : "password"}
                placeholder="Escríbela otra vez"
                value={confirmPassword}
                autoComplete="new-password"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                className="rounded-xl border-gray-200 py-3 pl-10 pr-12 transition-all duration-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                aria-invalid={noCoinciden}
              />
              <button
                type="button"
                onClick={() => setVerConfirmPassword(!verConfirmPassword)}
                aria-label={verConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-400 transition-colors hover:text-gray-600"
              >
                {verConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
              {confirmPassword.length > 0 && !noCoinciden && !passwordCorta && (
                <CheckCircle className="absolute right-10 top-1/2 h-5 w-5 -translate-y-1/2 transform text-green-500" />
              )}
            </div>
            {noCoinciden && <InputError message="Las contraseñas no coinciden." />}
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <InputError message={error} className="font-medium text-red-600" />
            </div>
          )}

          <Button
            type="submit"
            disabled={enviarDeshabilitado}
            className="w-full transform rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:from-green-600 hover:to-emerald-600 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            {procesando && (
              <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {procesando ? "Guardando tu contraseña..." : "Entrar a la plataforma"}
          </Button>

          <p className="pt-2 text-center text-xs text-gray-500">
            Tu contraseña se guarda cifrada. No la compartas con nadie.
          </p>
        </form>
      </Tarjeta>
    </AuthLayout>
  )
}
