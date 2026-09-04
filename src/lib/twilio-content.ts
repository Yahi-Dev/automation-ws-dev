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

/**
 * Origenes a los que se permite enviar las credenciales de Twilio.
 *
 * `contentBaseUrl` es editable desde la pantalla de Configuracion y se guarda en
 * `app_settings`. Antes se concatenaba directamente con el path y se enviaba la
 * cabecera `Authorization: Basic <AccountSid:AuthToken>` a CUALQUIER host: bastaba
 * apuntarlo a un servidor propio para recibir el Auth Token de Twilio, que ademas
 * permite FIRMAR webhooks contra esta misma aplicacion.
 *
 * Ampliable por entorno para casos legitimos (regiones de Twilio, pasarela propia).
 */
const ORIGENES_PERMITIDOS = new Set(
  [
    "https://content.twilio.com",
    ...(process.env.TWILIO_CONTENT_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  ]
);

/** Resuelve el path contra la base y verifica que el destino sea de confianza. */
export function resolveContentUrl(base: string, path: string): URL {
  let url: URL;
  try {
    // `new URL(relativo, base)` en vez de concatenar: normaliza los ".." y
    // evita que un `sid` malicioso salga del prefijo /Content.
    const raiz = base.endsWith("/") ? base : `${base}/`;
    url = new URL(path.replace(/^\/+/, ""), raiz);
  } catch {
    throw Object.assign(new Error("La URL de la Content API no es válida."), { status: 500 });
  }

  if (!ORIGENES_PERMITIDOS.has(url.origin)) {
    throw Object.assign(
      new Error(
        `Host no permitido para la Content API: ${url.origin}. ` +
          "Revisa la URL base en Configuración."
      ),
      { status: 400 }
    );
  }

  return url;
}

export async function contentFetch(path: string, init?: RequestInit) {
  const cfg = await getTwilioConfig();
  const url = resolveContentUrl(cfg.contentBaseUrl, path);

  const headers = {
    Authorization: buildAuthHeader(cfg),
    "Content-Type": "application/json",
    ...(init?.headers || {}),
  };

  const res = await fetch(url, {
    ...init,
    headers,
    // Sin esto, un 302 desde un host permitido llevaria las credenciales a
    // cualquier destino, saltandose la lista blanca de arriba.
    redirect: "manual",
    // Ninguna llamada saliente del proyecto tenia timeout: una respuesta que
    // no cierra dejaba la peticion colgada hasta el limite del runtime.
    signal: AbortSignal.timeout(10_000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(json?.message || "Twilio Content API error"), {
      status: res.status,
      details: json,
    });
  }
  return json;
}
