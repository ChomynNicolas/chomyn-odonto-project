// src/hooks/useTreatmentPlanCatalog.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  TreatmentPlanCatalogListQuery,
  TreatmentPlanCatalogCreateBody,
  TreatmentPlanCatalogUpdateBody,
} from "@/app/api/treatment-plan-catalog/_schemas"
import {
  fetchTreatmentPlanCatalogs,
  fetchTreatmentPlanCatalog,
  createTreatmentPlanCatalog,
  updateTreatmentPlanCatalog,
  deleteTreatmentPlanCatalog,
  toggleTreatmentPlanCatalogActive,
} from "@/lib/api/treatment-plan-catalog"

/**
 * Hook to fetch list of treatment plan catalogs
 */
export function useTreatmentPlanCatalogs(filters: TreatmentPlanCatalogListQuery) {
  return useQuery({
    queryKey: ["treatment-plan-catalog", "list", filters],
    queryFn: () => fetchTreatmentPlanCatalogs(filters),
    staleTime: 60_000, // 1 min fresh
    gcTime: 10 * 60_000, // keep cache for 10 min
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook to fetch single treatment plan catalog by ID
 */
export function useTreatmentPlanCatalog(id: number | null | undefined) {
  return useQuery({
    queryKey: ["treatment-plan-catalog", "detail", id],
    queryFn: () => {
      if (!id) throw new Error("ID is required")
      return fetchTreatmentPlanCatalog(id)
    },
    enabled: !!id,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook to create a new treatment plan catalog
 */
export function useCreateTreatmentPlanCatalog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: TreatmentPlanCatalogCreateBody) => createTreatmentPlanCatalog(data),
    onSuccess: () => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: ["treatment-plan-catalog", "list"] })
    },
  })
}

/**
 * Hook to update a treatment plan catalog
 */
export function useUpdateTreatmentPlanCatalog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TreatmentPlanCatalogUpdateBody }) =>
      updateTreatmentPlanCatalog(id, data),
    onSuccess: (_, variables) => {
      // Invalidate list and detail queries
      queryClient.invalidateQueries({ queryKey: ["treatment-plan-catalog", "list"] })
      queryClient.invalidateQueries({ queryKey: ["treatment-plan-catalog", "detail", variables.id] })
    },
  })
}

/**
 * Hook to delete a treatment plan catalog
 */
export function useDeleteTreatmentPlanCatalog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteTreatmentPlanCatalog(id),
    onSuccess: () => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: ["treatment-plan-catalog", "list"] })
    },
  })
}

/**
 * Hook to toggle active status of a treatment plan catalog
 */
export function useToggleTreatmentPlanCatalogActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => toggleTreatmentPlanCatalogActive(id),
    onSuccess: (_, id) => {
      // Invalidate list and detail queries
      queryClient.invalidateQueries({ queryKey: ["treatment-plan-catalog", "list"] })
      queryClient.invalidateQueries({ queryKey: ["treatment-plan-catalog", "detail", id] })
    },
  })
}

