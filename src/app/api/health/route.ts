// src/app/api/health/route.ts
// Health check: DB, Redis y cola. Devuelve 200 (ok/degraded) o 503 si la DB cae.
// Útil para balanceadores, monitores y readiness/liveness probes.
import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { redis, redisDisponible } from "@/src/lib/redis";
import { queueEnabled } from "@/src/lib/queue";
import { twilioBreaker } from "@/src/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Timeout de cada comprobación.
 *
 * Una sonda que se cuelga es peor que una que falla, pero una que corta
 * demasiado pronto es peor todavía: reporta caídas falsas. Las bases de datos
 * sin servidor (TiDB Serverless, Neon...) suspenden tras un rato de inactividad
 * y la PRIMERA conexión tarda varios segundos; con 2 s el health check decía
 * "down" cada vez que nadie había entrado en un rato.
 */
const TIMEOUT_MS = Math.max(1_000, Number(process.env.HEALTH_TIMEOUT_MS ?? 8_000));

function conPlazo<T>(promesa: Promise<T>, ms: number): Promise<T | "timeout"> {
  return Promise.race([
    promesa,
    new Promise<"timeout">((r) => setTimeout(() => r("timeout"), ms)),
  ]);
}

export async function GET() {
  const checks: Record<string, string> = {};

  // DB (crítico).
  // Con plazo: si MySQL acepta la conexión pero no responde, esta sonda se
  // quedaba colgada indefinidamente y el balanceador nunca detectaba la caída.
  let dbOk = false;
  try {
    const r = await conPlazo(prisma.$queryRaw`SELECT 1`, TIMEOUT_MS);
    dbOk = r !== "timeout";
    checks.db = dbOk ? "ok" : "timeout";
  } catch {
    checks.db = "down";
  }

  // Redis.
  //
  // Antes esta comprobación no podía fallar NUNCA: `redis` degrada de forma
  // transparente al mapa en memoria, así que el set/get siempre respondía "ok"
  // aunque Upstash estuviera caído. Ahora se informa del modo real.
  if (!redisDisponible()) {
    checks.redis = "no_configurado";
  } else {
    try {
      const pingKey = "health:ping";
      const r = await conPlazo(
        (async () => {
          await redis.set(pingKey, "1", { ex: 10 });
          return redis.get<string>(pingKey);
        })(),
        TIMEOUT_MS
      );
      checks.redis = r === "timeout" ? "timeout" : r ? "ok" : "degraded";
    } catch {
      checks.redis = "degraded";
    }
  }

  // `queueEnabled` solo dice que REDIS_URL está definida: NO prueba que exista
  // un worker vivo consumiendo. Se nombra en consecuencia para no dar por buena
  // una cola sin nadie al otro lado, que es la diferencia entre una campaña
  // enviada y una campaña perdida.
  checks.queue = queueEnabled ? "configurada" : "deshabilitada";
  checks.twilio = twilioBreaker.isOpen() ? "circuit_open" : "ok";

  const degradado = Object.values(checks).some((v) =>
    ["degraded", "timeout", "circuit_open"].includes(v)
  );
  const status = !dbOk ? "down" : degradado ? "degraded" : "ok";
  const httpStatus = dbOk ? 200 : 503;

  return NextResponse.json({ status, checks, time: new Date().toISOString() }, { status: httpStatus });
}
