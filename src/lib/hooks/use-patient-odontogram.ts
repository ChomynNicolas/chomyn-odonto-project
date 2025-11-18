// Hook for fetching patient odontogram snapshots

import { useQuery } from '@tanstack/react-query';

interface OdontogramSnapshotDTO {
  id: number;
  takenAt: string;
  notes: string | null;
  createdBy: string;
  consultaId: number | null;
  consultaDate: string | null;
  entries: Array<{
    id: number;
    toothNumber: number;
    surface: string | null;
    condition: string;
    notes: string | null;
  }>;
}

interface UsePatientOdontogramOptions {
  limit?: number;
}

export function usePatientOdontogram(patientId: number, options: UsePatientOdontogramOptions = {}) {
  const { limit = 10 } = options;

  return useQuery({
    queryKey: ['patient', 'odontogram', patientId, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: limit.toString() });
      const res = await fetch(`/api/pacientes/${patientId}/workspace/odontogram?${params}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al cargar odontograma');
      }
      const response = await res.json();
      return response.data as OdontogramSnapshotDTO[];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: !!patientId,
  });
}

