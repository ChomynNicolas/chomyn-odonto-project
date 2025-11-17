// React Query hook for clinical history

'use client';

import { useQuery } from '@tanstack/react-query';
import type { ClinicalHistoryEntryDTO, PaginatedResponse } from '@/types/patient';

interface UseClinicalHistoryOptions {
  page?: number;
  limit?: number;
  professionalId?: number;
}

export function useClinicalHistory(
  patientId: number,
  options: UseClinicalHistoryOptions = {}
) {
  const { page = 1, limit = 10, professionalId } = options;

  return useQuery({
    queryKey: ['patient', 'clinical-history', patientId, page, limit, professionalId],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (professionalId) {
        params.append('professionalId', professionalId.toString());
      }

      const res = await fetch(
        `/api/pacientes/${patientId}/workspace/clinical-history?${params}`
      );
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al cargar historial clínico');
      }
      
      const response = await res.json();
      return response.data as PaginatedResponse<ClinicalHistoryEntryDTO>;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
