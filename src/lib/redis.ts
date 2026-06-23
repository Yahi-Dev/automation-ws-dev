// src/lib/redis.ts
// Cliente Redis resiliente: usa Upstash si está configurado y disponible,
// y degrada automáticamente a un store en memoria (por proceso) si Upstash
// no está configurado o no responde. Nunca lanza: las operaciones fallan
// "en silencio" hacia el fallback para no romper las rutas de la app.
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

// ¿Hay un Upstash "real" configurado? (no vacío y no un placeholder)
const isConfigured = Boolean(url && token && !/XXXX|your-|example|changeme/i.test(url));

const upstash = isConfigured ? new Redis({ url: url as string, token: token as string }) : null;

// ----------------------------------------------------------------------------
// Fallback en memoria (persistente durante la vida del proceso)
// ----------------------------------------------------------------------------
type Entry = { value: unknown; expiresAt: number | null };
const mem = new Map<string, Entry>();

function memGet<T>(key: string): T | null {
  const e = mem.get(key);
  if (!e) return null;
  if (e.expiresAt !== null && Date.now() > e.expiresAt) {
    mem.delete(key);
    return null;
  }
  return e.value as T;
}
function memSet(key: string, value: unknown, exSeconds?: number) {
  mem.set(key, { value, expiresAt: exSeconds ? Date.now() + exSeconds * 1000 : null });
}
function memDel(...keys: string[]): number {
  let n = 0;
  for (const k of keys) if (mem.delete(k)) n++;
  return n;
}
function memIncr(key: string): number {
  const cur = memGet<number>(key);
  const next = (typeof cur === "number" ? cur : 0) + 1;
  const prev = mem.get(key);
  mem.set(key, { value: next, expiresAt: prev?.expiresAt ?? null });
  return next;
}
function memPexpire(key: string, ms: number) {
  const e = mem.get(key);
  if (e) e.expiresAt = Date.now() + ms;
}
function memPttl(key: string): number {
  const e = mem.get(key);
  if (!e) return -2;
  if (e.expiresAt === null) return -1;
  const ttl = e.expiresAt - Date.now();
  return ttl > 0 ? ttl : -2;
}

// ----------------------------------------------------------------------------
// Circuit breaker: si Upstash falla, se usa memoria por un tiempo de enfriamiento
// ----------------------------------------------------------------------------
const COOLDOWN_MS = 60_000;
let downUntil = 0;
let warned = false;

function redisAvailable(): boolean {
  return Boolean(upstash) && Date.now() >= downUntil;
}
function markDown(err: unknown) {
  downUntil = Date.now() + COOLDOWN_MS;
  if (!warned) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[redis] Upstash no disponible — usando fallback en memoria. (${msg})`);
    warned = true;
  }
}

class SafeRedis {
  async get<T = unknown>(key: string): Promise<T | null> {
    if (redisAvailable()) {
      try {
        const v = await upstash!.get<T>(key);
        return (v ?? null) as T | null;
      } catch (e) {
        markDown(e);
      }
    }
    return memGet<T>(key);
  }

  async set(key: string, value: unknown, opts?: { ex?: number }): Promise<unknown> {
    if (redisAvailable()) {
      try {
        return opts?.ex
          ? await upstash!.set(key, value as string, { ex: opts.ex })
          : await upstash!.set(key, value as string);
      } catch (e) {
        markDown(e);
      }
    }
    memSet(key, value, opts?.ex);
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    if (redisAvailable()) {
      try {
        return await upstash!.del(...keys);
      } catch (e) {
        markDown(e);
      }
    }
    return memDel(...keys);
  }

  async incr(key: string): Promise<number> {
    if (redisAvailable()) {
      try {
        return await upstash!.incr(key);
      } catch (e) {
        markDown(e);
      }
    }
    return memIncr(key);
  }

  async pexpire(key: string, ms: number): Promise<number> {
    if (redisAvailable()) {
      try {
        return await upstash!.pexpire(key, ms);
      } catch (e) {
        markDown(e);
      }
    }
    memPexpire(key, ms);
    return 1;
  }

  async pttl(key: string): Promise<number> {
    if (redisAvailable()) {
      try {
        return await upstash!.pttl(key);
      } catch (e) {
        markDown(e);
      }
    }
    return memPttl(key);
  }
}

export const redis = new SafeRedis();
export default redis;

export async function getOrSetCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds = 300
): Promise<T> {
  const cached = await redis.get<T>(key);
  if (cached !== null && cached !== undefined) return cached;

  const data = await fetcher();
  await redis.set(key, data as unknown, { ex: ttlSeconds });
  return data;
}
