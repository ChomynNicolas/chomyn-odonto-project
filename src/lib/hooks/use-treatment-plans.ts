// React Query hook for treatment plans

'use client';

import { useQuery } from '@tanstack/react-query';
import type { TreatmentPlansResponse } from '@/types/treatment-plans';

export function useTreatmentPlans(patientId: number, includeInactive = false) {
  return useQuery<TreatmentPlansResponse>({
    queryKey: ['patient', 'treatment-plans', patientId, includeInactive],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (includeInactive) {
        params.append('includeInactive', 'true');
      }

      const res = await fetch(
        `/api/pacientes/${patientId}/workspace/treatment-plans?${params}`
      );
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al cargar planes de tratamiento');
      }
      
      const response = await res.json();
      return response.data as TreatmentPlansResponse;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
