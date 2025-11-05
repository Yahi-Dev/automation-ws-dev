// src/app/api/messages/assign/route.ts
import { auth } from "@/src/lib/auth"
import prisma from "@/src/lib/prisma"
import { redis } from "@/src/lib/redis"
import { CatchError } from "@/src/utils/catchError"
import { HttpResponse } from "@/src/utils/httpResponse"

const CACHE_KEY = "messages-cache";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { postId, contactIds } = body;

    if (!postId || !contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return HttpResponse.sendBadRequest('Datos inválidos para la asignación');
    }

    const session = await auth.api.getSession({ headers: req.headers });

    // Verificar que el post existe
    const [post, postError] = await CatchError(
      prisma.posts.findUnique({
        where: { 
          id: postId,
          isDeleted: false 
        }
      })
    );

    if (postError) {
      return HttpResponse.sendServerError('Error al verificar el post', postError);
    }

    if (!post) {
      return HttpResponse.sendNotFound('Post no encontrado');
    }

    // Verificar que los contactos existen
    const [existingContacts, contactsError] = await CatchError(
      prisma.contacts.findMany({
        where: { 
          id: { in: contactIds },
          isDeleted: false 
        },
        select: { id: true }
      })
    );

    if (contactsError) {
      return HttpResponse.sendServerError('Error al verificar los contactos', contactsError);
    }

    const existingContactIds = existingContacts.map(contact => contact.id);
    const invalidContactIds = contactIds.filter(id => !existingContactIds.includes(id));

    if (invalidContactIds.length > 0) {
      return HttpResponse.sendBadRequest(`Algunos contactos no existen: ${invalidContactIds.join(', ')}`);
    }

    // Crear los mensajes
    const [createdMessages, createError] = await CatchError(
      prisma.message.createMany({
        data: contactIds.map(contactId => ({
          postId: postId,
          contactId: contactId,
          status: 'pending',
          createdBy: session?.user?.email ?? "desconocido",
          createdAt: new Date(),
        }))
      })
    );

    if (createError) {
      return HttpResponse.sendServerError('Error al asignar los mensajes', createError);
    }

    await redis.del(CACHE_KEY);

    return HttpResponse.sendCreated(
      { Data: createdMessages },
      `Mensaje asignado exitosamente a ${contactIds.length} contacto(s)`
    );
  } catch (error) {
    console.error("Server error:", error);
    return HttpResponse.sendServerError('Error interno del servidor', error);
  }
}