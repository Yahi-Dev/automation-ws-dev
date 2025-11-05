// src/features/dashboard/hooks/use-dashboard.ts
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardData } from "../types";
import { getDashboardData } from "../service/dashboard-service";

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getDashboardData();
      
      if (response.success && response.data) {
        setData(response.data);
      } else {
        throw new Error(response.message || "Error al cargar los datos del dashboard");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      setError(errorMessage);
      toast.error('Error al cargar el dashboard', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const refetch = () => {
    fetchData();
  };

  return {
    data,
    isLoading,
    error,
    refetch,
    clearError: () => setError(null),
  };
}