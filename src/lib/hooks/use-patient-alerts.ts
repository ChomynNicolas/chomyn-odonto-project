// Hook for fetching patient alerts

import { useQuery } from '@tanstack/react-query';
import type { PatientAlertDTO } from '@/types/patient';

export function usePatientAlerts(patientId: number) {
  return useQuery({
    queryKey: ['patient', 'alerts', patientId],
    queryFn: async () => {
      const res = await fetch(`/api/pacientes/${patientId}/workspace/alerts`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al cargar alertas');
      }
      const response = await res.json();
      return response.data as PatientAlertDTO[];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes - alerts should be fresh
    enabled: !!patientId,
  });
}

