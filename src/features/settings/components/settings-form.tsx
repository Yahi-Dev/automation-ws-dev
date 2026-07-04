"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, PlugZap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Button } from "@/src/components/ui/button";
import { Switch } from "@/src/components/ui/switch";
import { getSettings, saveSettings, testConnection, type SettingsData } from "../services/settings-service";

type FormState = {
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioApiKeySid: string;
  twilioApiKeySecret: string;
  whatsappFrom: string;
  messagingServiceSid: string;
  contentBaseUrl: string;
  templateLanguage: string;
  batchSize: string;
  delayMs: string;
  webhookBaseUrl: string;
  webhookSecret: string;
  requireOptIn: boolean;
};

const empty: FormState = {
  twilioAccountSid: "",
  twilioAuthToken: "",
  twilioApiKeySid: "",
  twilioApiKeySecret: "",
  whatsappFrom: "",
  messagingServiceSid: "",
  contentBaseUrl: "",
  templateLanguage: "",
  batchSize: "",
  delayMs: "",
  webhookBaseUrl: "",
  webhookSecret: "",
  requireOptIn: false,
};

export function SettingsForm() {
  const [form, setForm] = useState<FormState>(empty);
  const [flags, setFlags] = useState<Pick<SettingsData, "hasAuthToken" | "hasApiKeySecret" | "hasWebhookSecret">>({
    hasAuthToken: false,
    hasApiKeySecret: false,
    hasWebhookSecret: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const set = (k: keyof FormState, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    (async () => {
      try {
        const d = await getSettings();
        setForm({
          ...empty,
          twilioAccountSid: d.twilioAccountSid,
          twilioApiKeySid: d.twilioApiKeySid,
          whatsappFrom: d.whatsappFrom,
          messagingServiceSid: d.messagingServiceSid,
          contentBaseUrl: d.contentBaseUrl,
          templateLanguage: d.templateLanguage,
          batchSize: d.batchSize != null ? String(d.batchSize) : "",
          delayMs: d.delayMs != null ? String(d.delayMs) : "",
          webhookBaseUrl: d.webhookBaseUrl,
          requireOptIn: d.requireOptIn,
        });
        setFlags({ hasAuthToken: d.hasAuthToken, hasApiKeySecret: d.hasApiKeySecret, hasWebhookSecret: d.hasWebhookSecret });
      } catch (e) {
        toast.error("Error al cargar la configuración", { description: e instanceof Error ? e.message : "" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings({ ...form });
      toast.success("Configuración guardada");
      const d = await getSettings();
      setFlags({ hasAuthToken: d.hasAuthToken, hasApiKeySecret: d.hasApiKeySecret, hasWebhookSecret: d.hasWebhookSecret });
      set("twilioAuthToken", "");
      set("twilioApiKeySecret", "");
      set("webhookSecret", "");
    } catch (e) {
      toast.error("Error al guardar", { description: e instanceof Error ? e.message : "" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const msg = await testConnection();
      toast.success("Conexión con Twilio", { description: msg });
    } catch (e) {
      toast.error("Fallo la conexión", { description: e instanceof Error ? e.message : "" });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const secretPlaceholder = (has: boolean) => (has ? "•••••• (configurado — dejar en blanco para conservar)" : "No configurado");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Credenciales de Twilio</CardTitle>
          <CardDescription>Cuenta, tokens y sender de WhatsApp. Los secretos se guardan cifrados.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Account SID"><Input value={form.twilioAccountSid} onChange={(e) => set("twilioAccountSid", e.target.value)} placeholder="AC..." /></Field>
          <Field label="Auth Token"><Input type="password" value={form.twilioAuthToken} onChange={(e) => set("twilioAuthToken", e.target.value)} placeholder={secretPlaceholder(flags.hasAuthToken)} /></Field>
          <Field label="API Key SID"><Input value={form.twilioApiKeySid} onChange={(e) => set("twilioApiKeySid", e.target.value)} placeholder="SK..." /></Field>
          <Field label="API Key Secret"><Input type="password" value={form.twilioApiKeySecret} onChange={(e) => set("twilioApiKeySecret", e.target.value)} placeholder={secretPlaceholder(flags.hasApiKeySecret)} /></Field>
          <Field label="WhatsApp Sender (from)"><Input value={form.whatsappFrom} onChange={(e) => set("whatsappFrom", e.target.value)} placeholder="whatsapp:+1..." /></Field>
          <Field label="Messaging Service SID"><Input value={form.messagingServiceSid} onChange={(e) => set("messagingServiceSid", e.target.value)} placeholder="MG... (opcional)" /></Field>
          <Field label="Content Base URL"><Input value={form.contentBaseUrl} onChange={(e) => set("contentBaseUrl", e.target.value)} placeholder="https://content.twilio.com/v1" /></Field>
          <Field label="Idioma de plantillas"><Input value={form.templateLanguage} onChange={(e) => set("templateLanguage", e.target.value)} placeholder="es" /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferencias de envío</CardTitle>
          <CardDescription>Control de velocidad, webhook y cumplimiento.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Tamaño de lote"><Input type="number" value={form.batchSize} onChange={(e) => set("batchSize", e.target.value)} placeholder="10" /></Field>
          <Field label="Pausa entre mensajes (ms)"><Input type="number" value={form.delayMs} onChange={(e) => set("delayMs", e.target.value)} placeholder="1000" /></Field>
          <Field label="URL pública del webhook"><Input value={form.webhookBaseUrl} onChange={(e) => set("webhookBaseUrl", e.target.value)} placeholder="https://tu-dominio o ngrok" /></Field>
          <Field label="Secreto del webhook"><Input type="password" value={form.webhookSecret} onChange={(e) => set("webhookSecret", e.target.value)} placeholder={secretPlaceholder(flags.hasWebhookSecret)} /></Field>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Switch checked={form.requireOptIn} onCheckedChange={(v) => set("requireOptIn", v)} id="requireOptIn" />
            <Label htmlFor="requireOptIn">Exigir opt-in explícito antes de enviar (marketing)</Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleTest} disabled={testing}>
          {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlugZap className="mr-2 h-4 w-4" />}
          Probar conexión
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}
