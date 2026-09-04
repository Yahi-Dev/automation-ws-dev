// src/lib/api-rate-limit.ts
//
// Limites de uso para las rutas de negocio CARAS.
//
// Hasta ahora el unico rate-limit del sistema estaba en `src/middleware.ts` y
// cubria tres rutas de autenticacion. Las rutas que gastan dinero real (envio de
// WhatsApp), CPU (importacion de 50.000 filas), disco (subida de archivos) o
// cuota de terceros (Content API de Twilio) no tenian ningun limite: un solo
// usuario aprobado podia dispararlas en bucle.
//
// El identificador es el ACTOR (correo de la sesion), no la IP: el abuso que
// importa aqui viene de una cuenta autenticada, y la IP es trivial de cambiar.
import { RateLimitService } from "./rate-limit";
import { HttpResponse } from "@/src/utils/httpResponse";

export type ApiLimitName =
  | "whatsapp-send"
  | "contacts-import"
  | "upload"
  | "settings-test"
  | "templates-create"
  | "consent-write";

type Limite = { maxAttempts: number; windowMs: number; blockDurationMs: number };

const MINUTO = 60_000;
const HORA = 60 * MINUTO;

// Los numeros son deliberadamente holgados para el uso normal y estrechos para
// el abuso: un operador humano nunca lanza 10 campanas en un minuto.
const LIMITES: Record<ApiLimitName, Limite> = {
  // Enviar una campana. Es la ruta que gasta dinero.
  "whatsapp-send": { maxAttempts: 5, windowMs: 5 * MINUTO, blockDurationMs: 15 * MINUTO },
  // Importar CSV: cada peticion puede parsear 50.000 filas en memoria.
  "contacts-import": { maxAttempts: 5, windowMs: 10 * MINUTO, blockDurationMs: 30 * MINUTO },
  // Subida de archivos: 5 MB por peticion, sin cuota de disco.
  upload: { maxAttempts: 30, windowMs: 10 * MINUTO, blockDurationMs: 15 * MINUTO },
  // Probar credenciales: cada llamada golpea la API de Twilio.
  "settings-test": { maxAttempts: 10, windowMs: HORA, blockDurationMs: HORA },
  // Crear plantillas: consume cuota de la Content API y queda en la cuenta.
  "templates-create": { maxAttempts: 20, windowMs: HORA, blockDurationMs: HORA },
  // Escritura de consentimiento: evita el opt-in masivo a base de peticiones.
  "consent-write": { maxAttempts: 60, windowMs: 10 * MINUTO, blockDurationMs: 30 * MINUTO },
};

const servicios = new Map<ApiLimitName, RateLimitService>();

function servicioDe(nombre: ApiLimitName): RateLimitService {
  let s = servicios.get(nombre);
  if (!s) {
    s = new RateLimitService(LIMITES[nombre]);
    servicios.set(nombre, s);
  }
  return s;
}

/**
 * Consume una unidad del limite `nombre` para `actor`.
 *
 * Devuelve `null` si puede continuar, o la respuesta 429 ya construida si no.
 * Uso:
 *   const limite = await enforceApiLimit("whatsapp-send", actor);
 *   if (limite) return limite;
 */
export async function enforceApiLimit(
  nombre: ApiLimitName,
  actor: string
): Promise<Response | null> {
  const resultado = await servicioDe(nombre).incrementAttempt(`api:${nombre}:${actor}`);

  if (!resultado.isBlocked) return null;

  const segundos = resultado.retryAfter ?? Math.ceil(LIMITES[nombre].blockDurationMs / 1000);
  // HttpResponse ya fija la cabecera Retry-After a partir del segundo argumento.
  return HttpResponse.sendTooManyRequests(
    `Has alcanzado el límite de esta operación. Inténtalo de nuevo en ${segundos} segundos.`,
    segundos
  );
}
