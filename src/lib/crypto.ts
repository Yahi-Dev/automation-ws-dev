// src/lib/crypto.ts
// Cifrado simétrico AES-256-GCM para secretos guardados en DB (config de Twilio).
import crypto from "crypto";

const ALGO = "aes-256-gcm";

let warnedFallback = false;
let warnedWeakKdf = false;

/** Deriva la clave de 32 bytes desde SETTINGS_ENC_KEY (hex de 64 chars o passphrase),
 *  con fallback a BETTER_AUTH_SECRET para no romper en desarrollo.
 *  Recomendado en producción: SETTINGS_ENC_KEY dedicada de 64 hex (256 bits). */
function getKey(): Buffer {
  const dedicated = process.env.SETTINGS_ENC_KEY;
  const raw = dedicated || process.env.BETTER_AUTH_SECRET || "";
  if (!raw) {
    throw new Error("Falta SETTINGS_ENC_KEY (o BETTER_AUTH_SECRET) para cifrar secretos");
  }
  // Aviso: reutilizar BETTER_AUTH_SECRET acopla el dominio de sesiones con el de secretos.
  if (!dedicated && !warnedFallback) {
    warnedFallback = true;
    console.warn(
      "[crypto] SETTINGS_ENC_KEY no definida: usando BETTER_AUTH_SECRET como clave de cifrado. " +
        "Define una SETTINGS_ENC_KEY dedicada de 64 hex en producción."
    );
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  // KDF débil (SHA-256 sin sal) por compatibilidad; una clave de 64 hex es preferible.
  if (!warnedWeakKdf) {
    warnedWeakKdf = true;
    console.warn(
      "[crypto] La clave de cifrado no es de 64 hex; se deriva con SHA-256 sin sal. " +
        "Usa una SETTINGS_ENC_KEY de 64 caracteres hexadecimales para mayor robustez."
    );
  }
  return crypto.createHash("sha256").update(raw).digest();
}

/** Cifra un texto plano. Devuelve "iv:tag:data" en base64. */
export function encryptSecret(plain: string): string {
  if (!plain) return "";
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

/** Descifra un valor "iv:tag:data". Devuelve "" si el payload es inválido.
 *  Distingue 'payload ausente/malformado' (silencioso) de 'fallo de descifrado'
 *  (tag GCM inválido -> posible manipulación o cambio de clave): esto último se
 *  registra como advertencia (sin exponer el texto plano) para no enmascararlo. */
export function decryptSecret(payload: string | null | undefined): string {
  if (!payload) return "";
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) return ""; // malformado: no es una señal de ataque
  try {
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    // Verificación de autenticidad fallida: ciphertext alterado o clave cambiada.
    console.warn("[crypto] Fallo al descifrar un secreto (tag GCM inválido): posible manipulación o cambio de clave de cifrado.");
    return "";
  }
}

/** Enmascara un secreto para mostrarlo en la UI (solo últimos 4). */
export function maskSecret(s: string | null | undefined): string {
  if (!s) return "";
  return s.length <= 4 ? "••••" : "••••" + s.slice(-4);
}
