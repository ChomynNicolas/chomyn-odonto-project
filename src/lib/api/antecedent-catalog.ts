// src/lib/api/antecedent-catalog.ts
/**
 * Client-side API functions for Antecedent Catalog
 */

import type {
  AntecedentCatalogListQuery,
  AntecedentCatalogCreateBody,
  AntecedentCatalogUpdateBody,
  AntecedentCatalogItem,
  AntecedentCatalogListResponse,
} from "@/app/api/antecedent-catalog/_schemas"

type ApiResponse<T> = {
  ok: boolean
  data?: T
  error?: string
  message?: string
  details?: unknown
}

/**
 * Fetch list of antecedent catalogs
 */
export async function fetchAntecedentCatalogs(
  filters: AntecedentCatalogListQuery
): Promise<AntecedentCatalogListResponse> {
  const params = new URLSearchParams()
  
  params.set("page", String(filters.page))
  params.set("limit", String(filters.limit))
  if (filters.search) params.set("search", filters.search)
  if (filters.category) params.set("category", filters.category)
  if (filters.isActive && filters.isActive !== "all") params.set("isActive", filters.isActive)
  if (filters.sortBy) params.set("sortBy", filters.sortBy)
  if (filters.sortOrder) params.set("sortOrder", filters.sortOrder)

  const response = await fetch(`/api/antecedent-catalog?${params.toString()}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al cargar catálogo de antecedentes")
  }

  const result = await response.json()
  if (!result.ok || !result.data || !result.meta) {
    throw new Error("Respuesta inválida del servidor")
  }

  return result as AntecedentCatalogListResponse
}

/**
 * Fetch single antecedent catalog by ID
 */
export async function fetchAntecedentCatalog(id: number): Promise<AntecedentCatalogItem> {
  const response = await fetch(`/api/antecedent-catalog/${id}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al cargar antecedente")
  }

  const result: ApiResponse<AntecedentCatalogItem> = await response.json()
  if (!result.ok || !result.data) {
    throw new Error("Respuesta inválida del servidor")
  }

  return result.data
}

/**
 * Create a new antecedent catalog
 */
export async function createAntecedentCatalog(
  data: AntecedentCatalogCreateBody
): Promise<AntecedentCatalogItem> {
  const response = await fetch("/api/antecedent-catalog", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al crear antecedente")
  }

  const result: ApiResponse<AntecedentCatalogItem> = await response.json()
  if (!result.ok || !result.data) {
    throw new Error("Respuesta inválida del servidor")
  }

  return result.data
}

/**
 * Update a antecedent catalog
 */
export async function updateAntecedentCatalog(
  id: number,
  data: AntecedentCatalogUpdateBody
): Promise<AntecedentCatalogItem> {
  const response = await fetch(`/api/antecedent-catalog/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al actualizar antecedente")
  }

  const result: ApiResponse<AntecedentCatalogItem> = await response.json()
  if (!result.ok || !result.data) {
    throw new Error("Respuesta inválida del servidor")
  }

  return result.data
}

/**
 * Delete a antecedent catalog
 */
export async function deleteAntecedentCatalog(id: number): Promise<void> {
  const response = await fetch(`/api/antecedent-catalog/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al eliminar antecedente")
  }
}

/**
 * Toggle active status of a antecedent catalog
 */
export async function toggleAntecedentCatalogActive(id: number): Promise<AntecedentCatalogItem> {
  const response = await fetch(`/api/antecedent-catalog/${id}/toggle-active`, {
    method: "POST",
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al cambiar estado del antecedente")
  }

  const result: ApiResponse<AntecedentCatalogItem> = await response.json()
  if (!result.ok || !result.data) {
    throw new Error("Respuesta inválida del servidor")
  }

  return result.data
}

// Re-export types for convenience
export type {
  AntecedentCatalogListQuery,
  AntecedentCatalogCreateBody,
  AntecedentCatalogUpdateBody,
  AntecedentCatalogItem,
  AntecedentCatalogListResponse,
}

