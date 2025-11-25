// Hook for fetching patient odontogram history with audit info

import { useQuery } from '@tanstack/react-query';
import type { OdontogramHistoryResponse, OdontogramSnapshotAPI } from '@/lib/types/patient';

interface UsePatientOdontogramHistoryOptions {
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

interface UsePatientOdontogramHistoryResult {
  data: OdontogramHistoryResponse | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch and manage patient odontogram history
 * Fetches from /api/pacientes/[id]/odontograma/historial endpoint
 * 
 * @param patientId - Patient ID
 * @param options - Query options (limit, offset, enabled)
 * @returns Query result with history data, loading state, and error
 */
export function usePatientOdontogramHistory(
  patientId: number,
  options: UsePatientOdontogramHistoryOptions = {}
): UsePatientOdontogramHistoryResult {
  const { limit = 50, offset = 0, enabled = true } = options;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['patient', 'odontogram', 'history', patientId, limit, offset],
    queryFn: async (): Promise<OdontogramHistoryResponse> => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      const res = await fetch(`/api/pacientes/${patientId}/odontograma/historial?${params}`);
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al cargar historial de odontograma');
      }
      
      const response = await res.json();
      if (!response.ok) {
        throw new Error(response.error || 'Error al cargar historial de odontograma');
      }
      
      return response.data as OdontogramHistoryResponse;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: enabled && !!patientId,
    retry: 2,
  });

  return {
    data,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

