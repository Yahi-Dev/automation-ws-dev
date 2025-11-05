// src/app/api/dashboard/route.ts
import { auth } from "@/src/lib/auth"
import prisma from "@/src/lib/prisma"
import { CatchError } from "@/src/utils/catchError"
import { HttpResponse } from "@/src/utils/httpResponse"
import { format, subDays, startOfDay, endOfDay } from "date-fns"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Obtener la sesión correctamente pasando los headers de la request
    const session = await auth.api.getSession({ 
      headers: request.headers 
    });

    if (!session) {
      return HttpResponse.sendUnauthorized("No autenticado. Por favor inicia sesión.");
    }

    // Obtener estadísticas básicas
    const [totalMessages] = await CatchError(
      prisma.message.count({
        where: { 
          isDeleted: false,
          status: { in: ['sent', 'delivered'] }
        }
      })
    );

    const [activeContacts] = await CatchError(
      prisma.contacts.count({
        where: { isDeleted: false }
      })
    );

    const [pendingMessages] = await CatchError(
      prisma.message.count({
        where: { 
          isDeleted: false,
          status: 'pending'
        }
      })
    );

    // Calcular tasa de entrega (mensajes enviados vs total)
    const [sentMessages] = await CatchError(
      prisma.message.count({
        where: { 
          isDeleted: false,
          status: { in: ['sent', 'delivered'] }
        }
      })
    );

    const [totalMessagesForRate] = await CatchError(
      prisma.message.count({
        where: { isDeleted: false }
      })
    );

    // Handle null values by providing defaults
    const sentMessagesCount = sentMessages || 0;
    const totalMessagesCount = totalMessagesForRate || 0;

    const deliveryRate = totalMessagesCount > 0 
      ? Math.round((sentMessagesCount / totalMessagesCount) * 10000) / 100 
      : 0;

    // Datos de actividad de mensajes (últimos 7 días)
    const messageActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const [sentCount] = await CatchError(
        prisma.message.count({
          where: {
            isDeleted: false,
            status: { in: ['sent', 'delivered'] },
            sentAt: {
              gte: dayStart,
              lte: dayEnd
            }
          }
        })
      );

      const [pendingCount] = await CatchError(
        prisma.message.count({
          where: {
            isDeleted: false,
            status: 'pending',
            createdAt: {
              gte: dayStart,
              lte: dayEnd
            }
          }
        })
      );

      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab'];
      messageActivity.push({
        date: dayNames[date.getDay()],
        enviados: sentCount || 0,
        pendientes: pendingCount || 0
      });
    }

    // Actividad por hora (simulada basada en posts programados)
    const scheduleActivity = [
      { hora: "00:00", actividad: 5 },
      { hora: "04:00", actividad: 8 },
      { hora: "08:00", actividad: 35 },
      { hora: "12:00", actividad: 65 },
      { hora: "16:00", actividad: 78 },
      { hora: "20:00", actividad: 45 },
      { hora: "23:00", actividad: 12 },
    ];

    // Contactos recientes (últimos 4 contactos con mensajes)
    const [recentContactsData] = await CatchError(
      prisma.contacts.findMany({
        where: { isDeleted: false },
        include: {
          messages: {
            where: { isDeleted: false },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 4
      })
    );

    const recentContacts = recentContactsData?.map(contact => {
      const lastMessage = contact.messages[0];
      const now = new Date();
      const messageTime = lastMessage?.createdAt ? new Date(lastMessage.createdAt) : now;
      const diffHours = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60 * 60));
      
      let lastMessageText = '';
      if (diffHours < 1) {
        lastMessageText = 'Ahora';
      } else if (diffHours < 24) {
        lastMessageText = `${diffHours}h`;
      } else {
        lastMessageText = `${Math.floor(diffHours / 24)}d`;
      }

      return {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        status: 'activo' as const,
        lastMessage: lastMessageText
      };
    }) || [];

    // Mensajes programados próximos
    const [scheduledMessagesData] = await CatchError(
      prisma.message.findMany({
        where: { 
          isDeleted: false,
          status: 'pending',
          post: {
            schedule: { gte: new Date() }
          }
        },
        include: {
          contact: true,
          post: true
        },
        orderBy: { 
          post: {
            schedule: 'asc'
          }
        },
        take: 3
      })
    );

    const scheduledMessages = scheduledMessagesData?.map(msg => {
      const scheduleDate = new Date(msg.post.schedule);
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let dateText = '';
      if (scheduleDate.toDateString() === now.toDateString()) {
        dateText = 'Hoy';
      } else if (scheduleDate.toDateString() === tomorrow.toDateString()) {
        dateText = 'Mañana';
      } else {
        dateText = format(scheduleDate, 'dd/MM');
      }

      return {
        id: msg.id,
        contact: msg.contact.name,
        message: msg.post.text.length > 50 ? msg.post.text.substring(0, 50) + '...' : msg.post.text,
        time: format(scheduleDate, 'HH:mm'),
        date: dateText,
        status: 'scheduled' as const
      };
    }) || [];

    const dashboardData = {
      stats: {
        messagesSent: totalMessages || 0,
        activeContacts: activeContacts || 0,
        pendingMessages: pendingMessages || 0,
        deliveryRate: deliveryRate,
        changes: {
          messagesSent: "+12.5%",
          activeContacts: "+8.2%", 
          pendingMessages: "-3.1%",
          deliveryRate: "+2.3%"
        }
      },
      messageActivity,
      scheduleActivity,
      recentContacts,
      scheduledMessages
    };

    return HttpResponse.sendSuccess(
      { Data: dashboardData },
      'Datos del dashboard obtenidos exitosamente'
    );

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return HttpResponse.sendServerError('Error al obtener los datos del dashboard', error);
  }
}