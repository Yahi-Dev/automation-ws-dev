// src/features/consent/types.ts
// Tipos del historial de consentimiento (opt-in / opt-out).
// Reflejan exactamente lo que devuelve GET /api/consent-events.

export type ConsentEventType = "opt_in" | "opt_out";

export type ConsentState = "opted_in" | "opted_out" | "unknown";

/** Contacto embebido en cada evento (viene con `include` desde el backend). */
export interface ConsentEventContact {
  id: number;
  name: string;
  phone: string;
  consentState: string | null;
}

/** Evento tal cual llega de la API (fechas todavía como texto ISO). */
export interface ConsentEventItem {
  id: number;
  contactId: number;
  event: ConsentEventType | string;
  /** Cómo se registró: inbound | manual | import | api. */
  source: string | null;
  /** Palabra clave que disparó el evento (solo en respuestas del contacto). */
  keyword: string | null;
  /** Evidencia guardada: el texto del mensaje entrante o la justificación escrita. */
  raw: string | null;
  createdBy: string | null;
  createdAt: string | Date;
  contact: ConsentEventContact | null;
}

/**
 * Fila que consume la tabla. El nombre y el teléfono del contacto se suben al
 * primer nivel a propósito: el buscador global de DataTable recorre los valores
 * planos de la fila, así que un contacto anidado sería invisible para la
 * búsqueda.
 */
export interface ConsentEventRow extends Omit<ConsentEventItem, "createdAt"> {
  createdAt: Date;
  contactName: string;
  contactPhone: string;
}

/** Filtros admitidos por el endpoint (vacío = sin filtrar). */
export interface ConsentEventFilters {
  event?: string;
  source?: string;
  contactId?: number;
}

export interface ConsentEventsResponse {
  success: boolean;
  message: string;
  data?: ConsentEventItem[];
}

/** Valor centinela para "sin filtro": Select no admite cadena vacía. */
export const CONSENT_FILTRO_TODOS = "todos";

export const CONSENT_EVENT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: CONSENT_FILTRO_TODOS, label: "Todos" },
  { value: "opt_in", label: "Alta" },
  { value: "opt_out", label: "Baja" },
];

export const CONSENT_SOURCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: CONSENT_FILTRO_TODOS, label: "Todos los orígenes" },
  { value: "inbound", label: "Respuesta del contacto" },
  { value: "manual", label: "Registro manual" },
  { value: "import", label: "Importación" },
  { value: "api", label: "API" },
];
