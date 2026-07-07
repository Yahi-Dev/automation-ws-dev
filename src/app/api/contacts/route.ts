import { contactCreateSchema, contactUpdateSchema } from "@/src/features/contacts/schema/validations"
import { requireAuth } from "@/src/lib/authz"
import prisma from "@/src/lib/prisma"
import { redis } from "@/src/lib/redis"
import { CatchError } from "@/src/utils/catchError"
import { HttpResponse } from "@/src/utils/httpResponse"
import { parsePagination, keysetArgs } from "@/src/lib/pagination"
import { Prisma } from "@prisma/client"
import { NextRequest } from "next/server"

const CACHE_KEY = "contacts-cache";

export async function GET(req: Request) {
  try {
    const gate = await requireAuth(req);
    if ("response" in gate) return gate.response;

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')?.trim() || ''
    const { limit, cursor } = parsePagination(searchParams)

    const where: Prisma.contactsWhereInput = {
      isDeleted: false,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    };

    const [contacts, error] = await CatchError(
      prisma.contacts.findMany({
        where,
        include: {
          _count: { select: { messages: true } }, // 👈 contador por relación
        },
        ...keysetArgs(limit, cursor),
      })
    );

    if (error) {
      console.error('Error fetching contacts:', error);
      return HttpResponse.sendServerError('Error al obtener los contactos', error);
    }

    // Sin caché de clave fija: el listado varía por búsqueda/cursor y ya está acotado.
    const data = (contacts ?? []).map(c => ({
      ...c,
      messagesCount: c._count?.messages ?? 0,
    }));

    return HttpResponse.sendSuccess(
      {
        Data: data,
        Total: data.length,
      },
      'Contactos obtenidos exitosamente'
    );
  } catch (error: unknown) {
    console.error('Error fetching contacts:', error);
    return HttpResponse.sendServerError('Error al obtener los contactos', error);
  }
}

export async function POST(req: Request) {
  try {
    const gate = await requireAuth(req);
    if ("response" in gate) return gate.response;

    const body = await req.json();
    const parsed = contactCreateSchema.safeParse(body);

    if (!parsed.success) {
      const errorDetails = parsed.error.flatten();
      console.error("Validation error:", errorDetails);
      return HttpResponse.sendBadRequest('Datos inválidos', {
        ...errorDetails,
        message: "Por favor verifica los datos ingresados"
      });
    }

    const [exists, existsError] = await CatchError(
      prisma.contacts.findFirst({
        where: {
          name: parsed.data.name,
          isDeleted: false
        }
      })
    );

    if (existsError) {
      return HttpResponse.sendServerError('Error al verificar contacto existente', existsError);
    }

    if (exists) {
      return HttpResponse.sendBadRequest('Ya existe un contacto con ese nombre');
    }

    const data = parsed.data;
    const [created, createError] = await CatchError(
      prisma.contacts.create({
        data: {
          name: data.name ?? "",
          phone: data.phone ?? "",
          country: data.country ?? null,
          whatsapp: data.whatsapp ?? false,
          createdBy: gate.user.email ?? "desconocido",
          createdAt: new Date(),
        }
      })
    );

    if (createError) {
      return HttpResponse.sendServerError('Error al crear el contacto', createError);
    }

    await redis.del(CACHE_KEY);

    return HttpResponse.sendCreated(
      { Data: created },
      "Contacto creado exitosamente"
    );
  } catch (error) {
    console.error("Server error:", error);
    return HttpResponse.sendServerError('Error interno del servidor', error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const gate = await requireAuth(request);
    if ("response" in gate) return gate.response;

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));

    if (!Number.isInteger(id) || id <= 0) {
      return HttpResponse.sendBadRequest('Id inválido');
    }

    const body = await request.json();
    const parsed = contactUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const errorDetails = parsed.error.flatten();
      console.error("Validation error:", errorDetails);
      return HttpResponse.sendBadRequest('Datos inválidos', {
        ...errorDetails,
        message: "Por favor verifica los datos ingresados"
      });
    }

    const [exists, existsError] = await CatchError(
      prisma.contacts.findFirst({
        where: {
          name: parsed.data.name,
          id: { not: id },
          isDeleted: false
        }
      })
    );

    if (existsError) {
      return HttpResponse.sendServerError('Error al verificar contacto existente', existsError);
    }

    if (exists) {
      return HttpResponse.sendBadRequest('Ya existe otro contacto con ese nombre');
    }

    const user = {
      name: gate.user.name ?? "",
      email: gate.user.email ?? "",
      avatar: gate.user.image ?? "",
    };

    const data = parsed.data;
    const [updated, updateError] = await CatchError(
      prisma.contacts.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
          updatedBy: user.email,
        }
      })
    );

    if (updateError) {
      if (updateError instanceof Prisma.PrismaClientKnownRequestError) {
        if (updateError.code === 'P2025') {
          return HttpResponse.sendNotFound('Contacto no encontrado');
        }
      }
      return HttpResponse.sendServerError('Error al actualizar el contacto', updateError);
    }

    await redis.del(CACHE_KEY);

    return HttpResponse.sendSuccess(
      { Data: updated },
      "Contacto actualizado exitosamente"
    );
  } catch (error) {
    return HttpResponse.sendServerError('Error interno del servidor', error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const gate = await requireAuth(request);
    if ("response" in gate) return gate.response;

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    const id = idParam === null ? null : Number(idParam);

    if (id === null || !Number.isInteger(id) || id <= 0) {
      return HttpResponse.sendBadRequest('Id inválido');
    }

    const [contact, contactError] = await CatchError(
      prisma.contacts.findUnique({
        select: { id: true, name: true },
        where: { id }
      })
    );

    if (contactError) {
      return HttpResponse.sendServerError('Error al buscar contacto', contactError);
    }

    if (!contact) {
      return HttpResponse.sendNotFound('Contacto no encontrado');
    }

    const [msgCount, msgCountErr] = await CatchError(
      prisma.message.count({
        where: { contactId: id }, // o el campo que tengas como FK
      })
    );

    if (msgCountErr) {
      return HttpResponse.sendServerError("Error al verificar mensajes asociados", msgCountErr);
    }

    if ((msgCount ?? 0) > 0) {
      return HttpResponse.sendServerError(
        `No se puede eliminar el contacto: tiene ${msgCount} mensaje(s) asociado(s).`
      );
    }

    // Soft-delete: marca isDeleted en vez de borrar físicamente (preserva historial).
    const [, deleteError] = await CatchError(
      prisma.contacts.update({ where: { id }, data: { isDeleted: true } })
    );

    if (deleteError) {
      return HttpResponse.sendServerError('Error al eliminar el contacto', deleteError);
    }

    await redis.del(CACHE_KEY);

    return HttpResponse.sendSuccess(
      {},
      `Contacto "${contact.name}" eliminado correctamente`
    );

  } catch (error) {
    console.error('Error deleting contact:', error);
    return HttpResponse.sendServerError('Error interno del servidor al eliminar el contacto', error);
  }
}