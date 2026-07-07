// src/lib/safe-compare.ts
// Comparacion de strings en tiempo constante (evita timing side-channels al
// comparar secretos/tokens). No revela por tiempo el prefijo correcto.
import { timingSafeEqual } from "crypto";

export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (a == null || b == null) return false;
  const ab = Buffer.from(String(a), "utf8");
  const bb = Buffer.from(String(b), "utf8");
  if (ab.length !== bb.length) {
    // Comparar consigo mismo para no filtrar la diferencia de longitud por tiempo.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}
