// src/features/messages/services/messages-service.ts
import { MessageFormValues, MessageUpdateValues } from "../schema/validations";
import { MessageType, MessageWithRelations } from "../types";
import { fetchAllPages } from "@/src/lib/fetch-all-pages";

export interface MessagesResponse {
  success: boolean;
  message: string;
  data?: MessageType | MessageType[] | MessageWithRelations[];
}

export async function createMessage(
  data: MessageFormValues
): Promise<MessagesResponse> {
  try {
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error en el servidor");
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error creating message:", error);
    throw error;
  }
}

export async function getAllMessages(params?: {
  search?: string;
  status?: string;
  postId?: number;
  contactId?: number;
}): Promise<MessagesResponse> {
  try {
    const url = new URL("/api/messages", window.location.origin);

    if (params?.search) {
      url.searchParams.append("search", params.search);
    }
    if (params?.status) {
      url.searchParams.append("status", params.status);
    }
    if (params?.postId) {
      url.searchParams.append("postId", params.postId.toString());
    }
    if (params?.contactId) {
      url.searchParams.append("contactId", params.contactId.toString());
    }

    // Paginación keyset transparente: trae todas las páginas acotadas y entrega
    // el arreglo completo a la UI (misma forma de siempre, sin cambios visuales).
    const data = await fetchAllPages<MessageWithRelations>(url);

    return {
      success: true,
      message: "Mensajes obtenidos correctamente",
      data
    };
  } catch (error) {
    console.error("Error al obtener mensajes:", error);
    throw error;
  }
}

export async function getMessageById(id: number): Promise<MessagesResponse> {
  try {
    const response = await fetch(`/api/messages/${id}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Error al obtener el mensaje");
    }

    if (!result.success || !result.data) {
      throw new Error("Respuesta inesperada del servidor");
    }

    return {
      success: true,
      message: result.message || "Mensaje obtenido correctamente",
      data: result.data
    };
  } catch (error) {
    console.error("Error al obtener mensaje por ID:", error);
    throw error;
  }
}

export async function updateMessage(
  id: number,
  data: MessageUpdateValues
): Promise<MessagesResponse> {
  try {
    const response = await fetch(`/api/messages?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data), 
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.message || "Error al actualizar el mensaje");
      } catch {
        throw new Error(errorText || "Error al actualizar el mensaje");
      }
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || "Error al actualizar el mensaje");
    }

    return result;
  } catch (error) {
    console.error("Error al actualizar mensaje:", error);
    throw error;
  }
}

export async function deleteMessage(id: number): Promise<MessagesResponse> {
  try {
    const response = await fetch(`/api/messages?id=${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error al eliminar mensaje");
    }

    return await response.json();
  } catch (error) {
    console.error("Error al eliminar mensaje:", error);
    throw error;
  }
}

export interface SendCampaignSummary {
  postId: number;
  total: number;
  sent: number;
  failed: number;
  results: Array<{ messageId: number; contactId: number; ok: boolean; sid?: string; error?: string }>;
}

export interface SendCampaignResponse {
  success: boolean;
  message: string;
  data?: SendCampaignSummary;
}

/**
 * Dispara el envío masivo (broadcast) de un post a sus contactos asignados.
 * Llama a POST /api/whatsapp.
 */
export async function sendCampaign(
  postId: number,
  options?: { batchSize?: number; delayMs?: number; includeSent?: boolean }
): Promise<SendCampaignResponse> {
  try {
    const response = await fetch("/api/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, ...options }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Error al enviar la campaña");
    }

    return result;
  } catch (error) {
    console.error("Error sending campaign:", error);
    throw error;
  }
}

export async function assignMessageToContacts(
  postId: number,
  contactIds: number[]
): Promise<MessagesResponse> {
  try {
    const response = await fetch("/api/messages/assign", { 
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, contactIds }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error al asignar mensaje");
    }

    return await response.json();
  } catch (error) {
    console.error("Error assigning message to contacts:", error);
    throw error;
  }
}