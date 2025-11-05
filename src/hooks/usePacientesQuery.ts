import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { PacientesResponse, PacienteListFilters, PacienteCreateDTO } from "@/lib/api/pacientes.types"

export function usePacientesQuery(filters: PacienteListFilters) {
  return useQuery({
    queryKey: ["pacientes", filters],
    queryFn: async () => {
      const params = new URLSearchParams()

      if (filters.q) params.set("q", filters.q)
      if (filters.createdFrom) params.set("createdFrom", filters.createdFrom)
      if (filters.createdTo) params.set("createdTo", filters.createdTo)
      if (filters.estaActivo !== undefined) params.set("estaActivo", String(filters.estaActivo))
      if (filters.sort) params.set("sort", filters.sort)
      if (filters.cursor) params.set("cursor", filters.cursor)
      if (filters.limit) params.set("limit", String(filters.limit))

      const response = await fetch(`/api/pacientes?${params}`, { cache: "no-store" })
      if (!response.ok) throw new Error("Error al cargar pacientes")
      return (await response.json()) as PacientesResponse
    },
    staleTime: 60_000, // 1 min fresco
    gcTime: 10 * 60_000, // mantiene caché al volver
    refetchOnWindowFocus: false,
  })
}

export function useCreatePacienteMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: PacienteCreateDTO) => {
      // Generate idempotency key
      const idempotencyKey = `create-paciente-${Date.now()}-${Math.random()}`

      const response = await fetch("/api/pacientes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error ?? "Error al crear paciente")
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate all pacientes queries
      queryClient.invalidateQueries({ queryKey: ["pacientes"] })
    },
  })
}
