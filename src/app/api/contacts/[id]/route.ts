import prisma from '@/src/lib/prisma';
import { requireAuth } from '@/src/lib/authz';
import { CatchError } from '@/src/utils/catchError';
import { HttpResponse } from '@/src/utils/httpResponse';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireAuth(request);
    if ("response" in gate) return gate.response;

    const { id } = await params;
    const contactId = Number.parseInt(id);

    if (Number.isNaN(contactId) || contactId <= 0) {
      return HttpResponse.sendBadRequest('ID de contacto inválido');
    }

    const [contact, contactError] = await CatchError(
      prisma.contacts.findUnique({
        where: {
          id: contactId,
          isDeleted: false
        },
        include: {
          _count: { select: { messages: true } }, // 👈 contador por relación
        }
      })
    );

    if (contactError) {
      console.error('Error fetching contact:', contactError);
      return HttpResponse.sendServerError('Error al obtener el contacto', contactError);
    }

    if (!contact) {
      return HttpResponse.sendNotFound('Contacto no encontrado');
    }

    if (contact.isDeleted === true) {
      return HttpResponse.sendNotFound('Contacto eliminado');
    }

    const { ...mainData } = contact;

    const responseData = {
      ...mainData,
    };

    return HttpResponse.sendSuccess(
      { Data: responseData },
      'Contacto obtenido exitosamente'
    );

  } catch (error) {
    console.error('Error fetching contacto:', error);
    return HttpResponse.sendServerError('Error interno del servidor al obtener el contacto', error);
  }
}