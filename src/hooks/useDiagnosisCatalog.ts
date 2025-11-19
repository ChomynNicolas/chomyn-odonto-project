// src/hooks/useDiagnosisCatalog.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  DiagnosisCatalogListQuery,
  DiagnosisCatalogCreateBody,
  DiagnosisCatalogUpdateBody,
  DiagnosisCatalogItem,
  DiagnosisCatalogListResponse,
} from "@/app/api/diagnosis-catalog/_schemas"
import {
  fetchDiagnosisCatalogs,
  fetchDiagnosisCatalog,
  createDiagnosisCatalog,
  updateDiagnosisCatalog,
  deleteDiagnosisCatalog,
  toggleDiagnosisCatalogActive,
} from "@/lib/api/diagnosis-catalog"

/**
 * Hook to fetch list of diagnosis catalogs
 */
export function useDiagnosisCatalogs(filters: DiagnosisCatalogListQuery) {
  return useQuery({
    queryKey: ["diagnosis-catalog", "list", filters],
    queryFn: () => fetchDiagnosisCatalogs(filters),
    staleTime: 60_000, // 1 min fresh
    gcTime: 10 * 60_000, // keep cache for 10 min
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook to fetch single diagnosis catalog by ID
 */
export function useDiagnosisCatalog(id: number | null | undefined) {
  return useQuery({
    queryKey: ["diagnosis-catalog", "detail", id],
    queryFn: () => {
      if (!id) throw new Error("ID is required")
      return fetchDiagnosisCatalog(id)
    },
    enabled: !!id,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook to create a new diagnosis catalog
 */
export function useCreateDiagnosisCatalog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: DiagnosisCatalogCreateBody) => createDiagnosisCatalog(data),
    onSuccess: () => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: ["diagnosis-catalog", "list"] })
    },
  })
}

/**
 * Hook to update a diagnosis catalog
 */
export function useUpdateDiagnosisCatalog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: DiagnosisCatalogUpdateBody }) =>
      updateDiagnosisCatalog(id, data),
    onSuccess: (_, variables) => {
      // Invalidate list and detail queries
      queryClient.invalidateQueries({ queryKey: ["diagnosis-catalog", "list"] })
      queryClient.invalidateQueries({ queryKey: ["diagnosis-catalog", "detail", variables.id] })
    },
  })
}

/**
 * Hook to delete a diagnosis catalog
 */
export function useDeleteDiagnosisCatalog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteDiagnosisCatalog(id),
    onSuccess: () => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: ["diagnosis-catalog", "list"] })
    },
  })
}

/**
 * Hook to toggle active status of a diagnosis catalog
 */
export function useToggleDiagnosisCatalogActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => toggleDiagnosisCatalogActive(id),
    onSuccess: (_, id) => {
      // Invalidate list and detail queries
      queryClient.invalidateQueries({ queryKey: ["diagnosis-catalog", "list"] })
      queryClient.invalidateQueries({ queryKey: ["diagnosis-catalog", "detail", id] })
    },
  })
}

