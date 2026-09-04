// src/features/consent/hooks/use-consent.ts
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ConsentEventFilters, ConsentEventRow } from "../types";
import { getConsentCsvUrl, getConsentEvents } from "../services/consent-service";

export function useGetAllConsentEvents() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<ConsentEventRow[]>([]);

  const fetchAll = useCallback(
    async (filters?: ConsentEventFilters): Promise<ConsentEventRow[] | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getConsentEvents(filters);

        if (response.success && response.data) {
          const data: ConsentEventRow[] = response.data.map((evento) => ({
            ...evento,
            createdAt: new Date(evento.createdAt),
            // Se aplanan para que el buscador y el orden de la tabla funcionen.
            contactName: evento.contact?.name ?? "Contacto eliminado",
            contactPhone: evento.contact?.phone ?? "",
          }));

          setEvents(data);
          return data;
        }

        return null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error desconocido";
        setError(errorMessage);
        toast.error("Error al cargar el historial de consentimiento", {
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
    events,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Descarga del CSV: navega al endpoint, que responde con `Content-Disposition:
 * attachment`. No se genera el archivo en el navegador.
 */
export function useExportConsentCsv() {
  const exportCsv = useCallback((filters?: ConsentEventFilters) => {
    window.location.href = getConsentCsvUrl(filters);
  }, []);

  return { exportCsv };
}
