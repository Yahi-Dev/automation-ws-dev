// src/features/inbound/services/inbound-service.ts
import { InboundFilters, InboundMessageType } from "../types";
import { fetchAllPages } from "@/src/lib/fetch-all-pages";

export interface InboundResponse {
  success: boolean;
  message: string;
  data?: InboundMessageType | InboundMessageType[];
}

export async function getAllInbound(
  params?: InboundFilters
): Promise<InboundResponse> {
  try {
    const url = new URL("/api/inbound", window.location.origin);

    if (params?.handledAs) {
      url.searchParams.append("handledAs", params.handledAs);
    }
    if (params?.contactId) {
      url.searchParams.append("contactId", params.contactId.toString());
    }

    // Paginación keyset transparente: trae todas las páginas acotadas y entrega
    // el arreglo completo a la UI (misma forma de siempre, sin cambios visuales).
    const data = await fetchAllPages<InboundMessageType>(url);

    return {
      success: true,
      message: "Mensajes entrantes obtenidos correctamente",
      data,
    };
  } catch (error) {
    console.error("Error al obtener mensajes entrantes:", error);
    throw error;
  }
}

/**
 * Vincula un entrante huérfano (sin contacto) a un contacto existente.
 * Llama a POST /api/inbound/<id>/link.
 */
export async function linkInboundToContact(
  id: number,
  contactId: number
): Promise<InboundResponse> {
  try {
    const response = await fetch(`/api/inbound/${id}/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Error al vincular el mensaje entrante");
    }

    return result;
  } catch (error) {
    console.error("Error al vincular mensaje entrante:", error);
    throw error;
  }
}
