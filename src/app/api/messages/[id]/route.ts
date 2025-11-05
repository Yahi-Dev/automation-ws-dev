// src/app/api/messages/[id]/route.ts
import prisma from '@/src/lib/prisma';
import { getOrSetCache } from '@/src/lib/redis';
import { CatchError } from '@/src/utils/catchError';
import { HttpResponse } from '@/src/utils/httpResponse';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const messageId = Number.parseInt(id);

    if (Number.isNaN(messageId) || messageId <= 0) {
      return HttpResponse.sendBadRequest('ID de mensaje inválido');
    }

    const cacheKey = `message-${messageId}`;

    const [message, messageError] = await CatchError(
      getOrSetCache(cacheKey, async () => {
        return await prisma.message.findUnique({
          where: { 
            id: messageId,
            isDeleted: false
          },
          include: {
            post: {
              select: {
                id: true,
                text: true,
                schedule: true,
                createdBy: true,
                images: {
                  where: { 
                    post: { isDeleted: false } 
                  },
                  orderBy: { createdAt: 'asc' }
                }
              }
            },
            contact: {
              select: {
                id: true,
                name: true,
                phone: true,
                createdAt: true,
              }
            }
          }
        });
      })
    );

    if (messageError) {
      console.error('Error fetching message:', messageError);
      return HttpResponse.sendServerError('Error al obtener el mensaje', messageError);
    }

    if (!message) {
      return HttpResponse.sendNotFound('Mensaje no encontrado');
    }

    return HttpResponse.sendSuccess(
      { Data: message },
      'Mensaje obtenido exitosamente'
    );

  } catch (error) {
    console.error('Error fetching message:', error);
    return HttpResponse.sendServerError('Error interno del servidor al obtener el mensaje', error);
  }
}