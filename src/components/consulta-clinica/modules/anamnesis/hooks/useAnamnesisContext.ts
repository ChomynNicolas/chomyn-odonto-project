// Hook to centralize anamnesis data fetching and context

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AnamnesisResponse } from '@/app/api/pacientes/[id]/anamnesis/_schemas';
import type { AnamnesisContext } from '@/lib/services/anamnesis-context.service';

interface UseAnamnesisContextResult {
  anamnesis: AnamnesisResponse | null;
  context: AnamnesisContext | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAnamnesisContext(pacienteId: number | null | undefined): UseAnamnesisContextResult {
  const [context, setContext] = useState<AnamnesisContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);

  // Fetch anamnesis context (first-time vs follow-up detection)
  useEffect(() => {
    if (!pacienteId) {
      setContext(null);
      setContextLoading(false);
      return;
    }

    let cancelled = false;

    fetch(`/api/pacientes/${pacienteId}/anamnesis/context`)
      .then((res) => {
        if (cancelled) return null;
        if (!res.ok) {
          // If endpoint doesn't exist yet, create default context
          return {
            isFirstTime: true,
            hasExistingAnamnesis: false,
            hasPreviousConsultations: false,
            lastAnamnesisUpdate: null,
            daysSinceLastUpdate: null,
            lastConsultationDate: null,
            isSignificantlyOutdated: false,
            previousAnamnesisId: null,
          };
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data?.data) {
          setContext(data.data);
        } else {
          // Default context if no data
          setContext({
            isFirstTime: true,
            hasExistingAnamnesis: false,
            hasPreviousConsultations: false,
            lastAnamnesisUpdate: null,
            daysSinceLastUpdate: null,
            lastConsultationDate: null,
            isSignificantlyOutdated: false,
            previousAnamnesisId: null,
          });
        }
        setContextLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Error fetching anamnesis context:', error);
        // Set default context on error
        setContext({
          isFirstTime: true,
          hasExistingAnamnesis: false,
          hasPreviousConsultations: false,
          lastAnamnesisUpdate: null,
          daysSinceLastUpdate: null,
          lastConsultationDate: null,
          isSignificantlyOutdated: false,
          previousAnamnesisId: null,
        });
        setContextLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pacienteId]);

  // Fetch anamnesis data using React Query for better caching
  const {
    data: anamnesis,
    isLoading: anamnesisLoading,
    error: anamnesisError,
    refetch: refetchAnamnesis,
  } = useQuery({
    queryKey: ['anamnesis', pacienteId],
    queryFn: async () => {
      if (!pacienteId) return null;

      const res = await fetch(`/api/pacientes/${pacienteId}/anamnesis`);
      if (res.status === 404) {
        return null; // No anamnesis exists yet
      }
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al cargar anamnesis');
      }
      const response = await res.json();
      return response.data as AnamnesisResponse | null;
    },
    enabled: !!pacienteId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1,
  });

  const refetch = useCallback(async () => {
    await refetchAnamnesis();
    // Optionally refetch context as well
    if (pacienteId) {
      const res = await fetch(`/api/pacientes/${pacienteId}/anamnesis/context`);
      if (res.ok) {
        const data = await res.json();
        if (data?.data) {
          setContext(data.data);
        }
      }
    }
  }, [pacienteId, refetchAnamnesis]);

  return {
    anamnesis: anamnesis ?? null,
    context,
    isLoading: contextLoading || anamnesisLoading,
    error: anamnesisError as Error | null,
    refetch,
  };
}

