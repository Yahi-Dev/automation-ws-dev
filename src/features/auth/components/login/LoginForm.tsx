"use client";

import { useEffect, useState } from "react";
import type React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, ArrowRight, Eye, EyeOff, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { useRateLimit } from "@/src/hooks/use-rate-limit";
import { authClient } from "@/src/lib/auth-client";
import AuthLayout from "@/src/components/auth/AuthLayout";
import { Card, CardContent } from "@/src/components/ui/card";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { Input } from "@/src/components/ui/input";
import TextLink from "@/src/components/shared/TextLink";
import InputError from "@/src/components/shared/InputError";
import { Checkbox } from "@radix-ui/react-checkbox";
import { Button } from "@/src/components/ui/button";

// Evita el prerender de esta ruta con query params (?registered=1)
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SignInError = { status?: number; message?: string };
type SignInResponse = { error?: SignInError | null };

/** Componente interno que usa useSearchParams */
export function LoginInner() {
  const router = useRouter();
  const { rateLimit, checkRateLimit, resetRateLimit } = useRateLimit();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [showPassword, setShowPassword] = useState(false);

  const sp = useSearchParams();

  useEffect(() => {
    const initializeRateLimit = async () => {
      await checkRateLimit();
    };
    initializeRateLimit();
  }, []);

  useEffect(() => {
    if (sp.get("registered") === "1") {
      toast.success("Solicitud enviada exitosamente", {
        description:
          "Tu solicitud de registro ha sido enviada. Recibirás un correo electrónico cuando sea aprobada o rechazada por el equipo.",
      });
    }
    if (sp.get("pending") === "1") {
      toast.warning("Cuenta pendiente de aprobación", {
        description: "Un administrador debe aprobar tu cuenta antes de que puedas ingresar.",
      });
    }
  }, [sp]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Mostrar "cargando" de inmediato al hacer clic (antes de cualquier llamada)
    setProcessing(true);
    setError(null);
    setStatus(undefined);

    const currentRateLimit = await checkRateLimit();
    if (currentRateLimit?.isBlocked) {
      setError(`Demasiados intentos fallidos. Intenta nuevamente en ${currentRateLimit.retryAfter} segundos.`);
      setProcessing(false);
      return;
    }

    try {
      const { error: signInError } = (await authClient.signIn.email({
        email,
        password,
        rememberMe,
        callbackURL: "/dashboard",
      })) as SignInResponse;

      if (signInError) {
        await checkRateLimit();

        setError(
          signInError.status === 401
            ? "Credenciales inválidas. Por favor, verifica tu email y contraseña."
            : signInError.message ?? "Ocurrió un error al iniciar sesión"
        );
        setProcessing(false);
        return;
      }

      // LOGIN EXITOSO: Resetear el rate limit
      await resetRateLimit();

      setStatus("ok");
      toast.success("¡Inicio de sesión exitoso!");
      router.push("/dashboard");
    } catch {
      setError("Ocurrió un error inesperado");
      setProcessing(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Mostrar advertencia de rate limit
  const showRateLimitWarning = rateLimit && rateLimit.remaining <= 3 && !rateLimit.isBlocked;

  return (
    <AuthLayout>
      <div className="relative flex min-h-[85vh] items-center justify-center p-6">
        <Card className="w-full max-w-5xl overflow-hidden border-0 bg-white/95 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          <CardContent className="p-0">
            <div className="grid lg:grid-cols-2">
              <div className="relative bg-gradient-to-br from-white via-white to-gray-50/50 p-10 lg:p-12">
                <div className="mb-10">
                  <h1 className="text-4xl font-bold tracking-tight text-gray-900">INICIAR SESIÓN</h1>
                  <div className="mt-3 h-1.5 w-20 rounded-full bg-gradient-to-r from-green-500 to-emerald-500" />
                  <p className="mt-4 text-gray-600">¡Bienvenido de nuevo! Por favor inicia sesión en tu cuenta.</p>
                </div>

                {/* Alerta de Rate Limit */}
                {rateLimit?.isBlocked && (
                  <Alert className="mb-6 border-red-200 bg-red-50">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-red-700">
                      IP temporalmente bloqueada por demasiados intentos fallidos.
                      Intenta nuevamente en {rateLimit.retryAfter} segundos.
                    </AlertDescription>
                  </Alert>
                )}

                {showRateLimitWarning && (
                  <Alert className="mb-6 border-amber-200 bg-amber-50">
                    <AlertTriangle className="w-4 h-4 text-green-600" />
                    <AlertDescription className="text-emerald-500-700">
                      Te quedan {rateLimit.remaining} intentos. Después tu IP será bloqueada por 1 hora.
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-semibold text-gray-700">
                        Dirección de Email
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500">
                          <Mail size={20} />
                        </div>
                        <Input
                          id="email"
                          type="email"
                          required
                          autoComplete="email"
                          value={email}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                          placeholder="email@ejemplo.com"
                          className="h-12 border-2 border-gray-200 bg-white pl-12 text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                          disabled={processing || rateLimit?.isBlocked}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label htmlFor="password" className="text-sm font-semibold text-gray-700">
                          Contraseña
                        </label>
                        <TextLink
                          href="/forgot-password"
                          className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                        >
                          ¿Olvidaste tu contraseña?
                        </TextLink>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500">
                          <Lock size={20} />
                        </div>
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          required
                          autoComplete="current-password"
                          value={password}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                          placeholder="Ingresa tu contraseña"
                          className="h-12 border-2 border-gray-200 bg-white pl-12 pr-12 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                          disabled={processing || rateLimit?.isBlocked}
                        />
                        <button
                          type="button"
                          onClick={togglePasswordVisibility}
                          className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 transition-colors duration-200 hover:text-gray-600"
                          disabled={processing || rateLimit?.isBlocked}
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>

                    {error && !rateLimit?.isBlocked && (
                      <InputError message={error} />
                    )}

                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(v) => setRememberMe(v === true)}
                        className="border-2 border-gray-300 data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500"
                        disabled={processing || rateLimit?.isBlocked}
                      />
                      <label htmlFor="remember" className="text-sm font-medium text-gray-700">
                        Recordarme por 30 días
                      </label>
                    </div>

                    <Button
                      type="submit"
                      disabled={processing || rateLimit?.isBlocked}
                      className="h-12 w-full bg-gradient-to-r from-green-600 to-emerald-600 font-bold uppercase tracking-wider text-white shadow-lg transition-all duration-200 hover:from-green-700 hover:to-emerald-700 hover:shadow-xl focus:ring-4 focus:ring-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Iniciando sesión...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="mr-2 h-5 w-5" />
                          {rateLimit?.isBlocked ? 'IP Bloqueada' : 'Iniciar Sesión'}
                        </>
                      )}
                    </Button>

                    {/* Información de rate limit */}
                    {rateLimit && !rateLimit.isBlocked && (
                      <div className="text-xs text-center text-gray-500">
                        Intentos: {rateLimit.attempts}/10 - Restantes: {rateLimit.remaining}
                      </div>
                    )}
                  </div>
                </form>

                {status && (
                  <div className="mt-6 rounded-lg bg-green-50 p-4 text-center">
                    <p className="text-sm font-semibold text-green-700">✓ Inicio de sesión correcto</p>
                  </div>
                )}
              </div>

              <div className="relative bg-gradient-to-br from-gray-50 to-gray-100/80 p-10 lg:p-12 flex flex-col items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center justify-center space-y-8 w-full max-w-md">
                  <div className="rounded-2xl bg-white p-6 shadow-lg">
                    <Image
                      src="/robot.png"
                      alt="Logo de la Compañía"
                      width={80}
                      height={80}
                      className="h-20 drop-shadow-[0_4px_20px_rgba(255,165,0,0.3)]"
                      priority
                    />
                  </div>

                  <div className="space-y-6 text-center w-full">
                    <div className="space-y-3">
                      <h2 className="text-2xl font-bold text-gray-900">¿Listo para automatizar tus mensajes?</h2>
                      <p className="text-gray-600 leading-relaxed">
                        Conecta tus contactos de WhatsApp y envía mensajes personalizados a todos ellos de forma automática.
                      </p>
                    </div>

                  </div>
                </div>

                <div className="absolute bottom-6 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-gradient-to-r from-orange-400 to-emerald-400 opacity-60" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthLayout>
  );
}