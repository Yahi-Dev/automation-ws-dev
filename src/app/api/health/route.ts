// src/app/api/health/route.ts
// Health check: DB, Redis y cola. Devuelve 200 (ok/degraded) o 503 si la DB cae.
// Útil para balanceadores, monitores y readiness/liveness probes.
import { NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { redis } from "@/src/lib/redis";
import { queueEnabled } from "@/src/lib/queue";
import { twilioBreaker } from "@/src/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {};

  // DB (crítico)
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
    checks.db = "ok";
  } catch {
    checks.db = "down";
  }

  // Redis (no crítico: hay fallback en memoria)
  try {
    const pingKey = "health:ping";
    await redis.set(pingKey, "1", { ex: 10 });
    checks.redis = (await redis.get<string>(pingKey)) ? "ok" : "degraded";
  } catch {
    checks.redis = "degraded";
  }

  checks.queue = queueEnabled ? "enabled" : "disabled";
  checks.twilio = twilioBreaker.isOpen() ? "circuit_open" : "ok";

  const status = !dbOk ? "down" : Object.values(checks).some((v) => v === "degraded" || v === "circuit_open") ? "degraded" : "ok";
  const httpStatus = dbOk ? 200 : 503;

  return NextResponse.json({ status, checks, time: new Date().toISOString() }, { status: httpStatus });
}
