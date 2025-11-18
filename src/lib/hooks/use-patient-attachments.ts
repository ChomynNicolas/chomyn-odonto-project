// Hook for fetching patient attachments

import { useQuery } from '@tanstack/react-query';
import type { AttachmentDTO } from '@/types/patient';

interface UsePatientAttachmentsOptions {
  tipo?: string;
  limit?: number;
}

export function usePatientAttachments(patientId: number, options: UsePatientAttachmentsOptions = {}) {
  const { tipo, limit = 50 } = options;

  return useQuery({
    queryKey: ['patient', 'attachments', patientId, tipo, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tipo) params.append('tipo', tipo);
      params.append('limit', limit.toString());
      
      const res = await fetch(`/api/pacientes/${patientId}/workspace/attachments?${params}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al cargar adjuntos');
      }
      const response = await res.json();
      return response.data as AttachmentDTO[];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: !!patientId,
  });
}

