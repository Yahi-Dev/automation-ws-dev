// src/app/api/inbound/[id]/reply/route.ts
// Responde con texto libre a quien escribio el mensaje entrante `id`.
//
// Por que hace falta: el numero que se registra en Twilio como remitente de
// WhatsApp DEJA DE FUNCIONAR en la aplicacion normal de WhatsApp. A partir de
// ese momento solo se puede escribir por la API. Sin este endpoint, cualquiera
// que contestara a una campana se quedaba sin respuesta: la app lo ensenaba en
// pantalla y no habia forma de decirle nada.
//
// La regla que manda aqui NO es nuestra, es de WhatsApp: el texto libre solo se
// admite durante las 24 h siguientes al ultimo mensaje de esa persona. Fuera de
// ese plazo hay que usar una plantilla aprobada, que es lo que hace el modulo
// de campanas. Ver src/lib/ventana-24h.ts.
//
// POST /api/inbound/123/reply   body: { texto: string }
import { NextRequest } from "next/server";
import { requireAuth, actorOf } from "@/src/lib/authz";
import { enforceApiLimit } from "@/src/lib/api-rate-limit";
import prisma from "@/src/lib/prisma";
import { HttpResponse } from "@/src/utils/httpResponse";
import { cargarConversacion, MAX_CARACTERES_RESPUESTA } from "@/src/lib/conversacion";
import { ventanaEnPalabras } from "@/src/lib/ventana-24h";
import { explicarErrorWhatsApp } from "@/src/lib/errores-whatsapp";
import {
  sendWhatsAppMessage,
  getStatusCallbackUrl,
  isValidE164,
  mapTwilioStatus,
} from "@/src/lib/whatsapp";

export const runtime = "nodejs";

/** Recorta al tope de la columna `errorMessage` sin romper la fila. */
const MAX_ERROR = 500;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireAuth(req);
    if ("response" in gate) return gate.response;
    const actor = actorOf(gate.user);

    const { id } = await params;
    const inboundId = Number(id);
    if (!Number.isInteger(inboundId) || inboundId <= 0) {
      return HttpResponse.sendBadRequest("Id inválido");
    }

    // El limite se cobra ANTES de tocar Twilio: esta ruta gasta dinero real por
    // cada llamada.
    const limite = await enforceApiLimit("whatsapp-reply", actor);
    if (limite) return limite;

    const cuerpo = await req.json().catch(() => ({}));
    const texto = String((cuerpo as { texto?: unknown })?.texto ?? "").trim();

    if (!texto) {
      return HttpResponse.sendBadRequest("Escribe un mensaje antes de enviarlo.");
    }
    if (texto.length > MAX_CARACTERES_RESPUESTA) {
      return HttpResponse.sendBadRequest(
        `El mensaje es demasiado largo. El máximo son ${MAX_CARACTERES_RESPUESTA} caracteres ` +
          `y escribiste ${texto.length}. Acórtalo o mándalo en dos mensajes.`
      );
    }

    const entrante = await prisma.inboundMessages.findUnique({
      where: { id: inboundId },
      select: { id: true, fromPhone: true },
    });
    if (!entrante) {
      return HttpResponse.sendNotFound("Mensaje entrante no encontrado");
    }

    if (!isValidE164(entrante.fromPhone)) {
      return HttpResponse.sendBadRequest(
        `El número ${entrante.fromPhone} no tiene un formato válido, así que no se le puede escribir.`
      );
    }

    // Se vuelve a mirar en el servidor lo que la pantalla ya habia mirado. No es
    // redundante: entre que se abrio el dialogo y se pulso Enviar puede haber
    // pasado media hora, y la ventana pudo cerrarse mientras tanto.
    const conversacion = await cargarConversacion(entrante.fromPhone);

    if (!conversacion.ventana.abierta) {
      return HttpResponse.sendBadRequest(
        "Ya no se puede responder a esta persona con un mensaje escrito por ti. " +
          "WhatsApp solo lo permite durante las 24 horas siguientes al último mensaje que ella te " +
          "envió, y ese plazo terminó. Para volver a escribirle tienes que mandarle una campaña " +
          "con una plantilla aprobada, o esperar a que te escriba otra vez."
      );
    }

    // Quien pidio la baja no recibe mas mensajes, punto. Es la promesa que le
    // hizo la app al darla de baja, y el motivo por el que existe la pantalla de
    // consentimiento.
    if (conversacion.contacto?.consentState === "opted_out") {
      return HttpResponse.sendBadRequest(
        `${conversacion.contacto.name} pidió que no le escribieras más, así que la app no le manda ` +
          "nada. Si vuelve a escribir la palabra ALTA se da de alta sola y entonces sí podrás responderle."
      );
    }

    // La fila se crea ANTES de enviar y a proposito. Si se creara despues y la
    // base de datos fallara justo ahi, el mensaje habria salido (y se habria
    // cobrado) sin quedar registrado en ningun sitio: nadie sabria que esa
    // persona ya fue contestada, y le contestarian otra vez.
    const fila = await prisma.outboundReplies.create({
      data: {
        toPhone: conversacion.telefono,
        body: texto,
        status: "queued",
        contactId: conversacion.contacto?.id ?? null,
        inboundId: entrante.id,
        sentBy: actor,
      },
      select: { id: true },
    });

    try {
      const statusCallback = await getStatusCallbackUrl();
      const enviado = await sendWhatsAppMessage({
        to: conversacion.telefono,
        body: texto,
        statusCallback,
      });

      await prisma.outboundReplies.update({
        where: { id: fila.id },
        data: {
          providerSid: enviado?.sid ?? null,
          // Twilio devuelve "queued"/"accepted" al aceptar el mensaje; el
          // estado real llega despues por el statusCallback.
          status: mapTwilioStatus(enviado?.status) ?? "queued",
        },
      });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "Error desconocido";
      const codigo = (error as { code?: unknown })?.code;

      // Lo que se guarda en la fila es la explicacion EN CRISTIANO, no el texto
      // en ingles de Twilio: es lo que se va a leer bajo la burbuja roja en la
      // conversacion, meses despues, cuando nadie recuerde que paso.
      const explicacion = explicarErrorWhatsApp(codigo);

      await prisma.outboundReplies
        .update({
          where: { id: fila.id },
          data: {
            status: "failed",
            errorCode: codigo != null ? String(codigo).slice(0, 32) : null,
            errorMessage: explicacion.slice(0, MAX_ERROR),
          },
        })
        .catch(() => null);

      // El detalle tecnico se registra en el servidor; a la pantalla solo va la
      // explicacion.
      console.error("Fallo al enviar una respuesta de WhatsApp", {
        replyId: fila.id,
        codigo,
        mensaje,
      });

      return HttpResponse.sendBadRequest(explicacion);
    }

    // Se devuelve la conversacion ya actualizada: la pantalla la pinta tal cual
    // y no tiene que volver a preguntar.
    const actualizada = await cargarConversacion(entrante.fromPhone);

    return HttpResponse.sendSuccess(
      {
        Data: {
          ...actualizada,
          ventanaEnPalabras: ventanaEnPalabras(actualizada.ventana.restanteMs),
          maxCaracteres: MAX_CARACTERES_RESPUESTA,
        },
      },
      "Respuesta enviada"
    );
  } catch (error) {
    return HttpResponse.sendServerError("Error al enviar la respuesta", error);
  }
}
