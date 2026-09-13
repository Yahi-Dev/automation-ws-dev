import { SettingsForm } from "@/src/features/settings/components/settings-form";

export default function ConfiguracionPage() {
  return (
    <div className="container mx-auto px-5 py-6 pb-28">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">
          Credenciales de Twilio y preferencias de envío. Los secretos se guardan cifrados.
        </p>
      </div>
      <SettingsForm />
    </div>
  );
}
