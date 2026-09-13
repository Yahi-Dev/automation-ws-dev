import { TemplatesTable } from "@/src/features/templates/components/templates-table";

export default function PlantillasPage() {
  return (
    <div className="container mx-auto px-5 py-6 pb-28">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Plantillas de WhatsApp</h1>
        <p className="text-muted-foreground">
          Administra tus plantillas de Twilio Content y su estado de aprobación de WhatsApp.
        </p>
      </div>
      <TemplatesTable />
    </div>
  );
}
