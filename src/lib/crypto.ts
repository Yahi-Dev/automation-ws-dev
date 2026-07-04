// src/lib/crypto.ts
// Cifrado simétrico AES-256-GCM para secretos guardados en DB (config de Twilio).
import crypto from "crypto";

const ALGO = "aes-256-gcm";

/** Deriva la clave de 32 bytes desde SETTINGS_ENC_KEY (hex de 64 chars o passphrase),
 *  con fallback a BETTER_AUTH_SECRET para no romper en desarrollo. */
function getKey(): Buffer {
  const raw = process.env.SETTINGS_ENC_KEY || process.env.BETTER_AUTH_SECRET || "";
  if (!raw) {
    throw new Error("Falta SETTINGS_ENC_KEY (o BETTER_AUTH_SECRET) para cifrar secretos");
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
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

/** Descifra un valor "iv:tag:data". Devuelve "" si el payload es inválido. */
export function decryptSecret(payload: string | null | undefined): string {
  if (!payload) return "";
  try {
    const [ivB64, tagB64, dataB64] = payload.split(":");
    if (!ivB64 || !tagB64 || !dataB64) return "";
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return "";
  }
}

/** Enmascara un secreto para mostrarlo en la UI (solo últimos 4). */
export function maskSecret(s: string | null | undefined): string {
  if (!s) return "";
  return s.length <= 4 ? "••••" : "••••" + s.slice(-4);
}
