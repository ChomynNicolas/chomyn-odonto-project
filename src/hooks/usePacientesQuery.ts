import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { PacientesResponse, PacienteListFilters, PacienteCreateDTO, PacienteListItemDTO, PacienteItem } from "@/lib/api/pacientes.types"

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

/**
 * Mapea PacienteListItemDTO a PacienteItem para compatibilidad con componentes legacy
 */
function mapPacienteListItemToPacienteItem(dto: PacienteListItemDTO): PacienteItem {
  return {
    idPaciente: dto.idPaciente,
    estaActivo: dto.estaActivo,
    persona: {
      nombres: dto.nombres,
      apellidos: dto.apellidos,
      fechaNacimiento: dto.fechaNacimiento,
      genero: dto.genero,
      documento: dto.documento
        ? {
            numero: dto.documento.numero,
            ruc: null, // RUC no está disponible en PacienteListItemDTO
          }
        : null,
      contactos: dto.contactoPrincipal
        ? [
            {
              tipo: dto.contactoPrincipal.tipo,
              valorNorm: dto.contactoPrincipal.valor,
              activo: true, // Asumimos activo si existe
            },
          ]
        : [],
    },
  }
}

/**
 * Hook para obtener pacientes con paginación infinita
 * Retorna un array plano de todos los items de todas las páginas
 */
export function usePacientes(params: { q?: string; soloActivos?: boolean; limit?: number }) {
  const filters: PacienteListFilters = {
    q: params.q,
    estaActivo: params.soloActivos ? true : undefined,
    limit: params.limit ?? 20,
  }

  const query = useInfiniteQuery({
    queryKey: ["pacientes", "infinite", filters],
    queryFn: async ({ pageParam }) => {
      const fetchFilters: PacienteListFilters = {
        ...filters,
        cursor: pageParam as string | undefined,
      }

      const urlParams = new URLSearchParams()
      if (fetchFilters.q) urlParams.set("q", fetchFilters.q)
      if (fetchFilters.estaActivo !== undefined) urlParams.set("estaActivo", String(fetchFilters.estaActivo))
      if (fetchFilters.limit) urlParams.set("limit", String(fetchFilters.limit))
      if (fetchFilters.cursor) urlParams.set("cursor", fetchFilters.cursor)

      const response = await fetch(`/api/pacientes?${urlParams}`, { cache: "no-store" })
      if (!response.ok) throw new Error("Error al cargar pacientes")
      return (await response.json()) as PacientesResponse
    },
    getNextPageParam: (lastPage) => {
      return lastPage.nextCursor ?? undefined
    },
    initialPageParam: undefined as string | undefined,
    staleTime: 60_000, // 1 min fresco
    gcTime: 10 * 60_000, // mantiene caché al volver
    refetchOnWindowFocus: false,
  })

  // Aplanar todas las páginas en un solo array de items
  const items: PacienteItem[] =
    query.data?.pages.flatMap((page) => page.items.map(mapPacienteListItemToPacienteItem)) ?? []

  // Determinar si hay más páginas
  const hasMore = query.data?.pages[query.data.pages.length - 1]?.hasMore ?? false

  return {
    items,
    hasMore,
    fetchNextPage: query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  }
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
