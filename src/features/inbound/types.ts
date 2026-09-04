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
