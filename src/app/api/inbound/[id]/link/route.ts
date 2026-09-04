// src/app/api/inbound/[id]/link/route.ts
// Vincula un mensaje entrante HUERFANO (contactId = null) al contacto que
// tenga ese mismo telefono.
//
// Caso real: alguien escribe "quiero darme de baja" desde un numero que en su
// momento no estaba en la agenda, o que se registro despues. El mensaje quedo
// guardado sin contacto; con esto el operador lo asocia desde la pantalla de
// entrantes, sin tocar la base de datos.
//
// POST /api/inbound/123/link
import { NextRequest } from "next/server";
import { requireAuth } from "@/src/lib/authz";
import prisma from "@/src/lib/prisma";
import { HttpResponse } from "@/src/utils/httpResponse";
import { findContactByPhone } from "@/src/lib/consent";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireAuth(req);
    if ("response" in gate) return gate.response;

    const { id } = await params;
    const inboundId = Number(id);
    if (!Number.isInteger(inboundId) || inboundId <= 0) {
      return HttpResponse.sendBadRequest("Id inválido");
    }

    const entrante = await prisma.inboundMessages.findUnique({
      where: { id: inboundId },
      select: { id: true, fromPhone: true, contactId: true },
    });
    if (!entrante) {
      return HttpResponse.sendNotFound("Mensaje entrante no encontrado");
    }

    // `findContactByPhone` normaliza el prefijo "whatsapp:" y descarta los
    // contactos eliminados, igual que hace el webhook al recibir el mensaje.
    const contacto = await findContactByPhone(entrante.fromPhone);
    if (!contacto) {
      return HttpResponse.sendNotFound(
        `No hay ningún contacto con el teléfono ${entrante.fromPhone}. ` +
          "Crea primero el contacto con ese número y vuelve a intentarlo."
      );
    }

    // La pantalla puede mandar `{ contactId }` con el contacto que eligio el
    // operador. Se acepta solo como CONFIRMACION: el vinculo se decide por el
    // telefono, nunca por lo que venga en el cuerpo. Vincular un mensaje a un
    // contacto con otro numero falsearia la prueba de quien escribio que.
    const cuerpo = await req.json().catch(() => ({}));
    const contactIdPedido = Number((cuerpo as { contactId?: unknown })?.contactId);
    if (Number.isInteger(contactIdPedido) && contactIdPedido > 0 && contactIdPedido !== contacto.id) {
      return HttpResponse.sendBadRequest(
        `El mensaje llegó desde ${entrante.fromPhone}, que pertenece a otro contacto. ` +
          "Solo puede vincularse al contacto que tiene ese mismo número."
      );
    }

    if (entrante.contactId === contacto.id) {
      return HttpResponse.sendSuccess(
        { Data: { id: entrante.id, contactId: contacto.id } },
        "El mensaje ya estaba vinculado a este contacto"
      );
    }

    // Solo se toca `contactId`: `handledAs` conserva lo que REALMENTE se hizo
    // cuando llego el mensaje (p. ej. "contacto_desconocido"), que es el dato
    // historico. Aplicar la baja o el alta sigue siendo un acto explicito desde
    // la ficha del contacto.
    const actualizado = await prisma.inboundMessages.update({
      where: { id: inboundId },
      data: { contactId: contacto.id },
      include: { contact: { select: { id: true, name: true, phone: true } } },
    });

    return HttpResponse.sendSuccess(
      { Data: actualizado },
      `Mensaje vinculado a ${contacto.name ?? contacto.phone}`
    );
  } catch (error) {
    return HttpResponse.sendServerError("Error al vincular el mensaje entrante", error);
  }
}
