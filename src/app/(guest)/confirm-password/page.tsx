"use client"
import AuthLayout from "@/src/components/auth/AuthLayout"
import InputError from "@/src/components/shared/InputError"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { AUTH_ENDPOINTS } from "@/src/lib/auth-endpoints"
import { useState } from "react"
import type React from "react"



export default function ConfirmPasswordPage() {
  const [password, setPassword] = useState("")
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    setError(undefined)
    try {
      const res = await fetch(AUTH_ENDPOINTS.confirmPassword, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.errors?.password ?? j.message ?? "Error")
      } else {
        // continue to next protected flow
        // window.history.back();
      }
    } finally {
      setProcessing(false)
    }
  }

  return (
    <AuthLayout
      title="Confirm your password"
      description="This is a secure area of the application. Please confirm your password before continuing."
    >
      <div className="relative">

        <form
          onSubmit={submit}
          className="relative mx-auto max-w-md space-y-8 rounded-3xl bg-white/95 backdrop-blur-sm p-8 shadow-2xl border border-orange-100/50 hover:shadow-3xl transition-all duration-300"
        >
          {/* Security icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-3">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="pl-12 h-12 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-orange-500/20 transition-all duration-200 bg-white/80"
                required
              />
            </div>
            <InputError message={error} />
          </div>

          <Button
            className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            disabled={processing}
          >
            {processing && (
              <span className="mr-3 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {processing ? "Confirming..." : "Confirm Password"}
          </Button>

          {/* Additional security note */}
          <div className="text-center pt-4">
            <p className="text-xs text-gray-500">🔒 Your password is encrypted and secure</p>
          </div>
        </form>
      </div>
    </AuthLayout>
  )
}
