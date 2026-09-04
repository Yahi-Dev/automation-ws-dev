// src/features/inbound/hooks/use-inbound.ts
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { InboundFilters, InboundMessageRow, InboundMessageType } from "../types";
import {
  InboundResponse,
  getAllInbound,
  linkInboundToContact,
} from "../services/inbound-service";
import { getAllContacts } from "../../contacts/services/contacts-service";
import { ContactsType } from "../../contacts/types";

export function useGetAllInbound() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inbound, setInbound] = useState<InboundMessageRow[]>([]);

  const fetchAll = useCallback(
    async (params?: InboundFilters): Promise<InboundMessageRow[] | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getAllInbound(params);

        if (response.success && response.data) {
          const data: InboundMessageRow[] = (
            Array.isArray(response.data) ? response.data : [response.data]
          ).map((message: InboundMessageType) => ({
            ...message,
            receivedAt: new Date(message.receivedAt),
            contact: message.contact ? { ...message.contact } : null,
            // Se aplanan para que el buscador global de la tabla los alcance.
            contactName: message.contact?.name ?? "",
            contactPhone: message.contact?.phone ?? "",
          }));

          setInbound(data);
          return data;
        }
        return null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error desconocido";
        setError(errorMessage);
        toast.error("Error al cargar los mensajes entrantes", {
          description: errorMessage,
        });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    fetchAll,
    inbound,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

export function useLinkInbound() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const link = useCallback(
    async (id: number, contactId: number): Promise<InboundResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await linkInboundToContact(id, contactId);

        toast.success("Mensaje vinculado", {
          description: "El mensaje entrante quedó asociado al contacto.",
        });
        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Error desconocido al vincular el mensaje";
        setError(errorMessage);
        toast.error("Error al vincular el mensaje", {
          description: errorMessage,
        });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clearError = () => setError(null);

  return { link, isLoading, error, clearError };
}

/**
 * Carga la lista de contactos bajo demanda, para el diálogo de "Vincular a contacto".
 * Solo se pide cuando el usuario abre el diálogo, no al montar la tabla.
 */
export function useContactsForLinking() {
  const [contacts, setContacts] = useState<ContactsType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadContacts = useCallback(async (): Promise<ContactsType[]> => {
    setIsLoading(true);
    try {
      const response = await getAllContacts();
      const data = response.success && response.data
        ? (Array.isArray(response.data) ? response.data : [response.data])
        : [];

      setContacts(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      toast.error("Error al cargar los contactos", {
        description: errorMessage,
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { contacts, loadContacts, isLoading };
}
