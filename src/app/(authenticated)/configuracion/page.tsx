import { SettingsForm } from "@/src/features/settings/components/settings-form";

export default function ConfiguracionPage() {
  return (
    <div className="container mx-auto py-6 px-5">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">
          Credenciales de Twilio y preferencias de envío. Los secretos se guardan cifrados.
        </p>
      </div>
      <SettingsForm />
    </div>
  );
}
