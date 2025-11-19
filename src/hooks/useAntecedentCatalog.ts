// src/hooks/useAntecedentCatalog.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  AntecedentCatalogListQuery,
  AntecedentCatalogCreateBody,
  AntecedentCatalogUpdateBody,
  AntecedentCatalogItem,
  AntecedentCatalogListResponse,
} from "@/app/api/antecedent-catalog/_schemas"
import {
  fetchAntecedentCatalogs,
  fetchAntecedentCatalog,
  createAntecedentCatalog,
  updateAntecedentCatalog,
  deleteAntecedentCatalog,
  toggleAntecedentCatalogActive,
} from "@/lib/api/antecedent-catalog"

/**
 * Hook to fetch list of antecedent catalogs
 */
export function useAntecedentCatalogs(filters: AntecedentCatalogListQuery) {
  return useQuery({
    queryKey: ["antecedent-catalog", "list", filters],
    queryFn: () => fetchAntecedentCatalogs(filters),
    staleTime: 60_000, // 1 min fresh
    gcTime: 10 * 60_000, // keep cache for 10 min
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook to fetch single antecedent catalog by ID
 */
export function useAntecedentCatalog(id: number | null | undefined) {
  return useQuery({
    queryKey: ["antecedent-catalog", "detail", id],
    queryFn: () => {
      if (!id) throw new Error("ID is required")
      return fetchAntecedentCatalog(id)
    },
    enabled: !!id,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook to create a new antecedent catalog
 */
export function useCreateAntecedentCatalog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AntecedentCatalogCreateBody) => createAntecedentCatalog(data),
    onSuccess: () => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: ["antecedent-catalog", "list"] })
    },
  })
}

/**
 * Hook to update a antecedent catalog
 */
export function useUpdateAntecedentCatalog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AntecedentCatalogUpdateBody }) =>
      updateAntecedentCatalog(id, data),
    onSuccess: (_, variables) => {
      // Invalidate list and detail queries
      queryClient.invalidateQueries({ queryKey: ["antecedent-catalog", "list"] })
      queryClient.invalidateQueries({ queryKey: ["antecedent-catalog", "detail", variables.id] })
    },
  })
}

/**
 * Hook to delete a antecedent catalog
 */
export function useDeleteAntecedentCatalog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteAntecedentCatalog(id),
    onSuccess: () => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: ["antecedent-catalog", "list"] })
    },
  })
}

/**
 * Hook to toggle active status of a antecedent catalog
 */
export function useToggleAntecedentCatalogActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => toggleAntecedentCatalogActive(id),
    onSuccess: (_, id) => {
      // Invalidate list and detail queries
      queryClient.invalidateQueries({ queryKey: ["antecedent-catalog", "list"] })
      queryClient.invalidateQueries({ queryKey: ["antecedent-catalog", "detail", id] })
    },
  })
}

