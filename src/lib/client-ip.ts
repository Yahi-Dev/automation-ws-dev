// src/lib/client-ip.ts
// Resuelve la IP del cliente de forma resistente a la falsificacion de cabeceras.
//
// TODA cabecera de IP la puede escribir el cliente. Solo son de confianza si hay
// un proxy delante que las SOBREESCRIBE en cada peticion. Por eso aqui no se
// confia en ninguna por defecto: hay que declarar la topologia por entorno.
//
// Configuracion:
//   TRUST_PLATFORM_HEADERS=true  -> confiar en cf-connecting-ip / x-real-ip.
//                                   Ponlo SOLO si Cloudflare (o un proxy que
//                                   reescriba esas cabeceras) esta delante y el
//                                   origen no es alcanzable directamente.
//   TRUSTED_PROXY_HOPS=N         -> numero de proxies propios que anaden entrada
//                                   a x-forwarded-for. 0 = trafico directo, no
//                                   se confia en x-forwarded-for en absoluto.
//
// Devolver `null` significa "no se pudo determinar de forma fiable". Quien llama
// debe tratarlo como fallo cerrado (bloquear), nunca como via libre: si no hay
// IP fiable, tampoco hay contador de intentos que valga.
import type { NextRequest } from "next/server";

function trustPlatformHeaders(): boolean {
  return process.env.TRUST_PLATFORM_HEADERS === "true";
}

function trustedProxyHops(): number {
  const raw = Number(process.env.TRUSTED_PROXY_HOPS ?? 0);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
}

export function getClientIp(req: NextRequest | Request): string | null {
  const h = req.headers;

  // Cabeceras de plataforma. Antes se aceptaban SIEMPRE, con lo que un atacante
  // que hablase directo con el servidor podia rotar `cf-connecting-ip` en cada
  // intento: nunca acumulaba contador de rate-limit (fuerza bruta sin techo) y
  // ademas hacia crecer sin cota el mapa de contadores en memoria.
  if (trustPlatformHeaders()) {
    const cf = h.get("cf-connecting-ip");
    if (cf) return cf.trim();

    const realIp = h.get("x-real-ip");
    if (realIp) return realIp.trim();
  }

  // x-forwarded-for: el cliente anade entradas por la IZQUIERDA; las de confianza
  // son las que anaden nuestros proxies, por la DERECHA. Con N saltos de
  // confianza, la IP real esta en la posicion (length - N).
  const hops = trustedProxyHops();
  if (hops > 0) {
    const xff = h.get("x-forwarded-for");
    if (xff) {
      const ips = xff.split(",").map((s) => s.trim()).filter(Boolean);
      // Si llegan menos entradas que saltos declarados, la cadena no es la que
      // esperamos (peticion directa o proxy mal configurado): no se confia.
      if (ips.length >= hops) {
        return ips[ips.length - hops] ?? null;
      }
    }
  }

  // En desarrollo no hay proxy y el trafico es local: valor estable para poder
  // probar el rate-limit sin configurar nada.
  if (process.env.NODE_ENV === "development") return "127.0.0.1";

  return null;
}
