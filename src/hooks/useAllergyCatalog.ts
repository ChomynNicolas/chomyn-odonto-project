// src/hooks/useAllergyCatalog.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  AllergyCatalogListQuery,
  AllergyCatalogCreateBody,
  AllergyCatalogUpdateBody,
  AllergyCatalogItem,
  AllergyCatalogListResponse,
} from "@/app/api/allergies/_schemas"
import {
  fetchAllergyCatalogs,
  fetchAllergyCatalog,
  createAllergyCatalog,
  updateAllergyCatalog,
  deleteAllergyCatalog,
  toggleAllergyCatalogActive,
} from "@/lib/api/allergies"

/**
 * Hook to fetch list of allergy catalogs
 */
export function useAllergyCatalogs(filters: AllergyCatalogListQuery) {
  return useQuery({
    queryKey: ["allergies", "list", filters],
    queryFn: () => fetchAllergyCatalogs(filters),
    staleTime: 60_000, // 1 min fresh
    gcTime: 10 * 60_000, // keep cache for 10 min
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook to fetch single allergy catalog by ID
 */
export function useAllergyCatalog(id: number | null | undefined) {
  return useQuery({
    queryKey: ["allergies", "detail", id],
    queryFn: () => {
      if (!id) throw new Error("ID is required")
      return fetchAllergyCatalog(id)
    },
    enabled: !!id,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook to create a new allergy catalog
 */
export function useCreateAllergyCatalog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AllergyCatalogCreateBody) => createAllergyCatalog(data),
    onSuccess: () => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: ["allergies", "list"] })
    },
  })
}

/**
 * Hook to update an allergy catalog
 */
export function useUpdateAllergyCatalog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AllergyCatalogUpdateBody }) =>
      updateAllergyCatalog(id, data),
    onSuccess: (_, variables) => {
      // Invalidate list and detail queries
      queryClient.invalidateQueries({ queryKey: ["allergies", "list"] })
      queryClient.invalidateQueries({ queryKey: ["allergies", "detail", variables.id] })
    },
  })
}

/**
 * Hook to delete an allergy catalog
 */
export function useDeleteAllergyCatalog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteAllergyCatalog(id),
    onSuccess: () => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: ["allergies", "list"] })
    },
  })
}

/**
 * Hook to toggle active status of an allergy catalog
 */
export function useToggleAllergyCatalogActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => toggleAllergyCatalogActive(id),
    onSuccess: (_, id) => {
      // Invalidate list and detail queries
      queryClient.invalidateQueries({ queryKey: ["allergies", "list"] })
      queryClient.invalidateQueries({ queryKey: ["allergies", "detail", id] })
    },
  })
}

