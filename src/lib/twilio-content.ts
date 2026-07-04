// src/lib/twilio-content.ts
// Cliente REST para la Twilio Content API. Resuelve credenciales/base URL desde
// la config (app_settings en DB, con fallback a env) vía app-config.
import { getTwilioConfig } from "./app-config";

function buildAuthHeader(cfg: {
  accountSid?: string;
  authToken?: string;
  apiKeySid?: string;
  apiKeySecret?: string;
}) {
  // Prioriza API Key si existe; si no, Account SID + Auth Token.
  if (cfg.apiKeySid && cfg.apiKeySecret) {
    const token = Buffer.from(`${cfg.apiKeySid}:${cfg.apiKeySecret}`).toString("base64");
    return `Basic ${token}`;
  }
  if (!cfg.accountSid || !cfg.authToken) {
    throw new Error("Faltan credenciales de Twilio (SID/TOKEN o API Key/Secret).");
  }
  const token = Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64");
  return `Basic ${token}`;
}

export async function contentFetch(path: string, init?: RequestInit) {
  const cfg = await getTwilioConfig();
  const base = cfg.contentBaseUrl;

  const headers = {
    Authorization: buildAuthHeader(cfg),
    "Content-Type": "application/json",
    ...(init?.headers || {}),
  };

  const res = await fetch(`${base}${path}`, { ...init, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(json?.message || "Twilio Content API error"), {
      status: res.status,
      details: json,
    });
  }
  return json;
}
