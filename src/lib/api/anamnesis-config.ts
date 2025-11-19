// src/lib/api/anamnesis-config.ts
/**
 * Cliente API para gestión de AnamnesisConfig
 */

export interface AnamnesisConfigItem {
  idAnamnesisConfig: number
  key: string
  value: unknown
  description: string | null
  updatedAt: string // ISO date string from API
  updatedBy: {
    idUsuario: number
    nombreApellido: string
    usuario: string
  }
}

export interface AnamnesisConfigListResponse {
  ok: boolean
  data: AnamnesisConfigItem[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  error?: string
}

export interface AnamnesisConfigDetailResponse {
  ok: boolean
  data: AnamnesisConfigItem
  error?: string
}

export interface AnamnesisConfigCreateInput {
  key: string
  value: unknown
  description?: string | null
}

export interface AnamnesisConfigUpdateInput {
  value: unknown
  description?: string | null
}

export interface AnamnesisConfigListFilters {
  page?: number
  limit?: number
  search?: string
  sortBy?: "key" | "idAnamnesisConfig" | "updatedAt"
  sortOrder?: "asc" | "desc"
}

/**
 * Lista configuraciones con filtros y paginación
 */
export async function fetchAnamnesisConfigs(
  filters: AnamnesisConfigListFilters = {}
): Promise<AnamnesisConfigListResponse> {
  const params = new URLSearchParams()

  if (filters.page) params.set("page", filters.page.toString())
  if (filters.limit) params.set("limit", filters.limit.toString())
  if (filters.search) params.set("search", filters.search)
  if (filters.sortBy) params.set("sortBy", filters.sortBy)
  if (filters.sortOrder) params.set("sortOrder", filters.sortOrder)

  const response = await fetch(`/api/anamnesis-config?${params.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Error al obtener configuraciones")
  }

  return response.json()
}

/**
 * Obtiene una configuración por ID
 */
export async function fetchAnamnesisConfig(id: number): Promise<AnamnesisConfigDetailResponse> {
  const response = await fetch(`/api/anamnesis-config/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Error al obtener configuración")
  }

  return response.json()
}

/**
 * Crea una nueva configuración
 */
export async function createAnamnesisConfig(
  input: AnamnesisConfigCreateInput
): Promise<AnamnesisConfigDetailResponse> {
  const response = await fetch("/api/anamnesis-config", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Error al crear configuración")
  }

  return response.json()
}

/**
 * Actualiza una configuración existente
 */
export async function updateAnamnesisConfig(
  id: number,
  input: AnamnesisConfigUpdateInput
): Promise<AnamnesisConfigDetailResponse> {
  const response = await fetch(`/api/anamnesis-config/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Error al actualizar configuración")
  }

  return response.json()
}

