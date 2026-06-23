// src/features/messages/hooks/use-messages.ts
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { MessageWithRelations } from "../types";
import {
  MessagesResponse,
  SendCampaignResponse,
  createMessage,
  deleteMessage,
  getAllMessages,
  getMessageById,
  updateMessage,
  assignMessageToContacts,
  sendCampaign
} from "../services/messages-service";
import { MessageFormValues, MessageUpdateValues } from "../schema/validations";
import { getAllPosts } from "../../posts/services/posts-service";
import { getAllContacts } from "../../contacts/services/contacts-service";
import { PostsType } from "../../posts/types";
import { ContactsType } from "../../contacts/types";


export interface MessageAssignmentData {
  posts: PostsType[];
  contacts: ContactsType[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useMessageAssignmentData = (): MessageAssignmentData => {
  const [posts, setPosts] = useState<PostsType[]>([]);
  const [contacts, setContacts] = useState<ContactsType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Ejecutar ambas peticiones en paralelo
      const [postsResponse, contactsResponse] = await Promise.all([
        getAllPosts(),
        getAllContacts()
      ]);

      // Procesar posts
      if (postsResponse.success && postsResponse.data) {
        const postsData = Array.isArray(postsResponse.data) 
          ? postsResponse.data 
          : [postsResponse.data];
        
        const processedPosts = postsData.map(post => ({
          ...post,
          schedule: new Date(post.schedule),
          createdAt: new Date(post.createdAt),
          updatedAt: post.updatedAt ? new Date(post.updatedAt) : null,
          images: post.images || [],
        }));

        setPosts(processedPosts);
      } else {
        throw new Error(postsResponse.message || "Error al cargar posts");
      }

      // Procesar contactos
      if (contactsResponse.success && contactsResponse.data) {
        const contactsData = Array.isArray(contactsResponse.data)
          ? contactsResponse.data
          : [contactsResponse.data];
        
        const processedContacts = contactsData.map(contact => ({
          ...contact,
          createdAt: new Date(contact.createdAt),
          updatedAt: contact.updatedAt ? new Date(contact.updatedAt) : null,
        }));

        setContacts(processedContacts);
      } else {
        throw new Error(contactsResponse.message || "Error al cargar contactos");
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido al cargar datos";
      setError(errorMessage);
      console.error("Error loading message assignment data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    posts,
    contacts,
    loading,
    error,
    refetch: fetchData,
  };
};



export function useGetAllMessages() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageWithRelations[]>([]);

  const fetchAll = useCallback(async (params?: { 
    search?: string; 
    status?: string;
    postId?: number;
    contactId?: number;
  }): Promise<MessageWithRelations[] | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getAllMessages(params);

      if (response.success && response.data) {
        const data = (Array.isArray(response.data) ? response.data : [response.data])
          .map(message => ({
            ...message,
            sentAt: message.sentAt ? new Date(message.sentAt) : null,
            createdAt: new Date(message.createdAt),
            updatedAt: message.updatedAt ? new Date(message.updatedAt) : null,
            post: message.post ? {
              ...message.post,
              schedule: new Date(message.post.schedule),
            } : null,
            contact: message.contact ? {
              ...message.contact,
            } : null,
          })) as MessageWithRelations[];

        setMessages(data);
        return data;
      }
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      setError(errorMessage);
      toast.error('Error al cargar mensajes', {
        description: errorMessage,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    fetchAll,
    messages,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

export const useMessageById = (id: number) => {
  const [message, setMessage] = useState<MessageWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMessage = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await getMessageById(id);

        if (response.success && response.data) {
          const messageData = Array.isArray(response.data)
            ? response.data[0]
            : response.data;
          
          const processedMessage = {
            ...messageData,
            sentAt: messageData.sentAt ? new Date(messageData.sentAt) : null,
            createdAt: new Date(messageData.createdAt),
            updatedAt: messageData.updatedAt ? new Date(messageData.updatedAt) : null,
            post: messageData.post ? {
              ...messageData.post,
              schedule: new Date(messageData.post.schedule),
              images: messageData.post.images?.map((img: any) => ({
                ...img,
                createdAt: new Date(img.createdAt),
                updatedAt: new Date(img.updatedAt),
              })) || [],
            } : null,
            contact: messageData.contact ? {
              ...messageData.contact,
            } : null,
          } as MessageWithRelations;

          setMessage(processedMessage);
        } else {
          setError(response.message || "Mensaje no encontrado");
          toast.error('Error al cargar mensaje', {
            description: response.message || "Mensaje no encontrado"
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error desconocido";
        setError(errorMessage);
        toast.error('Error al cargar mensaje', {
          description: errorMessage
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchMessage();
  }, [id]);

  return { message, loading, error };
};


export function useDeleteMessage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const remove = async (id: number): Promise<MessagesResponse | null> => {
    setIsLoading(true);
    try {
      const response = await deleteMessage(id);
      router.push("/messages");
      return response;
    } catch (error) {
      console.error("Error deleting message:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { remove, isLoading };
};

export function useCreateMessage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (data: MessageFormValues): Promise<MessagesResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await createMessage(data);
      
      if (response.success) {
        toast.success("Mensaje creado exitosamente", {
          description: "El mensaje ha sido registrado correctamente."
        });
        router.push("/messages");
        return response;
      } else {
        throw new Error(response.message || "Error al crear el mensaje");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido al crear el mensaje";
      setError(errorMessage);
      toast.error("Error al crear mensaje", {
        description: errorMessage
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return { create, isLoading, error, clearError };
};

export function useUpdateMessage(id: number) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = async (data: MessageUpdateValues): Promise<MessagesResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await updateMessage(id, data);
      
      if (response.success) {
        toast.success("Mensaje actualizado exitosamente", {
          description: "El mensaje ha sido actualizado correctamente."
        });
        router.push("/messages");
        return response;
      } else {
        throw new Error(response.message || "Error al actualizar el mensaje");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido al actualizar el mensaje";
      setError(errorMessage);
      toast.error("Error al actualizar mensaje", {
        description: errorMessage
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return { update, isLoading, error, clearError };
};

export function useSendCampaign() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (
    postId: number,
    options?: { batchSize?: number; delayMs?: number; includeSent?: boolean }
  ): Promise<SendCampaignResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendCampaign(postId, options);

      if (response.success) {
        const summary = response.data;
        toast.success("Campaña enviada", {
          description: summary
            ? `${summary.sent} enviado(s), ${summary.failed} fallido(s) de ${summary.total}.`
            : response.message,
        });
        return response;
      } else {
        throw new Error(response.message || "Error al enviar la campaña");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido al enviar la campaña";
      setError(errorMessage);
      toast.error("Error al enviar la campaña", {
        description: errorMessage,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return { send, isLoading, error, clearError };
}

export function useAssignMessage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assign = async (postId: number, contactIds: number[]): Promise<MessagesResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await assignMessageToContacts(postId, contactIds);
      
      if (response.success) {
        toast.success("Mensaje asignado exitosamente", {
          description: `El mensaje ha sido asignado a ${contactIds.length} contacto(s) correctamente.`
        });
        return response;
      } else {
        throw new Error(response.message || "Error al asignar el mensaje");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido al asignar el mensaje";
      setError(errorMessage);
      toast.error("Error al asignar mensaje", {
        description: errorMessage
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return { assign, isLoading, error, clearError };
};