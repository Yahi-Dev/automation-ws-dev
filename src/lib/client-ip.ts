// src/lib/client-ip.ts
// Resuelve la IP del cliente de forma resistente a spoofing de x-forwarded-for.
//
// x-forwarded-for lo puede FALSIFICAR el cliente (añade entradas a la izquierda).
// Solo son de confianza las entradas que añaden TUS proxies (a la derecha). Con
// TRUSTED_PROXY_HOPS proxies de confianza, la IP real está en la posición
// (length - hops). Preferimos cabeceras de plataformas conocidas cuando existen.
//
// Config: TRUSTED_PROXY_HOPS (por defecto 1). En Cloudflare se usa cf-connecting-ip.
import type { NextRequest } from "next/server";

export function getClientIp(req: NextRequest | Request): string | null {
  const h = req.headers;

  // Cloudflare / plataformas: cabeceras que el cliente no puede falsificar tras el proxy.
  const cf = h.get("cf-connecting-ip");
  if (cf) return cf.trim();

  const realIp = h.get("x-real-ip");
  if (realIp) return realIp.trim();

  const xff = h.get("x-forwarded-for");
  if (xff) {
    const ips = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (ips.length > 0) {
      const hops = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS ?? 1));
      // La entrada añadida por el proxy más cercano (a la derecha) es la de confianza.
      const idx = Math.max(0, ips.length - hops);
      return ips[idx] ?? ips[ips.length - 1];
    }
  }

  return process.env.NODE_ENV === "development" ? "127.0.0.1" : null;
}
