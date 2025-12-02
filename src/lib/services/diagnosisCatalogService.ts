// src/lib/services/diagnosisCatalogService.ts
/**
 * Service layer for diagnosis catalog operations
 * Abstracts API calls and provides type-safe interfaces
 */

import type { DiagnosisCatalogItem } from "@/app/api/diagnosis-catalog/_schemas"

export interface DiagnosisCatalogFilters {
  search?: string
  isActive?: "true" | "false" | "all"
  page?: number
  limit?: number
  sortBy?: "code" | "name" | "idDiagnosisCatalog" | "createdAt"
  sortOrder?: "asc" | "desc"
}

export interface DiagnosisCatalogListResult {
  data: DiagnosisCatalogItem[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * Fetches diagnosis catalog items with optional filters
 */
export async function fetchDiagnosisCatalog(
  filters: DiagnosisCatalogFilters = {}
): Promise<DiagnosisCatalogListResult> {
  const params = new URLSearchParams()
  
  if (filters.search) params.set("search", filters.search)
  if (filters.isActive) params.set("isActive", filters.isActive)
  params.set("page", String(filters.page ?? 1))
  params.set("limit", String(filters.limit ?? 50))
  params.set("sortBy", filters.sortBy ?? "code")
  params.set("sortOrder", filters.sortOrder ?? "asc")

  const response = await fetch(`/api/diagnosis-catalog?${params.toString()}`)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(error.error || `Failed to fetch diagnosis catalog: ${response.status}`)
  }

  const result = await response.json()
  
  if (!result.ok) {
    throw new Error(result.error || "Failed to fetch diagnosis catalog")
  }

  return {
    data: result.data,
    meta: result.meta,
  }
}

/**
 * Fetches all active diagnosis catalog items (no pagination)
 * Useful for dropdowns and autocomplete
 */
export async function fetchAllActiveDiagnoses(): Promise<DiagnosisCatalogItem[]> {
  const result = await fetchDiagnosisCatalog({
    isActive: "true",
    limit: 1000, // Large limit to get all active items
    sortBy: "name",
    sortOrder: "asc",
  })
  
  return result.data
}

/**
 * Searches diagnosis catalog by query string
 * Optimized for autocomplete/search scenarios
 */
export async function searchDiagnoses(query: string, limit = 20): Promise<DiagnosisCatalogItem[]> {
  if (!query.trim()) {
    return []
  }

  const result = await fetchDiagnosisCatalog({
    search: query.trim(),
    isActive: "true",
    limit,
    sortBy: "name",
    sortOrder: "asc",
  })

  return result.data
}

