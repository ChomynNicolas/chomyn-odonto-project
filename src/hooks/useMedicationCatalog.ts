// src/hooks/useMedicationCatalog.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  MedicationCatalogListQuery,
  MedicationCatalogCreateBody,
  MedicationCatalogUpdateBody,
  MedicationCatalogItem,
} from "@/app/api/medication-catalog/_schemas"
import {
  fetchMedicationCatalogs,
  fetchMedicationCatalog,
  createMedicationCatalog,
  updateMedicationCatalog,
  deleteMedicationCatalog,
  deactivateMedicationCatalog,
} from "@/lib/api/medication-catalog"

/**
 * Hook to fetch list of medication catalogs
 */
export function useMedicationCatalogs(filters: MedicationCatalogListQuery) {
  return useQuery({
    queryKey: ["medication-catalog", "list", filters],
    queryFn: () => fetchMedicationCatalogs(filters),
    staleTime: 60_000, // 1 min fresh
    gcTime: 10 * 60_000, // keep cache for 10 min
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook to fetch single medication catalog by ID
 */
export function useMedicationCatalog(id: number | null | undefined) {
  return useQuery({
    queryKey: ["medication-catalog", "detail", id],
    queryFn: () => {
      if (!id) throw new Error("ID is required")
      return fetchMedicationCatalog(id)
    },
    enabled: !!id,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook to create a new medication catalog
 */
export function useCreateMedicationCatalog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: MedicationCatalogCreateBody) => createMedicationCatalog(data),
    onSuccess: () => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: ["medication-catalog", "list"] })
    },
  })
}

/**
 * Hook to update a medication catalog
 */
export function useUpdateMedicationCatalog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: MedicationCatalogUpdateBody }) =>
      updateMedicationCatalog(id, data),
    onSuccess: (_, variables) => {
      // Invalidate list and detail queries
      queryClient.invalidateQueries({ queryKey: ["medication-catalog", "list"] })
      queryClient.invalidateQueries({ queryKey: ["medication-catalog", "detail", variables.id] })
    },
  })
}

/**
 * Hook to delete a medication catalog
 */
export function useDeleteMedicationCatalog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteMedicationCatalog(id),
    onSuccess: () => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: ["medication-catalog", "list"] })
    },
  })
}

/**
 * Hook to deactivate a medication catalog
 */
export function useDeactivateMedicationCatalog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deactivateMedicationCatalog(id),
    onSuccess: (_, id) => {
      // Invalidate list and detail queries
      queryClient.invalidateQueries({ queryKey: ["medication-catalog", "list"] })
      queryClient.invalidateQueries({ queryKey: ["medication-catalog", "detail", id] })
    },
  })
}

