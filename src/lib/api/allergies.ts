// src/lib/api/allergies.ts
/**
 * Client-side API functions for Allergy Catalog
 */

import type {
  AllergyCatalogListQuery,
  AllergyCatalogCreateBody,
  AllergyCatalogUpdateBody,
  AllergyCatalogItem,
  AllergyCatalogListResponse,
} from "@/app/api/allergies/_schemas"

type ApiResponse<T> = {
  ok: boolean
  data?: T
  error?: string
  message?: string
  details?: unknown
}

/**
 * Fetch list of allergy catalogs
 */
export async function fetchAllergyCatalogs(
  filters: AllergyCatalogListQuery
): Promise<AllergyCatalogListResponse> {
  const params = new URLSearchParams()

  params.set("page", String(filters.page))
  params.set("limit", String(filters.limit))
  if (filters.search) params.set("search", filters.search)
  if (filters.isActive && filters.isActive !== "all") params.set("isActive", filters.isActive)
  if (filters.sortBy) params.set("sortBy", filters.sortBy)
  if (filters.sortOrder) params.set("sortOrder", filters.sortOrder)

  const response = await fetch(`/api/allergies?${params.toString()}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al cargar catálogo de alergias")
  }

  const result = await response.json()
  if (!result.ok || !result.data || !result.meta) {
    throw new Error("Respuesta inválida del servidor")
  }

  return result as AllergyCatalogListResponse
}

/**
 * Fetch single allergy catalog by ID
 */
export async function fetchAllergyCatalog(id: number): Promise<AllergyCatalogItem> {
  const response = await fetch(`/api/allergies/${id}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al cargar alergia")
  }

  const result: ApiResponse<AllergyCatalogItem> = await response.json()
  if (!result.ok || !result.data) {
    throw new Error("Respuesta inválida del servidor")
  }

  return result.data
}

/**
 * Create a new allergy catalog
 */
export async function createAllergyCatalog(
  data: AllergyCatalogCreateBody
): Promise<AllergyCatalogItem> {
  const response = await fetch("/api/allergies", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al crear alergia")
  }

  const result: ApiResponse<AllergyCatalogItem> = await response.json()
  if (!result.ok || !result.data) {
    throw new Error("Respuesta inválida del servidor")
  }

  return result.data
}

/**
 * Update an allergy catalog
 */
export async function updateAllergyCatalog(
  id: number,
  data: AllergyCatalogUpdateBody
): Promise<AllergyCatalogItem> {
  const response = await fetch(`/api/allergies/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al actualizar alergia")
  }

  const result: ApiResponse<AllergyCatalogItem> = await response.json()
  if (!result.ok || !result.data) {
    throw new Error("Respuesta inválida del servidor")
  }

  return result.data
}

/**
 * Delete an allergy catalog
 */
export async function deleteAllergyCatalog(id: number): Promise<void> {
  const response = await fetch(`/api/allergies/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al eliminar alergia")
  }
}

/**
 * Toggle active status of an allergy catalog
 */
export async function toggleAllergyCatalogActive(id: number): Promise<AllergyCatalogItem> {
  const response = await fetch(`/api/allergies/${id}/toggle-active`, {
    method: "POST",
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al cambiar estado de la alergia")
  }

  const result: ApiResponse<AllergyCatalogItem> = await response.json()
  if (!result.ok || !result.data) {
    throw new Error("Respuesta inválida del servidor")
  }

  return result.data
}

// Re-export types for convenience
export type {
  AllergyCatalogListQuery,
  AllergyCatalogCreateBody,
  AllergyCatalogUpdateBody,
  AllergyCatalogItem,
  AllergyCatalogListResponse,
}

