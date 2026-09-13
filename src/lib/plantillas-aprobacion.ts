// src/lib/plantillas-aprobacion.ts
//
// El estado de aprobación de una plantilla en WhatsApp.
//
// POR QUE IMPORTA TANTO
//
// Para escribirle a alguien que NO te ha escrito en las últimas 24 horas,
// WhatsApp exige una plantilla que ellos hayan revisado y aprobado. No es una
// recomendación: es la única forma de que el mensaje salga.
//
// La app crea una plantilla por cada campaña, pero nunca la mandaba a aprobar y
// nunca comprobaba si lo estaba. Con el número de pruebas eso no se nota, porque
// el sandbox no lo exige. Con un número real, cada campaña saldría con una
// plantilla sin aprobar y Meta la rechazaría entera — un envío a 3.000 personas
// fallando 3.000 veces, cobrando los intentos, y hundiendo la calificación de
// calidad del número por el camino.
//
// Este archivo es la pieza que faltaba: preguntar a WhatsApp cómo va, y guardar
// la respuesta.
import prisma from "./prisma";
import { contentFetch } from "./twilio-content";

/** Los cuatro estados que devuelve WhatsApp. */
export const ESTADOS_APROBACION = ["received", "pending", "approved", "rejected"] as const;
export type EstadoAprobacion = (typeof ESTADOS_APROBACION)[number];

/** El SID de una plantilla de Twilio. Se valida porque se interpola en una URL. */
export const SID_PLANTILLA = /^HX[0-9a-fA-F]{32}$/;

export type ResultadoSincronizacion = {
  estado: EstadoAprobacion | null;
  categoria: string | null;
  motivoRechazo: string | null;
};

/**
 * Pregunta a WhatsApp por el estado de una plantilla y lo guarda.
 *
 * Devuelve `estado: null` cuando no se pudo averiguar (red caída, plantilla que
 * ya no existe). Quien llama decide qué hacer con eso; aquí NO se inventa un
 * estado, porque dar por aprobada una plantilla que no lo está es exactamente
 * el fallo que este archivo existe para evitar.
 */
export async function sincronizarAprobacion(
  sid: string
): Promise<ResultadoSincronizacion> {
  if (!SID_PLANTILLA.test(sid)) {
    return { estado: null, categoria: null, motivoRechazo: null };
  }

  const respuesta = (await contentFetch(`/Content/${sid}/ApprovalRequests`)) as {
    whatsapp?: { status?: string; category?: string; rejection_reason?: string };
  };

  const wa = respuesta?.whatsapp ?? {};
  const crudo = String(wa.status ?? "").toLowerCase();
  const estado = (ESTADOS_APROBACION as readonly string[]).includes(crudo)
    ? (crudo as EstadoAprobacion)
    : null;

  const categoria = wa.category ? String(wa.category).toUpperCase() : null;
  const motivoRechazo = wa.rejection_reason ?? null;

  if (estado) {
    await prisma.twilioContentTemplate
      .updateMany({
        where: { sid },
        data: {
          approvalStatus: estado,
          // `undefined` deja el valor anterior; `null` lo borraría.
          category: categoria ?? undefined,
          rejectionReason: motivoRechazo,
        },
      })
      .catch(() => {});
  }

  return { estado, categoria, motivoRechazo };
}

/**
 * Manda una plantilla a aprobación de WhatsApp.
 *
 * `categoria` importa de verdad: mandar contenido promocional como UTILITY es
 * una infracción de las normas de Meta, y lo que se gana (que salga más barato)
 * se paga con rechazos y con la calificación del número. Las campañas de esta
 * app son promocionales, así que van como MARKETING.
 */
export async function enviarAAprobacion(
  sid: string,
  nombre: string,
  categoria: "MARKETING" | "UTILITY" | "AUTHENTICATION" = "MARKETING"
): Promise<void> {
  if (!SID_PLANTILLA.test(sid)) {
    throw new Error("Identificador de plantilla no válido");
  }

  await contentFetch(`/Content/${sid}/ApprovalRequests/whatsapp`, {
    method: "POST",
    body: JSON.stringify({ name: nombre, category: categoria }),
  });

  // Solo el estado. La categoría autoritativa la fija la sincronización con lo
  // que diga WhatsApp: fiarse de la que se pidió permitiría saltarse el filtro
  // de plantillas de marketing mandando "UTILITY" a mano.
  await prisma.twilioContentTemplate
    .updateMany({ where: { sid }, data: { approvalStatus: "pending" } })
    .catch(() => {});
}

/**
 * El aviso que lee una persona cuando su campaña no puede salir todavía.
 *
 * Nada de "approvalStatus: received". Tiene que decir qué pasa, de quién
 * depende, y qué hacer — o que no hay nada que hacer y solo toca esperar.
 */
export function explicarEstadoPlantilla(
  estado: string | null | undefined,
  motivoRechazo?: string | null
): string {
  switch (estado) {
    case "approved":
      return "El texto de esta campaña ya está aprobado por WhatsApp.";

    case "pending":
      return (
        "WhatsApp todavía está revisando el texto de esta campaña. Suele tardar unos minutos, " +
        "a veces hasta un día. No hay que hacer nada: en cuanto lo aprueben, la campaña sale sola."
      );

    case "received":
      return (
        "El texto de esta campaña aún no se ha enviado a revisar. WhatsApp tiene que aprobar todo " +
        "mensaje que se le escriba a alguien que no te ha escrito primero. Ábrela y vuelve a guardarla " +
        "para mandarla a revisión."
      );

    case "rejected":
      return (
        "WhatsApp rechazó el texto de esta campaña y no va a dejar que se envíe." +
        (motivoRechazo ? ` El motivo que dan es: "${motivoRechazo}".` : "") +
        " Crea una campaña nueva cambiando el texto: suele ser por prometer cosas, meter mayúsculas de más " +
        "o parecerse demasiado a publicidad no pedida."
      );

    default:
      return (
        "No se sabe si WhatsApp aprobó el texto de esta campaña, y sin esa aprobación no se puede enviar " +
        "a quien no te haya escrito antes. Entra en Plantillas y pulsa Actualizar estado."
      );
  }
}
