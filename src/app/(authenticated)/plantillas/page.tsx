import { TemplatesTable } from "@/src/features/templates/components/templates-table";

export default function PlantillasPage() {
  return (
    <div className="container mx-auto py-6 px-5">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Plantillas de WhatsApp</h1>
        <p className="text-muted-foreground">
          Administra tus plantillas de Twilio Content y su estado de aprobación de WhatsApp.
        </p>
      </div>
      <TemplatesTable />
    </div>
  );
}
