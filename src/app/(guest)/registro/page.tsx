"use client";

import { useState } from "react";
import { authClient } from "@/src/lib/auth-client";
import AuthLayout from "@/src/components/auth/AuthLayout";
import { Card, CardContent } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import TextLink from "@/src/components/shared/TextLink";
import { Loader2, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default function RegistroPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: signErr } = await authClient.signUp.email({
        email: form.email,
        password: form.password,
        name: form.name,
        // campo adicional
        phone: form.phone,
      } as Parameters<typeof authClient.signUp.email>[0]);
      if (signErr) throw new Error(signErr.message ?? "Error al registrarse");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="relative flex min-h-[85vh] items-center justify-center p-6">
        <Card className="w-full max-w-md border-0 bg-white/95 shadow-xl backdrop-blur-xl">
          <CardContent className="p-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">Crear cuenta</h1>
            <p className="text-gray-600 mb-6">Tu cuenta quedará pendiente de aprobación por un administrador.</p>

            {done ? (
              <Alert className="border-emerald-200 bg-emerald-50">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-700">
                  ¡Registro enviado! Un administrador debe aprobar tu cuenta antes de que puedas iniciar sesión.
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Input placeholder="Nombre completo" value={form.name} required onChange={(e) => set("name", e.target.value)} />
                <Input type="email" placeholder="Email" value={form.email} required onChange={(e) => set("email", e.target.value)} />
                <Input placeholder="Teléfono" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                <Input type="password" placeholder="Contraseña" value={form.password} required minLength={8} onChange={(e) => set("password", e.target.value)} />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Registrarme
                </Button>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-gray-600">
              ¿Ya tienes cuenta? <TextLink href="/login" className="text-emerald-600 hover:underline">Inicia sesión</TextLink>
            </p>
          </CardContent>
        </Card>
      </div>
    </AuthLayout>
  );
}
