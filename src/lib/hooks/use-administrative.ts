// React Query hook for administrative data

'use client';

import { useQuery } from '@tanstack/react-query';
import type { AdministrativeDTO } from '@/types/patient';

interface UseAdministrativeOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

export function useAdministrative(
  patientId: number,
  options: UseAdministrativeOptions = {}
) {
  return useQuery({
    queryKey: ['patient', 'administrative', patientId],
    queryFn: async () => {
      const res = await fetch(`/api/pacientes/${patientId}/workspace/administrative`);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al cargar datos administrativos');
      }

      const response = await res.json();
      if (!response.ok) {
        throw new Error(response.error || 'Error en la respuesta');
      }

      return response.data as AdministrativeDTO;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes (reduced for administrative data)
    gcTime: 1000 * 60 * 10, // 10 minutes
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval,
    retry: 2,
  });
}
