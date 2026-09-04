// src/app/api/inbound/route.ts
// Listado de los mensajes ENTRANTES de WhatsApp ya persistidos.
//
// El webhook de entrada (src/app/api/whatsapp/inbound/route.ts) guarda todo lo
// que llega, incluido lo que viene de numeros que no estan en la agenda. Sin
// este endpoint esa tabla seria de solo escritura: nadie podria ver que una
// persona pidio la baja desde un numero desconocido.
//
// GET /api/inbound?handledAs=...&contactId=...&limit=...&cursor=...
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAuth } from "@/src/lib/authz";
import prisma from "@/src/lib/prisma";
import { HttpResponse } from "@/src/utils/httpResponse";
import { parsePagination, keysetArgs } from "@/src/lib/pagination";

export const runtime = "nodejs";

/** Valores admitidos en la columna `handledAs`. */
const TRATAMIENTOS = ["opt_in", "opt_out", "ninguno", "contacto_desconocido"] as const;

export async function GET(req: NextRequest) {
  try {
    const gate = await requireAuth(req);
    if ("response" in gate) return gate.response;

    const { searchParams } = new URL(req.url);

    // Filtro por tratamiento. Si viene un valor que no existe se avisa en vez
    // de ignorarlo en silencio: una pantalla filtrando mal mostraria "no hay
    // mensajes" y haria pensar que no llego nada.
    const handledAs = searchParams.get("handledAs")?.trim();
    if (handledAs && !(TRATAMIENTOS as readonly string[]).includes(handledAs)) {
      return HttpResponse.sendBadRequest(
        `handledAs debe ser uno de: ${TRATAMIENTOS.join(", ")}`
      );
    }

    const contactIdRaw = searchParams.get("contactId");
    let contactId: number | undefined;
    if (contactIdRaw) {
      const n = Number(contactIdRaw);
      if (!Number.isInteger(n) || n <= 0) {
        return HttpResponse.sendBadRequest("contactId inválido");
      }
      contactId = n;
    }

    const where: Prisma.inboundMessagesWhereInput = {
      ...(handledAs ? { handledAs } : {}),
      ...(contactId ? { contactId } : {}),
    };

    const { limit, cursor } = parsePagination(searchParams);

    // `data` va como ARREGLO a proposito: es lo que espera el envelope de
    // HttpResponse y el helper de cliente fetchAllPages (el cursor de la
    // siguiente pagina es el id del ultimo elemento).
    const entrantes = await prisma.inboundMessages.findMany({
      where,
      include: { contact: { select: { id: true, name: true, phone: true } } },
      ...keysetArgs(limit, cursor),
    });

    return HttpResponse.sendSuccess(
      { Data: entrantes, Total: entrantes.length },
      "Mensajes entrantes obtenidos"
    );
  } catch (error) {
    return HttpResponse.sendServerError("Error al obtener los mensajes entrantes", error);
  }
}
