// React Query hook for administrative data

'use client';

import { useQuery } from '@tanstack/react-query';
import type { AdministrativeDTO } from '@/types/patient';

export function useAdministrative(patientId: number) {
  return useQuery({
    queryKey: ['patient', 'administrative', patientId],
    queryFn: async () => {
      const res = await fetch(`/api/pacientes/${patientId}/workspace/administrative`);
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al cargar datos administrativos');
      }
      
      const response = await res.json();
      return response.data as AdministrativeDTO;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
