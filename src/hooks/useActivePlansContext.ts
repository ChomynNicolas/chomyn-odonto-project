// src/hooks/useActivePlansContext.ts
import { useQuery } from "@tanstack/react-query"
import type { ActivePlanContext } from "@/types/agenda"

/**
 * Hook to fetch active treatment plans context for a patient
 * Returns information about active plans with pending sessions and recommended appointment details
 * Used when creating new appointments to auto-fill fields
 */
export function useActivePlansContext(pacienteId: number | null | undefined, enabled: boolean = true) {
  return useQuery<ActivePlanContext>({
    queryKey: ["active-plans-context", pacienteId],
    queryFn: async () => {
      if (!pacienteId) {
        throw new Error("pacienteId is required")
      }

      const res = await fetch(`/api/pacientes/${pacienteId}/agenda/active-plans`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al obtener planes activos")
      }

      const data = await res.json()
      if (!data.ok) {
        throw new Error(data.error || "Error al obtener planes activos")
      }

      return data.data as ActivePlanContext
    },
    enabled: enabled && !!pacienteId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  })
}

