import AuthLayout from "@/src/components/auth/AuthLayout";
import { Card, CardContent } from "@/src/components/ui/card";
import TextLink from "@/src/components/shared/TextLink";
import { MailCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default function VerifyAndSetPasswordPage() {
  return (
    <AuthLayout>
      <div className="relative flex min-h-[85vh] items-center justify-center p-6">
        <Card className="w-full max-w-md border-0 bg-white/95 shadow-xl backdrop-blur-xl">
          <CardContent className="p-8 text-center">
            <MailCheck className="mx-auto mb-4 h-10 w-10 text-emerald-600" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verificación de cuenta</h1>
            <p className="text-gray-600">
              Tu registro fue recibido. Una vez que un administrador apruebe tu cuenta podrás
              iniciar sesión con la contraseña que definiste al registrarte.
            </p>
            <p className="mt-6 text-sm text-gray-600">
              <TextLink href="/login" className="text-emerald-600 hover:underline">
                Ir a iniciar sesión
              </TextLink>
            </p>
          </CardContent>
        </Card>
      </div>
    </AuthLayout>
  );
}
