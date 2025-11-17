// React Query hook for patient overview

'use client';

import { useQuery } from '@tanstack/react-query';
import type { PatientOverviewDTO } from '@/types/patient';

export function usePatientOverview(patientId: number) {
  return useQuery({
    queryKey: ['patient', 'overview', patientId],
    queryFn: async () => {
      const res = await fetch(`/api/pacientes/${patientId}/workspace/overview`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al cargar datos del paciente');
      }
      const response = await res.json();
      return response.data as PatientOverviewDTO;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
