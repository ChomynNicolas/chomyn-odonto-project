// Hook for fetching patient timeline

import { useQuery } from '@tanstack/react-query';
import type { TimelineEntryDTO } from '@/types/patient';

interface UsePatientTimelineOptions {
  limit?: number;
}

export function usePatientTimeline(patientId: number, options: UsePatientTimelineOptions = {}) {
  const { limit = 20 } = options;

  return useQuery({
    queryKey: ['patient', 'timeline', patientId, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: limit.toString() });
      const res = await fetch(`/api/pacientes/${patientId}/workspace/timeline?${params}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al cargar timeline');
      }
      const response = await res.json();
      return response.data as TimelineEntryDTO[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!patientId,
  });
}

