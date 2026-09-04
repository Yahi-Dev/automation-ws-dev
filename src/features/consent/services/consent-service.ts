// src/features/consent/services/consent-service.ts
// Cliente del historial de consentimiento. El backend ya existe:
//   GET /api/consent-events            -> listado paginado por keyset
//   GET /api/consent-events?format=csv -> descarga del CSV (la genera el servidor)
import { fetchAllPages } from "@/src/lib/fetch-all-pages";
import { ConsentEventFilters, ConsentEventItem, ConsentEventsResponse } from "../types";

/** Construye la URL del endpoint aplicando solo los filtros con valor. */
function buildConsentUrl(filters?: ConsentEventFilters): URL {
  const url = new URL("/api/consent-events", window.location.origin);

  if (filters?.event) {
    url.searchParams.set("event", filters.event);
  }
  if (filters?.source) {
    url.searchParams.set("source", filters.source);
  }
  if (filters?.contactId) {
    url.searchParams.set("contactId", String(filters.contactId));
  }

  return url;
}

export async function getConsentEvents(
  filters?: ConsentEventFilters
): Promise<ConsentEventsResponse> {
  try {
    // Paginación keyset transparente: se recorren todas las páginas acotadas y
    // se entrega el arreglo completo a la UI, igual que el resto de listados.
    const data = await fetchAllPages<ConsentEventItem>(buildConsentUrl(filters));

    return {
      success: true,
      message: "Historial de consentimiento obtenido correctamente",
      data,
    };
  } catch (error) {
    console.error("Error al obtener el historial de consentimiento:", error);
    throw error;
  }
}

/**
 * URL de descarga del CSV. El archivo lo arma el servidor (con BOM y cabecera
 * de descarga), aquí solo se navega hacia él; no se construye nada en el
 * navegador. Se arrastran los filtros activos para que lo exportado coincida
 * con lo que la persona está viendo en pantalla.
 */
export function getConsentCsvUrl(filters?: ConsentEventFilters): string {
  const url = buildConsentUrl(filters);
  url.searchParams.set("format", "csv");
  return `${url.pathname}${url.search}`;
}
