// src/hooks/useFollowUpContext.ts
import { useQuery } from "@tanstack/react-query"
import type { FollowUpContext } from "@/types/agenda"

/**
 * Hook to fetch follow-up context for a completed appointment
 * Returns information about pending sessions and recommended follow-up date
 */
export function useFollowUpContext(citaId: number | null | undefined, enabled: boolean = true) {
  return useQuery<FollowUpContext>({
    queryKey: ["follow-up-context", citaId],
    queryFn: async () => {
      if (!citaId) {
        throw new Error("citaId is required")
      }

      const res = await fetch(`/api/agenda/citas/${citaId}/follow-up`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al obtener contexto de seguimiento")
      }

      const data = await res.json()
      if (!data.ok) {
        throw new Error(data.error || "Error al obtener contexto de seguimiento")
      }

      return data.data as FollowUpContext
    },
    enabled: enabled && !!citaId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  })
}

