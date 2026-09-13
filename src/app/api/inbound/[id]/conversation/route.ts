// src/app/api/inbound/[id]/conversation/route.ts
// Devuelve la conversacion completa con el numero que escribio el mensaje `id`:
// lo que esa persona ha ido escribiendo y lo que se le ha respondido.
//
// Va aparte del listado general porque la pantalla de entrantes ensena una fila
// por mensaje, y para contestar hace falta ver el HILO: sin lo anterior, quien
// responde no sabe de que le estan hablando.
//
// GET /api/inbound/123/conversation
import { NextRequest } from "next/server";
import { requireAuth } from "@/src/lib/authz";
import prisma from "@/src/lib/prisma";
import { HttpResponse } from "@/src/utils/httpResponse";
import { cargarConversacion, MAX_CARACTERES_RESPUESTA } from "@/src/lib/conversacion";
import { ventanaEnPalabras } from "@/src/lib/ventana-24h";

export const runtime = "nodejs";

export async function GET(
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
      select: { id: true, fromPhone: true },
    });
    if (!entrante) {
      return HttpResponse.sendNotFound("Mensaje entrante no encontrado");
    }

    const conversacion = await cargarConversacion(entrante.fromPhone);

    return HttpResponse.sendSuccess(
      {
        Data: {
          ...conversacion,
          // El texto en palabras se calcula AQUI, con el reloj del servidor.
          // Si lo calculara el navegador, un telefono con la hora mal puesta
          // diria "quedan 9 horas" sobre una ventana ya cerrada, y la persona
          // escribiria una respuesta larga para nada.
          ventanaEnPalabras: ventanaEnPalabras(conversacion.ventana.restanteMs),
          maxCaracteres: MAX_CARACTERES_RESPUESTA,
        },
      },
      "Conversación obtenida"
    );
  } catch (error) {
    return HttpResponse.sendServerError("Error al obtener la conversación", error);
  }
}
