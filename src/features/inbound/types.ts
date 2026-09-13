// src/features/inbound/types.ts
// Tipos de los mensajes ENTRANTES de WhatsApp (tabla `inbound_messages`).

/**
 * Qué se hizo con el mensaje entrante cuando llegó al webhook.
 * Son los mismos valores documentados en el modelo `inboundMessages` de Prisma.
 */
export type InboundHandledAs =
  | "opt_in"
  | "opt_out"
  | "ninguno"
  | "contacto_desconocido";

/** Contacto asociado al entrante (null cuando el número no está registrado). */
export interface InboundContact {
  id: number;
  name: string;
  phone: string;
}

export interface InboundMessageType {
  id: number;
  /** Teléfono del remitente en E.164, ya sin el prefijo "whatsapp:". */
  fromPhone: string;
  body: string;
  providerSid: string | null;
  /** Ver `InboundHandledAs`. Se tipa como string porque el valor lo escribe el backend. */
  handledAs: string;
  /** Palabra clave detectada (baja, alta, stop...), si la hubo. */
  keyword: string | null;
  contactId: number | null;
  receivedAt: Date;
  contact: InboundContact | null;
}

/**
 * Fila que consume la tabla. El nombre y el teléfono del contacto se suben al
 * primer nivel a propósito: el buscador global de DataTable recorre los valores
 * PLANOS de la fila, así que un `contact` anidado se serializaría como
 * "[object Object]" y buscar por nombre o teléfono del contacto no encontraría
 * nada. Mismo criterio que `ConsentEventRow`.
 */
export interface InboundMessageRow extends InboundMessageType {
  contactName: string;
  contactPhone: string;
}

/** Filtros aceptados por GET /api/inbound. */
export interface InboundFilters {
  handledAs?: string;
  contactId?: number;
}

/* ------------------------------------------------------------------ *
 * Conversación: el hilo con UNA persona y la ventana de 24 h.
 *
 * Las fechas llegan como texto (JSON no tiene fechas) y se convierten donde
 * se pintan. La ventana NO se recalcula en el navegador: la calcula el
 * servidor y aquí solo se muestra, porque un teléfono con la hora mal puesta
 * diría que se puede responder cuando ya no se puede.
 * ------------------------------------------------------------------ */

/** Un mensaje del hilo, venga de quien venga. */
export interface MensajeConversacion {
  id: number;
  /** "entrante" = lo escribió la persona; "saliente" = lo escribió la app. */
  direccion: "entrante" | "saliente";
  texto: string;
  /** ISO 8601. */
  fecha: string;
  /** Solo en los salientes: queued | sent | delivered | read | failed | undelivered. */
  estado?: string;
  errorMensaje?: string | null;
  enviadoPor?: string;
}

/** Estado de la ventana de 24 h, tal y como lo calculó el servidor. */
export interface EstadoVentanaDTO {
  abierta: boolean;
  ultimoEntranteAt: string | null;
  restanteMs: number;
  expiraAt: string | null;
}

export interface ConversacionDTO {
  telefono: string;
  contacto: { id: number; name: string; phone: string; consentState: string } | null;
  ventana: EstadoVentanaDTO;
  mensajes: MensajeConversacion[];
  /** "quedan 3 horas y 20 minutos", ya en palabras. */
  ventanaEnPalabras: string;
  maxCaracteres: number;
}
