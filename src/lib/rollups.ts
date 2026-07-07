// src/lib/rollups.ts
// Rollup diario de actividad para el dashboard (F4).
// La recomputación usa EXACTAMENTE la misma lógica/anclas de fecha que el cálculo en
// vivo del dashboard, así los valores mostrados no cambian; solo se sirven más rápido.
import prisma from "./prisma";
import { startOfDay, endOfDay, subDays } from "date-fns";

const SENT = ["sent", "delivered", "read"];
const FAILED = ["failed", "undelivered"];
const PENDING = ["pending", "queued"];

export type DailyActivity = { date: Date; enviados: number; fallidos: number; pendientes: number };

/** Recalcula el rollup de los últimos `days` días (incluye hoy) y hace upsert. */
export async function recomputeDailyStats(days = 8): Promise<void> {
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const [enviados, fallidos, pendientes] = await Promise.all([
      prisma.message.count({ where: { isDeleted: false, status: { in: SENT }, sentAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.message.count({ where: { isDeleted: false, status: { in: FAILED }, updatedAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.message.count({ where: { isDeleted: false, status: { in: PENDING }, createdAt: { gte: dayStart, lte: dayEnd } } }),
    ]);

    await prisma.messageDailyStats.upsert({
      where: { day: dayStart },
      create: { day: dayStart, enviados, fallidos, pendientes },
      update: { enviados, fallidos, pendientes },
    });
  }
}

/**
 * Devuelve la actividad de los últimos `days` días desde el rollup, o `null` si está
 * incompleto (falta algún día) para que el dashboard haga fallback a cálculo en vivo.
 */
export async function getDailyActivityFromRollup(days = 7): Promise<DailyActivity[] | null> {
  const start = startOfDay(subDays(new Date(), days - 1));
  const rows = await prisma.messageDailyStats.findMany({
    where: { day: { gte: start } },
    orderBy: { day: "asc" },
  });

  const byDay = new Map<number, (typeof rows)[number]>();
  for (const r of rows) byDay.set(startOfDay(r.day).getTime(), r);

  const out: DailyActivity[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = startOfDay(subDays(new Date(), i));
    const r = byDay.get(d.getTime());
    if (!r) return null; // rollup incompleto -> fallback en vivo
    out.push({ date: d, enviados: r.enviados, fallidos: r.fallidos, pendientes: r.pendientes });
  }
  return out;
}
