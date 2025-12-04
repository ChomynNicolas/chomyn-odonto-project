// src/lib/api/treatment-plan-catalog.ts
/**
 * Client-side API functions for Treatment Plan Catalog
 */

import type {
  TreatmentPlanCatalogListQuery,
  TreatmentPlanCatalogCreateBody,
  TreatmentPlanCatalogUpdateBody,
  TreatmentPlanCatalogItem,
  TreatmentPlanCatalogListResponse,
} from "@/app/api/treatment-plan-catalog/_schemas"

type ApiResponse<T> = {
  ok: boolean
  data?: T
  error?: string
  message?: string
  details?: unknown
}

/**
 * Fetch list of treatment plan catalogs
 */
export async function fetchTreatmentPlanCatalogs(
  filters: TreatmentPlanCatalogListQuery
): Promise<TreatmentPlanCatalogListResponse> {
  const params = new URLSearchParams()
  
  params.set("page", String(filters.page))
  params.set("limit", String(filters.limit))
  if (filters.search) params.set("search", filters.search)
  if (filters.isActive && filters.isActive !== "all") params.set("isActive", filters.isActive)
  if (filters.sortBy) params.set("sortBy", filters.sortBy)
  if (filters.sortOrder) params.set("sortOrder", filters.sortOrder)

  const response = await fetch(`/api/treatment-plan-catalog?${params.toString()}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al cargar catálogo de planes de tratamiento")
  }

  const result = await response.json()
  if (!result.ok || !result.data || !result.meta) {
    throw new Error("Respuesta inválida del servidor")
  }

  return result as TreatmentPlanCatalogListResponse
}

/**
 * Fetch single treatment plan catalog by ID
 */
export async function fetchTreatmentPlanCatalog(id: number): Promise<TreatmentPlanCatalogItem> {
  const response = await fetch(`/api/treatment-plan-catalog/${id}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al cargar plan de tratamiento")
  }

  const result: ApiResponse<TreatmentPlanCatalogItem> = await response.json()
  if (!result.ok || !result.data) {
    throw new Error("Respuesta inválida del servidor")
  }

  return result.data
}

/**
 * Create a new treatment plan catalog
 */
export async function createTreatmentPlanCatalog(
  data: TreatmentPlanCatalogCreateBody
): Promise<TreatmentPlanCatalogItem> {
  const response = await fetch("/api/treatment-plan-catalog", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al crear plan de tratamiento")
  }

  const result: ApiResponse<TreatmentPlanCatalogItem> = await response.json()
  if (!result.ok || !result.data) {
    throw new Error("Respuesta inválida del servidor")
  }

  return result.data
}

/**
 * Update a treatment plan catalog
 */
export async function updateTreatmentPlanCatalog(
  id: number,
  data: TreatmentPlanCatalogUpdateBody
): Promise<TreatmentPlanCatalogItem> {
  const response = await fetch(`/api/treatment-plan-catalog/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al actualizar plan de tratamiento")
  }

  const result: ApiResponse<TreatmentPlanCatalogItem> = await response.json()
  if (!result.ok || !result.data) {
    throw new Error("Respuesta inválida del servidor")
  }

  return result.data
}

/**
 * Delete a treatment plan catalog
 */
export async function deleteTreatmentPlanCatalog(id: number): Promise<void> {
  const response = await fetch(`/api/treatment-plan-catalog/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al eliminar plan de tratamiento")
  }
}

/**
 * Toggle active status of a treatment plan catalog
 */
export async function toggleTreatmentPlanCatalogActive(id: number): Promise<TreatmentPlanCatalogItem> {
  // Note: This endpoint doesn't exist yet, we'll need to add it or use PUT with isActive
  const catalog = await fetchTreatmentPlanCatalog(id)
  return updateTreatmentPlanCatalog(id, { isActive: !catalog.isActive })
}

// Re-export types for convenience
export type {
  TreatmentPlanCatalogListQuery,
  TreatmentPlanCatalogCreateBody,
  TreatmentPlanCatalogUpdateBody,
  TreatmentPlanCatalogItem,
  TreatmentPlanCatalogListResponse,
}

