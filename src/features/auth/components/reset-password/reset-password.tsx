"use client"

import type React from "react"

import { useSearchParams, useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { Shield, Lock, CheckCircle, Eye, EyeOff } from "lucide-react"
import AuthLayout from "@/src/components/auth/AuthLayout"
import InputError from "@/src/components/shared/InputError"
import { authClient } from "@/src/lib/auth-client"
import { Input } from "@/src/components/ui/input"
import { Button } from "@/src/components/ui/button"

// Tipos para la respuesta del reset de contraseña (ajústalos si tu SDK difiere)
type ResetPasswordData = { status: boolean }
type ResetPasswordError = { status?: number; message?: string }
type ResetPasswordResponse = { data?: ResetPasswordData | null; error?: ResetPasswordError | null }

export default function ResetPasswordForm() {
  const params = useParams<{ token?: string }>()
  const search = useSearchParams()
  const router = useRouter()

  // token: ruta o query (fallback)
  const tokenFromQuery = search.get("token") ?? ""
  const token = useMemo(
    () => (params?.token && typeof params.token === "string" ? params.token : tokenFromQuery),
    [params?.token, tokenFromQuery],
  )

  const emailFromQuery = search.get("email") ?? ""

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [email] = useState(emailFromQuery)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Si no hay token, mostramos error una sola vez
  useEffect(() => {
    if (!token) setError("Invalid token")
  }, [token])

  // Función para calcular la fortaleza de la contraseña
  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) return { score: 0, label: "Empty", color: "bg-gray-200" }
    
    let score = 0
    
    // Longitud
    if (pwd.length >= 8) score += 1
    if (pwd.length >= 12) score += 1
    
    // Diversidad de caracteres
    if (/[a-z]/.test(pwd)) score += 1
    if (/[A-Z]/.test(pwd)) score += 1
    if (/[0-9]/.test(pwd)) score += 1
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1
    
    // Mapear score a niveles
    if (score <= 2) return { score, label: "Weak", color: "bg-red-500" }
    if (score <= 4) return { score, label: "Fair", color: "bg-yellow-500" }
    if (score <= 5) return { score, label: "Good", color: "bg-green-500" }
    return { score, label: "Strong", color: "bg-emerald-600" }
  }

  const passwordStrength = getPasswordStrength(password)
  const passwordProgress = Math.min((passwordStrength.score / 6) * 100, 100)

  const passwordsMismatch = password !== confirmPassword
  const passwordTooShort = password.length < 4
  const isDisabled = processing || !token || passwordsMismatch || passwordTooShort

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!token) {
      setError("Invalid token")
      return
    }
    if (passwordsMismatch) {
      setError("Passwords do not match.")
      return
    }
    if (passwordTooShort) {
      setError("Password must be at least 4 characters.")
      return
    }

    setProcessing(true)
    try {
      const { data, error: respError } = (await authClient.resetPassword({
        newPassword: password,
        token,
      })) as ResetPasswordResponse

      if (data?.status === true) {
        setSuccessMessage("Password reset successfully")
        setPassword("")
        setConfirmPassword("")
        router.push("/login")
        return
      }

      if (respError) {
        if (respError.status === 400) {
          let message = respError.message ?? "An error occurred"
          if (typeof message === "string" && message.toLowerCase().includes("invalid token")) {
            message = "The token is invalid or has expired. Please request a new one."
          }
          setError(message)
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
    <AuthLayout title="Reset password" description="Please enter your new password below">
      <div className="flex justify-center p-4">
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Encabezado con gradiente verde */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-8 py-6">
              <div className="flex items-center justify-center space-x-3">
                <div className="p-3 bg-white/20 rounded-full shadow-lg backdrop-blur-sm">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-white">Secure Reset</h2>
                  <p className="text-sm text-white/90">Create your new password</p>
                </div>
              </div>
            </div>

            {/* Formulario con fondo blanco */}
            <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white">
              {/* Email solo informativo si viene en query */}
              {email && (
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      readOnly
                      className="bg-gray-50 text-gray-600 border-gray-200 rounded-xl pl-4 pr-4 py-3 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    className="pl-10 pr-12 py-3 rounded-xl border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200"
                    aria-invalid={!!(error && !successMessage)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                
                {/* Barra de progreso de fortaleza de contraseña */}
                {password && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">Password strength:</span>
                      <span className={`font-medium ${
                        passwordStrength.label === "Weak" ? "text-red-500" :
                        passwordStrength.label === "Fair" ? "text-yellow-500" :
                        passwordStrength.label === "Good" ? "text-green-500" :
                        "text-emerald-600"
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${passwordProgress}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500">
                      {password.length < 8 && "Use at least 8 characters"}
                      {password.length >= 8 && !/[A-Z]/.test(password) && "Add uppercase letters"}
                      {password.length >= 8 && /[A-Z]/.test(password) && !/[0-9]/.test(password) && "Add numbers"}
                      {password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password) && !/[^a-zA-Z0-9]/.test(password) && "Add special characters"}
                      {passwordStrength.label === "Strong" && "Strong password!"}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="password_confirmation" className="block text-sm font-semibold text-gray-700">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password_confirmation"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-12 py-3 rounded-xl border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200"
                    aria-invalid={passwordsMismatch}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  {confirmPassword && !passwordsMismatch && (
                    <CheckCircle className="absolute right-10 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500" />
                  )}
                </div>
                {passwordsMismatch && confirmPassword && <InputError message="Passwords do not match." />}
                {passwordTooShort && password && <InputError message="Password must be at least 4 characters." />}
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <InputError message={error} className="text-red-600 font-medium" />
                </div>
              )}
              {successMessage && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-green-700 text-sm font-medium">{successMessage}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={isDisabled}
              >
                {processing && (
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                {processing ? "Resetting Password..." : "Reset Password"}
              </Button>

              <div className="text-center pt-4">
                <p className="text-xs text-gray-500">Your password will be encrypted and stored securely</p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}