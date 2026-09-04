import { contactCreateSchema, contactUpdateSchema } from "@/src/features/contacts/schema/validations"
import { requireAuth, ownedWhere } from "@/src/lib/authz"
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

    // Se necesita el telefono actual para saber si cambia (ver abajo).
    // El `where` lleva ya la condicion de propiedad: si el contacto es de otro
    // usuario, esta lectura no lo encuentra y respondemos 404 sin revelar que existe.
    const [current, currentError] = await CatchError(
      prisma.contacts.findFirst({
        where: ownedWhere(gate.user, { id, isDeleted: false }),
        select: { id: true, phone: true },
      })
    );

    if (currentError) {
      return HttpResponse.sendServerError('Error al verificar el contacto', currentError);
    }
    if (!current) {
      return HttpResponse.sendNotFound('Contacto no encontrado');
    }

    // Cambiar el telefono INVALIDA el consentimiento: el opt-in lo dio el
    // titular del numero anterior, no el del nuevo. Sin esto se podia heredar
    // un opt-in a un numero que nunca consintio, y el gate de envio lo dejaba pasar.
    const phoneChanged =
      typeof data.phone === "string" && data.phone.trim() !== current.phone;

    const [updated, updateError] = await CatchError(
      prisma.$transaction(async (tx) => {
        // La condicion de propiedad viaja en la MISMA sentencia que la escritura.
        const res = await tx.contacts.updateMany({
          where: ownedWhere(gate.user, { id, isDeleted: false }),
          data: {
            ...data,
            updatedAt: new Date(),
            updatedBy: user.email,
            ...(phoneChanged
              ? {
                  consentState: "unknown",
                  consentSource: null,
                  consentAt: null,
                  optOutAt: null,
                  optOutKeyword: null,
                }
              : {}),
          },
        });

        if (res.count === 0) return null;

        if (phoneChanged) {
          await tx.consentEvents.create({
            data: {
              contactId: id,
              event: "opt_out",
              source: "manual",
              raw:
                "Consentimiento invalidado automaticamente: el telefono del contacto cambio " +
                `de ${current.phone} a ${data.phone}.`,
              createdBy: user.email,
            },
          });
        }

        return tx.contacts.findUnique({ where: { id } });
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

    if (!updated) {
      return HttpResponse.sendNotFound('Contacto no encontrado');
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

    // El `where` incluye la condicion de propiedad: un contacto de otro usuario
    // responde 404, igual que uno inexistente (no se revela que existe).
    const [contact, contactError] = await CatchError(
      prisma.contacts.findFirst({
        select: { id: true, name: true },
        where: ownedWhere(gate.user, { id, isDeleted: false }),
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
      // Es una regla de negocio, no un fallo del servidor: 400, no 500.
      // (La ruta de campanas ya devolvia 400 en el caso analogo.)
      return HttpResponse.sendBadRequest(
        `No se puede eliminar el contacto: tiene ${msgCount} mensaje(s) asociado(s).`
      );
    }

    // Soft-delete: marca isDeleted en vez de borrar físicamente (preserva historial).
    // `updateMany` aplica la propiedad en la misma sentencia que la escritura.
    const [deleted, deleteError] = await CatchError(
      prisma.contacts.updateMany({
        where: ownedWhere(gate.user, { id, isDeleted: false }),
        data: { isDeleted: true, updatedBy: gate.user.email ?? "desconocido" },
      })
    );

    if (deleteError) {
      return HttpResponse.sendServerError('Error al eliminar el contacto', deleteError);
    }

    if (!deleted || deleted.count === 0) {
      return HttpResponse.sendNotFound('Contacto no encontrado');
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