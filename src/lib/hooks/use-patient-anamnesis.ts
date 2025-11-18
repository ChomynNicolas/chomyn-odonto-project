// Hook for fetching patient anamnesis

import { useQuery } from '@tanstack/react-query';
import type { PatientAnamnesisDTO } from '@/types/patient';

export function usePatientAnamnesis(patientId: number) {
  return useQuery({
    queryKey: ['patient', 'anamnesis', patientId],
    queryFn: async () => {
      const res = await fetch(`/api/pacientes/${patientId}/workspace/anamnesis`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al cargar anamnesis');
      }
      const response = await res.json();
      return response.data as PatientAnamnesisDTO | null;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!patientId,
  });
}

