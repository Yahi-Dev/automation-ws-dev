// src/app/api/messages/route.ts (versión corregida)
import { messageCreateSchema, messageUpdateSchema } from "@/src/features/messages/schema/validations"
import { auth } from "@/src/lib/auth"
import prisma from "@/src/lib/prisma"
import { redis } from "@/src/lib/redis"
import { CatchError } from "@/src/utils/catchError"
import { HttpResponse } from "@/src/utils/httpResponse"
import { Prisma } from "@prisma/client"
import { NextRequest } from "next/server"

const CACHE_KEY = "messages-cache";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) return HttpResponse.sendUnauthorized("Debes iniciar sesión");

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')?.trim() || ''
    const status = searchParams.get('status')?.trim()
    const postId = searchParams.get('postId') ? Number.parseInt(searchParams.get('postId')!) : undefined
    const contactId = searchParams.get('contactId') ? Number.parseInt(searchParams.get('contactId')!) : undefined

    const where: Prisma.messageWhereInput = {
      isDeleted: false,
      ...(search
        ? {
            OR: [
              { post: { text: { contains: search } } },
              { contact: { name: { contains: search } } },
              { contact: { phone: { contains: search } } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
      ...(postId ? { postId } : {}),
      ...(contactId ? { contactId } : {}),
    };

    const [messages, error] = await CatchError(
      prisma.message.findMany({
        where,
        include: {
          post: {
            select: {
              id: true,
              text: true,
              schedule: true,
              createdBy: true,
            }
          },
          contact: {
            select: {
              id: true,
              name: true,
              phone: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      })
    );

    if (error) {
      console.error('Error fetching messages:', error);
      return HttpResponse.sendServerError('Error al obtener los mensajes', error);
    }

    // Nota: no se cachea el listado porque varía por filtros (search/status/postId).
    return HttpResponse.sendSuccess(
      {
        Data: messages ?? [],
        Total: messages?.length ?? 0
      },
      'Mensajes obtenidos exitosamente'
    );
  } catch (error: unknown) {
    console.error('Error fetching messages:', error);
    return HttpResponse.sendServerError('Error al obtener los mensajes', error);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = messageCreateSchema.safeParse(body);

    if (!parsed.success) {
      const errorDetails = parsed.error.flatten();
      console.error("Validation error:", errorDetails);
      return HttpResponse.sendBadRequest('Datos inválidos', {
        ...errorDetails,
        message: "Por favor verifica los datos ingresados"
      });
    }

    const session = await auth.api.getSession({ headers: req.headers });
    const data = parsed.data;
    // Crear múltiples mensajes (uno por cada contacto)
    const [createdMessages, createError] = await CatchError(
      prisma.message.createMany({
        data: data.contactIds.map(contactId => ({
          postId: data.postId,
          contactId: contactId,
          status: 'pending',
          createdBy: session?.user?.email ?? "desconocido",
          createdAt: new Date(),
        }))
      })
    );

    if (createError) {
      return HttpResponse.sendServerError('Error al crear los mensajes', createError);
    }

    await redis.del(CACHE_KEY);

    return HttpResponse.sendCreated(
      { Data: createdMessages },
      "Mensajes creados exitosamente"
    );
  } catch (error) {
    console.error("Server error:", error);
    return HttpResponse.sendServerError('Error interno del servidor', error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));

    if (!Number.isInteger(id) || id <= 0) {
      return HttpResponse.sendBadRequest('Id inválido');
    }

    const body = await request.json();
    const parsed = messageUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const errorDetails = parsed.error.flatten();
      console.error("Validation error:", errorDetails);
      return HttpResponse.sendBadRequest('Datos inválidos', {
        ...errorDetails,
        message: "Por favor verifica los datos ingresados"
      });
    }

    const session = await auth.api.getSession({ headers: request.headers });

    const data = parsed.data;
    const [updated, updateError] = await CatchError(
      prisma.message.update({
        where: { id },
        data: {
          ...data,
          ...(data.sentAt && { sentAt: new Date(data.sentAt) }),
          updatedAt: new Date(),
          updatedBy: session?.user?.email ?? "desconocido",
        },
        include: {
          post: {
            select: {
              id: true,
              text: true,
              schedule: true,
              createdBy: true,
            }
          },
          contact: {
            select: {
              id: true,
              name: true,
              phone: true,
            }
          }
        }
      })
    );

    if (updateError) {
      if (updateError instanceof Prisma.PrismaClientKnownRequestError) {
        if (updateError.code === 'P2025') {
          return HttpResponse.sendNotFound('Mensaje no encontrado');
        }
      }
      return HttpResponse.sendServerError('Error al actualizar el mensaje', updateError);
    }

    await redis.del(CACHE_KEY);
    await redis.del(`message-${id}`);

    return HttpResponse.sendSuccess(
      { Data: updated },
      "Mensaje actualizado exitosamente"
    );
  } catch (error) {
    return HttpResponse.sendServerError('Error interno del servidor', error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    const id = idParam !== null ? Number(idParam) : null;

    if (id === null || !Number.isInteger(id) || id <= 0) {
      return HttpResponse.sendBadRequest('Id inválido');
    }

    const [message, messageError] = await CatchError(
      prisma.message.findUnique({
        where: { id },
        select: {
          id: true,
          post: {
            select: {
              text: true
            }
          },
          contact: {
            select: {
              name: true
            }
          }
        }
      })
    );

    if (messageError) {
      return HttpResponse.sendServerError('Error al buscar mensaje', messageError);
    }

    if (!message) {
      return HttpResponse.sendNotFound('Mensaje no encontrado');
    }

    const [deleteError] = await CatchError(
      prisma.message.update({
        where: { id },
        data: { isDeleted: true }
      })
    );

    if (deleteError) {
      return HttpResponse.sendServerError('Error al eliminar el mensaje', deleteError);
    }

    await redis.del(CACHE_KEY);
    await redis.del(`message-${id}`);

    return HttpResponse.sendSuccess(
      {},
      `Mensaje eliminado correctamente`
    );

  } catch (error) {
    console.error('Error deleting message:', error);
    return HttpResponse.sendServerError('Error interno del servidor al eliminar el mensaje', error);
  }
}