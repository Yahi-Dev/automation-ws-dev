// src/features/settings/services/settings-service.ts

export interface SettingsData {
  twilioAccountSid: string;
  twilioApiKeySid: string;
  whatsappFrom: string;
  messagingServiceSid: string;
  contentBaseUrl: string;
  templateLanguage: string;
  batchSize: number | null;
  delayMs: number | null;
  webhookBaseUrl: string;
  requireOptIn: boolean;
  hasAuthToken: boolean;
  hasApiKeySecret: boolean;
  hasWebhookSecret: boolean;
}

export async function getSettings(): Promise<SettingsData> {
  const res = await fetch("/api/settings");
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Error al cargar la configuración");
  return json.data as SettingsData;
}

export async function saveSettings(payload: Record<string, unknown>): Promise<void> {
  const res = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Error al guardar la configuración");
}

export async function testConnection(): Promise<string> {
  const res = await fetch("/api/settings/test", { method: "POST" });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "No se pudo conectar con Twilio");
  return json.message || "Conexión OK";
}
