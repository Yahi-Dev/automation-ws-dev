import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ContactsType } from "../types";
import { ContactsResponse, createContact, deleteContact, getAllContacts,
  getContactById, updateContact, setContactConsent } from "../services/contacts-service";
import { ContactFormValues } from "../schema/validations";

export function useGetAllContacts() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<ContactsType[]>([]);

  const fetchAll = async (params?: {
    isActive?: boolean;
    search?: string;
  }): Promise<ContactsType[] | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getAllContacts(params);

      if (response.success && response.data) {
        const data = (Array.isArray(response.data) ? response.data : [response.data])
          .map(c => ({
            ...c,
            createdAt: new Date(c.createdAt ?? ""),
            updatedAt: new Date(c.updatedAt ?? ""),
          }));

          console.log("Fetched contacts:", data);

          setContacts(data);
        return data;
      }
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      setError(errorMessage);
      toast.error('Error al cargar compañías', {
        description: errorMessage,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    fetchAll,
    contacts,
    isLoading,
    error,
    clearError: () => setError(null),
  };
};

export const useContactById = (id: number) => {
  const [contact, setContact] = useState<ContactsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContact = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await getContactById(id);

        if (response.success && response.data) {
          const categoryData = Array.isArray(response.data)
            ? response.data[0]
            : response.data;
            console.log("Contact data:", categoryData);
          setContact(categoryData);
        } else {
          setError(response.message || "Contacto no encontrado");
          toast.error('Error al cargar contacto', {
            description: response.message || "Contacto no encontrado"
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error desconocido";
        setError(errorMessage);
        toast.error('Error al cargar categoría', {
          description: errorMessage
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchContact();
  }, [id]);

  return { contact, loading, error };
};

export function useDeleteContact() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const remove = async (id: number): Promise<ContactsResponse | null> => {
    setIsLoading(true);
    try {
      const response = await deleteContact(id);
      router.push("/contacts");
      return response;
    } catch (error) {
      console.error("Error deleting contact:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { remove, isLoading };
};

export function useCreateContact() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (data: ContactFormValues): Promise<ContactsResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await createContact(data);

      if (response.success) {
        toast.success("Contacto creado exitosamente", {
          description: "El contacto ha sido registrado correctamente."
        });
        router.push("/contacts");
        return response;
      } else {
        throw new Error(response.message || "Error al crear el contacto");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido al crear el contacto";
      setError(errorMessage);
      toast.error("Error al crear contacto", {
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

export function useUpdateContact(id: number) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = async (data: ContactFormValues): Promise<ContactsResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await updateContact(id, data);

      if (response.success) {
        toast.success("Contacto actualizado exitosamente", {
          description: "El contacto ha sido actualizado correctamente."
        });
        router.push("/contacts");
        return response;
      } else {
        throw new Error(response.message || "Error al actualizar el contacto");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido al actualizar el contacto";
      setError(errorMessage);
      toast.error("Error al actualizar contacto", {
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

export function useSetConsent() {
  const [isLoading, setIsLoading] = useState(false);

  const setConsent = async (
    id: number,
    event: "opt_in" | "opt_out"
  ): Promise<ContactsResponse | null> => {
    setIsLoading(true);
    try {
      const response = await setContactConsent(id, event);
      if (response.success) {
        toast.success(
          event === "opt_out" ? "Contacto dado de baja" : "Contacto suscrito",
          { description: response.message }
        );
        return response;
      }
      throw new Error(response.message || "Error al actualizar el consentimiento");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      toast.error("Error al actualizar el consentimiento", { description: errorMessage });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { setConsent, isLoading };
}