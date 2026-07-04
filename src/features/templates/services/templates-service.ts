// src/features/templates/services/templates-service.ts

export interface TemplateItem {
  id: string;
  sid: string;
  friendlyName: string;
  language: string;
  approvalStatus: string | null;
  category: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export async function getTemplates(): Promise<TemplateItem[]> {
  const res = await fetch("/api/whatsapp/templates");
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || json.error || "Error al cargar plantillas");
  return (json.list ?? []) as TemplateItem[];
}

export async function submitForApproval(sid: string, name: string, category: string): Promise<void> {
  const res = await fetch(`/api/whatsapp/templates/${sid}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, category }),
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || "Error al enviar a aprobación");
}

export async function refreshApproval(sid: string): Promise<string | undefined> {
  const res = await fetch(`/api/whatsapp/templates/${sid}/approvals`);
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || "Error al consultar el estado");
  return json.status as string | undefined;
}
