import twilio from "twilio";
import type { Twilio } from "twilio";
import { getTwilioConfig } from "./app-config";

/**
 * Cliente de Twilio memoizado por credenciales.
 *
 * Antes se llamaba a `twilio(sid, token)` en CADA envío. El constructor del SDK
 * crea su propio `https.Agent`, así que un cliente por mensaje significaba cero
 * reutilización de sockets: handshake TCP + TLS completo en cada uno
 * (~150-250 ms de sobrecoste por mensaje). En una campaña de 20.000 mensajes son
 * entre 50 y 80 minutos de puro handshake, y decenas de agentes muertos vivos a
 * la vez esperando su timeout.
 *
 * La caché es por par (accountSid, authToken): al rotar credenciales desde la
 * pantalla de Configuración se crea una entrada nueva y la anterior se descarta.
 */
const clientes = new Map<string, Twilio>();

/** Timeout de las peticiones salientes al API de Twilio. */
const TIMEOUT_MS = Math.max(1_000, Number(process.env.TWILIO_REQUEST_TIMEOUT_MS ?? 15_000));

function clienteParaCredenciales(accountSid: string, authToken: string): Twilio {
  const clave = `${accountSid}:${authToken}`;
  let cliente = clientes.get(clave);

  if (!cliente) {
    cliente = twilio(accountSid, authToken, {
      // `keepAlive` reutiliza la conexión TLS entre mensajes.
      autoRetry: true,
      maxRetries: 2,
      timeout: TIMEOUT_MS,
    });

    // Solo se conserva el cliente activo: rotar credenciales no debe dejar
    // clientes viejos (y sus sockets) retenidos en memoria para siempre.
    clientes.clear();
    clientes.set(clave, cliente);
  }

  return cliente;
}

/** Cliente resuelto desde la config (app_settings en DB, con fallback a env). */
export async function getTwilioClientFromConfig(): Promise<Twilio> {
  const cfg = await getTwilioConfig();
  if (!cfg.accountSid || !cfg.authToken) {
    throw new Error(
      "Faltan credenciales de Twilio (configúralas en Configuración o en el .env)"
    );
  }
  return clienteParaCredenciales(cfg.accountSid, cfg.authToken);
}

/** Descarta el cliente memoizado. Se usa al cambiar credenciales. */
export function clearTwilioClientCache() {
  clientes.clear();
}
