// src/lib/conversacion.ts
//
// Reconstruye la conversacion con UN numero de telefono: lo que esa persona
// escribio (`inbound_messages`) y lo que se le respondio desde la app
// (`outbound_replies`), en orden.
//
// Se consulta por TELEFONO y no por contacto a proposito: la mitad de las
// conversaciones utiles empiezan con alguien que todavia no esta en la agenda.
// Si la clave fuera el contacto, esas conversaciones no existirian.
import prisma from "./prisma";
import { normalizeInboundPhone } from "./consent";
import { estadoVentana, type EstadoVentana } from "./ventana-24h";

/** Cuantos mensajes se traen de cada lado. Suficiente para cualquier charla real. */
const MAX_POR_LADO = 50;

/** Tope de caracteres de una respuesta (limite del cuerpo de WhatsApp en Twilio). */
export const MAX_CARACTERES_RESPUESTA = 1600;

export type MensajeConversacion = {
  id: number;
  /** "entrante" = lo escribio la persona; "saliente" = lo escribio la app. */
  direccion: "entrante" | "saliente";
  texto: string;
  fecha: Date;
  /** Solo en los salientes: queued | sent | delivered | read | failed | undelivered. */
  estado?: string;
  /** Solo en los salientes que fallaron. */
  errorMensaje?: string | null;
  /** Solo en los salientes: quien pulso Responder. */
  enviadoPor?: string;
};

export type Conversacion = {
  telefono: string;
  contacto: { id: number; name: string; phone: string; consentState: string } | null;
  ventana: EstadoVentana;
  mensajes: MensajeConversacion[];
};

/**
 * Carga la conversacion completa con un numero.
 *
 * La ventana de 24 h se calcula con el ultimo entrante REAL de la tabla, no con
 * el mensaje desde el que se abrio la pantalla: si la persona ha vuelto a
 * escribir mientras tanto, la ventana es la nueva.
 */
export async function cargarConversacion(
  telefonoCrudo: string,
  ahora: Date = new Date()
): Promise<Conversacion> {
  const telefono = normalizeInboundPhone(telefonoCrudo);

  const [entrantes, salientes, contacto] = await Promise.all([
    prisma.inboundMessages.findMany({
      where: { fromPhone: telefono },
      orderBy: { receivedAt: "desc" },
      take: MAX_POR_LADO,
      select: { id: true, body: true, receivedAt: true },
    }),
    prisma.outboundReplies.findMany({
      where: { toPhone: telefono },
      orderBy: { sentAt: "desc" },
      take: MAX_POR_LADO,
      select: {
        id: true,
        body: true,
        sentAt: true,
        status: true,
        errorMessage: true,
        sentBy: true,
      },
    }),
    prisma.contacts.findFirst({
      where: { isDeleted: false, phone: telefono },
      select: { id: true, name: true, phone: true, consentState: true },
    }),
  ]);

  const mensajes: MensajeConversacion[] = [
    ...entrantes.map((e) => ({
      id: e.id,
      direccion: "entrante" as const,
      texto: e.body,
      fecha: e.receivedAt,
    })),
    ...salientes.map((s) => ({
      id: s.id,
      direccion: "saliente" as const,
      texto: s.body,
      fecha: s.sentAt,
      estado: s.status,
      errorMensaje: s.errorMessage,
      enviadoPor: s.sentBy,
    })),
  ].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

  // `entrantes` viene ordenado de mas nuevo a mas viejo: el primero es el ultimo
  // que llego.
  const ultimoEntranteAt = entrantes[0]?.receivedAt ?? null;

  return {
    telefono,
    contacto,
    ventana: estadoVentana(ultimoEntranteAt, ahora),
    mensajes,
  };
}
