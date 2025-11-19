// src/lib/api/diagnosis-catalog.ts
/**
 * Client-side API functions for Diagnosis Catalog
 */

import type {
  DiagnosisCatalogListQuery,
  DiagnosisCatalogCreateBody,
  DiagnosisCatalogUpdateBody,
  DiagnosisCatalogItem,
  DiagnosisCatalogListResponse,
} from "@/app/api/diagnosis-catalog/_schemas"

type ApiResponse<T> = {
  ok: boolean
  data?: T
  error?: string
  message?: string
  details?: unknown
}

/**
 * Fetch list of diagnosis catalogs
 */
export async function fetchDiagnosisCatalogs(
  filters: DiagnosisCatalogListQuery
): Promise<DiagnosisCatalogListResponse> {
  const params = new URLSearchParams()
  
  params.set("page", String(filters.page))
  params.set("limit", String(filters.limit))
  if (filters.search) params.set("search", filters.search)
  if (filters.isActive && filters.isActive !== "all") params.set("isActive", filters.isActive)
  if (filters.sortBy) params.set("sortBy", filters.sortBy)
  if (filters.sortOrder) params.set("sortOrder", filters.sortOrder)

  const response = await fetch(`/api/diagnosis-catalog?${params.toString()}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al cargar catálogo de diagnósticos")
  }

  const result = await response.json()
  if (!result.ok || !result.data || !result.meta) {
    throw new Error("Respuesta inválida del servidor")
  }

  return result as DiagnosisCatalogListResponse
}

/**
 * Fetch single diagnosis catalog by ID
 */
export async function fetchDiagnosisCatalog(id: number): Promise<DiagnosisCatalogItem> {
  const response = await fetch(`/api/diagnosis-catalog/${id}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al cargar diagnóstico")
  }

  const result: ApiResponse<DiagnosisCatalogItem> = await response.json()
  if (!result.ok || !result.data) {
    throw new Error("Respuesta inválida del servidor")
  }

  return result.data
}

/**
 * Create a new diagnosis catalog
 */
export async function createDiagnosisCatalog(
  data: DiagnosisCatalogCreateBody
): Promise<DiagnosisCatalogItem> {
  const response = await fetch("/api/diagnosis-catalog", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al crear diagnóstico")
  }

  const result: ApiResponse<DiagnosisCatalogItem> = await response.json()
  if (!result.ok || !result.data) {
    throw new Error("Respuesta inválida del servidor")
  }

  return result.data
}

/**
 * Update a diagnosis catalog
 */
export async function updateDiagnosisCatalog(
  id: number,
  data: DiagnosisCatalogUpdateBody
): Promise<DiagnosisCatalogItem> {
  const response = await fetch(`/api/diagnosis-catalog/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al actualizar diagnóstico")
  }

  const result: ApiResponse<DiagnosisCatalogItem> = await response.json()
  if (!result.ok || !result.data) {
    throw new Error("Respuesta inválida del servidor")
  }

  return result.data
}

/**
 * Delete a diagnosis catalog
 */
export async function deleteDiagnosisCatalog(id: number): Promise<void> {
  const response = await fetch(`/api/diagnosis-catalog/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al eliminar diagnóstico")
  }
}

/**
 * Toggle active status of a diagnosis catalog
 */
export async function toggleDiagnosisCatalogActive(id: number): Promise<DiagnosisCatalogItem> {
  const response = await fetch(`/api/diagnosis-catalog/${id}/toggle-active`, {
    method: "POST",
  })

  if (!response.ok) {
    const error: ApiResponse<never> = await response.json()
    throw new Error(error.message || error.error || "Error al cambiar estado del diagnóstico")
  }

  const result: ApiResponse<DiagnosisCatalogItem> = await response.json()
  if (!result.ok || !result.data) {
    throw new Error("Respuesta inválida del servidor")
  }

  return result.data
}

// Re-export types for convenience
export type {
  DiagnosisCatalogListQuery,
  DiagnosisCatalogCreateBody,
  DiagnosisCatalogUpdateBody,
  DiagnosisCatalogItem,
  DiagnosisCatalogListResponse,
}

