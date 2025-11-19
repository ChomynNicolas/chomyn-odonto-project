// src/lib/api/medication-catalog.ts
/**
 * Client-side API functions for Medication Catalog
 */

import type {
  MedicationCatalogListQuery,
  MedicationCatalogCreateBody,
  MedicationCatalogUpdateBody,
  MedicationCatalogItem,
  MedicationCatalogListResponse,
} from "@/app/api/medication-catalog/_schemas"

type ApiResponse<T> = {
  ok: boolean
  data?: T
  error?: string
  message?: string
  details?: unknown
}

/**
 * Fetch list of medication catalogs
 */
export async function fetchMedicationCatalogs(
  filters: MedicationCatalogListQuery
): Promise<MedicationCatalogListResponse> {
  const params = new URLSearchParams()

  params.set("page", String(filters.page))
  params.set("limit", String(filters.limit))
  if (filters.search) params.set("search", filters.search)
  if (filters.isActive && filters.isActive !== "all") params.set("isActive", filters.isActive)
  if (filters.sortBy) params.set("sortBy", filters.sortBy)
  if (filters.sortOrder) params.set("sortOrder", filters.sortOrder)

  const response = await fetch(`/api/medication-catalog?${params.toString()}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al cargar catálogo de medicamentos")
  }

  const result = await response.json()
  if (!result.ok || !result.data || !result.meta) {
    throw new Error("Respuesta inválida del servidor")
  }

  return result as MedicationCatalogListResponse
}

/**
 * Fetch single medication catalog by ID
 */
export async function fetchMedicationCatalog(id: number): Promise<MedicationCatalogItem> {
  const response = await fetch(`/api/medication-catalog/${id}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al cargar medicamento")
  }

  const result: ApiResponse<MedicationCatalogItem> = await response.json()
  if (!result.ok || !result.data) {
    throw new Error("Respuesta inválida del servidor")
  }

  return result.data
}

/**
 * Create a new medication catalog
 */
export async function createMedicationCatalog(
  data: MedicationCatalogCreateBody
): Promise<MedicationCatalogItem> {
  const response = await fetch("/api/medication-catalog", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al crear medicamento")
  }

  const result: ApiResponse<MedicationCatalogItem> = await response.json()
  if (!result.ok || !result.data) {
    throw new Error("Respuesta inválida del servidor")
  }

  return result.data
}

/**
 * Update an medication catalog
 */
export async function updateMedicationCatalog(
  id: number,
  data: MedicationCatalogUpdateBody
): Promise<MedicationCatalogItem> {
  const response = await fetch(`/api/medication-catalog/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al actualizar medicamento")
  }

  const result: ApiResponse<MedicationCatalogItem> = await response.json()
  if (!result.ok || !result.data) {
    throw new Error("Respuesta inválida del servidor")
  }

  return result.data
}

/**
 * Delete an medication catalog
 */
export async function deleteMedicationCatalog(id: number): Promise<void> {
  const response = await fetch(`/api/medication-catalog/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al eliminar medicamento")
  }
}

/**
 * Deactivate an medication catalog
 */
export async function deactivateMedicationCatalog(id: number): Promise<MedicationCatalogItem> {
  const response = await fetch(`/api/medication-catalog/${id}/deactivate`, {
    method: "PATCH",
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al desactivar medicamento")
  }

  const result: ApiResponse<MedicationCatalogItem> = await response.json()
  if (!result.ok || !result.data) {
    throw new Error("Respuesta inválida del servidor")
  }

  return result.data
}

// Re-export types for convenience
export type {
  MedicationCatalogListQuery,
  MedicationCatalogCreateBody,
  MedicationCatalogUpdateBody,
  MedicationCatalogItem,
  MedicationCatalogListResponse,
}

