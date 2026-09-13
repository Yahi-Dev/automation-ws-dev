// src/features/inbound/services/inbound-service.ts
import { ConversacionDTO, InboundFilters, InboundMessageType } from "../types";
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

/**
 * Trae el hilo completo con el número que escribió el mensaje `id`.
 * Llama a GET /api/inbound/<id>/conversation.
 */
export async function getConversation(id: number): Promise<ConversacionDTO> {
  const response = await fetch(`/api/inbound/${id}/conversation`);
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Error al cargar la conversación");
  }
  return result.data as ConversacionDTO;
}

/**
 * Envía una respuesta de texto libre. Llama a POST /api/inbound/<id>/reply.
 *
 * Devuelve el hilo YA actualizado: el servidor lo manda de vuelta en la misma
 * respuesta para no tener que volver a preguntarlo (y para que el mensaje
 * recién enviado aparezca con su estado real, no con uno inventado aquí).
 */
export async function sendReply(id: number, texto: string): Promise<ConversacionDTO> {
  const response = await fetch(`/api/inbound/${id}/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texto }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "No se pudo enviar la respuesta");
  }
  return result.data as ConversacionDTO;
}
