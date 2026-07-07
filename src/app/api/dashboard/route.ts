// src/app/api/dashboard/route.ts
import { auth } from "@/src/lib/auth"
import prisma from "@/src/lib/prisma"
import { getOrSetCacheNS } from "@/src/lib/redis"
import { getDailyActivityFromRollup } from "@/src/lib/rollups"
import { HttpResponse } from "@/src/utils/httpResponse"
import { format, subDays, startOfDay, endOfDay } from "date-fns"
import { Prisma } from "@prisma/client"
import { NextRequest } from "next/server"

const round = (n: number) => Math.round(n * 100) / 100

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) return HttpResponse.sendUnauthorized("No autenticado. Por favor inicia sesión.")

    const { searchParams } = new URL(request.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    // Cache-aside: las métricas son globales (iguales para todos) y no requieren
    // frescura al segundo. TTL corto (30s) absorbe ráfagas de recargas del dashboard
    // sin recalcular ~20 queries por request. (F4 lo reemplaza por rollups.)
    const dashboardData = await getOrSetCacheNS(
      "dashboard",
      [from ?? "all", to ?? "all"],
      () => computeDashboard(from, to),
      30
    )

    return HttpResponse.sendSuccess({ Data: dashboardData }, "Datos del dashboard obtenidos exitosamente")
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return HttpResponse.sendServerError("Error al obtener los datos del dashboard", error)
  }
}

async function computeDashboard(from: string | null, to: string | null) {
    const dateFilter: Prisma.messageWhereInput =
      from || to
        ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
        : {}
    const baseWhere: Prisma.messageWhereInput = { isDeleted: false, ...dateFilter }

    // Un solo groupBy para el desglose por estado
    const grouped = await prisma.message.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: { _all: true },
    })
    const byStatus: Record<string, number> = {}
    for (const g of grouped) byStatus[g.status] = g._count._all
    const sum = (...ss: string[]) => ss.reduce((a, s) => a + (byStatus[s] ?? 0), 0)

    const sent = sum("sent")
    const delivered = sum("delivered")
    const read = sum("read")
    const failed = sum("failed", "undelivered")
    const pending = sum("pending", "queued")
    const messagesSent = sent + delivered + read // llegaron a Twilio
    const activeContacts = await prisma.contacts.count({ where: { isDeleted: false } })
    const deliveryRate = messagesSent > 0 ? round(((delivered + read) / messagesSent) * 100) : 0
    const readRate = delivered + read > 0 ? round((read / (delivered + read)) * 100) : 0

    // Actividad de los últimos 7 días. Preferimos el rollup precomputado (F4);
    // si está incompleto (o no hay worker que lo refresque), caemos a cálculo en vivo
    // con la MISMA lógica -> los valores no cambian.
    const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sab"]
    let messageActivity: { date: string; enviados: number; fallidos: number; pendientes: number }[]

    const rollup = await getDailyActivityFromRollup(7)
    if (rollup) {
      messageActivity = rollup.map((r) => ({
        date: dayNames[r.date.getDay()],
        enviados: r.enviados,
        fallidos: r.fallidos,
        pendientes: r.pendientes,
      }))
    } else {
      messageActivity = []
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i)
        const dayStart = startOfDay(date)
        const dayEnd = endOfDay(date)
        const [enviados, fallidos, pendientes] = await Promise.all([
          prisma.message.count({ where: { isDeleted: false, status: { in: ["sent", "delivered", "read"] }, sentAt: { gte: dayStart, lte: dayEnd } } }),
          prisma.message.count({ where: { isDeleted: false, status: { in: ["failed", "undelivered"] }, updatedAt: { gte: dayStart, lte: dayEnd } } }),
          prisma.message.count({ where: { isDeleted: false, status: { in: ["pending", "queued"] }, createdAt: { gte: dayStart, lte: dayEnd } } }),
        ])
        messageActivity.push({ date: dayNames[date.getDay()], enviados, fallidos, pendientes })
      }
    }

    // Distribución por estado (para gráfico)
    const statusBreakdown = [
      { name: "Enviados", value: sent },
      { name: "Entregados", value: delivered },
      { name: "Leídos", value: read },
      { name: "Fallidos", value: failed },
      { name: "Pendientes", value: pending },
    ]

    // Contactos recientes (estado real de consentimiento)
    const recentContactsData = await prisma.contacts.findMany({
      where: { isDeleted: false },
      include: { messages: { where: { isDeleted: false }, orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 4,
    })
    const recentContacts = recentContactsData.map((contact) => {
      const lastMessage = contact.messages[0]
      const now = new Date()
      const messageTime = lastMessage?.createdAt ? new Date(lastMessage.createdAt) : now
      const diffHours = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60 * 60))
      const lastMessageText = !lastMessage ? "—" : diffHours < 1 ? "Ahora" : diffHours < 24 ? `${diffHours}h` : `${Math.floor(diffHours / 24)}d`
      return {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        status: contact.consentState === "opted_out" ? "baja" : contact.consentState === "opted_in" ? "activo" : "sin_consentimiento",
        lastMessage: lastMessageText,
      }
    })

    // Próximos envíos programados (real)
    const scheduledMessagesData = await prisma.message.findMany({
      where: { isDeleted: false, status: "pending", post: { schedule: { gte: new Date() } } },
      include: { contact: true, post: true },
      orderBy: { post: { schedule: "asc" } },
      take: 3,
    })
    const scheduledMessages = scheduledMessagesData.map((msg) => {
      const scheduleDate = new Date(msg.post.schedule)
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateText =
        scheduleDate.toDateString() === now.toDateString()
          ? "Hoy"
          : scheduleDate.toDateString() === tomorrow.toDateString()
            ? "Mañana"
            : format(scheduleDate, "dd/MM")
      return {
        id: msg.id,
        contact: msg.contact.name,
        message: msg.post.text.length > 50 ? msg.post.text.substring(0, 50) + "..." : msg.post.text,
        time: format(scheduleDate, "HH:mm"),
        date: dateText,
        status: "scheduled" as const,
      }
    })

    return {
      stats: { messagesSent, delivered, read, failed, pendingMessages: pending, activeContacts, deliveryRate, readRate },
      messageActivity,
      statusBreakdown,
      recentContacts,
      scheduledMessages,
    }
}
