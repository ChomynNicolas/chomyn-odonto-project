"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import type { PacientesQueryParams, PacientesResponse } from "@/lib/api/pacientes.types"

async function fetchPacientes(params: PacientesQueryParams): Promise<PacientesResponse> {
  const searchParams = new URLSearchParams()

  if (params.q) searchParams.set("q", params.q)
  if (params.soloActivos !== undefined) searchParams.set("soloActivos", String(params.soloActivos))
  if (params.limit) searchParams.set("limit", String(params.limit))
  if (params.cursor) searchParams.set("cursor", String(params.cursor))

  const response = await fetch(`/api/pacientes?${searchParams.toString()}`)

  if (!response.ok) {
    throw new Error("Error al cargar pacientes")
  }

  return response.json()
}

export function usePacientes({
  q = "",
  soloActivos = true,
  limit = 20,
}: {
  q?: string
  soloActivos?: boolean
  limit?: number
}) {
  const query = useInfiniteQuery({
    queryKey: ["pacientes", q, soloActivos, limit],
    queryFn: ({ pageParam }) =>
      fetchPacientes({
        q,
        soloActivos,
        limit,
        cursor: pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as number | undefined,
  })

  const items = query.data?.pages.flatMap((page) => page.items) ?? []
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
