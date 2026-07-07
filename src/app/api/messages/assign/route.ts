// src/app/api/messages/assign/route.ts
import { requireAuth } from "@/src/lib/authz"
import prisma from "@/src/lib/prisma"
import { redis } from "@/src/lib/redis"
import { CatchError } from "@/src/utils/catchError"
import { HttpResponse } from "@/src/utils/httpResponse"

const CACHE_KEY = "messages-cache";

export async function POST(req: Request) {
  try {
    const gate = await requireAuth(req);
    if ("response" in gate) return gate.response;

    const body = await req.json();
    const { postId, contactIds } = body;

    if (!postId || !contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return HttpResponse.sendBadRequest('Datos inválidos para la asignación');
    }

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

    // Verificar que los contactos existen (y traer su estado de consentimiento)
    const [existingContacts, contactsError] = await CatchError(
      prisma.contacts.findMany({
        where: {
          id: { in: contactIds },
          isDeleted: false
        },
        select: { id: true, consentState: true }
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

    // Cumplimiento: excluir a los contactos que hicieron opt-out
    const allowedContactIds = existingContacts
      .filter(c => c.consentState !== 'opted_out')
      .map(c => c.id);
    const optOutSkipped = existingContactIds.length - allowedContactIds.length;

    if (allowedContactIds.length === 0) {
      return HttpResponse.sendBadRequest('Todos los contactos seleccionados se dieron de baja (opt-out).');
    }

    // Crear los mensajes solo para los contactos permitidos
    const [createdMessages, createError] = await CatchError(
      prisma.message.createMany({
        data: allowedContactIds.map(contactId => ({
          postId: postId,
          contactId: contactId,
          status: 'pending',
          createdBy: gate.user.email ?? "desconocido",
          createdAt: new Date(),
        }))
      })
    );

    if (createError) {
      return HttpResponse.sendServerError('Error al asignar los mensajes', createError);
    }

    await redis.del(CACHE_KEY);

    const optOutNote = optOutSkipped > 0 ? ` (${optOutSkipped} omitido(s) por opt-out)` : '';
    return HttpResponse.sendCreated(
      { Data: createdMessages },
      `Mensaje asignado exitosamente a ${allowedContactIds.length} contacto(s)${optOutNote}`
    );
  } catch (error) {
    console.error("Server error:", error);
    return HttpResponse.sendServerError('Error interno del servidor', error);
  }
}