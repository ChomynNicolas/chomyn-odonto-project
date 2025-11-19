// src/lib/api/admin/especialidades.ts
/**
 * Cliente API para gestión de especialidades
 */

export interface EspecialidadItem {
  idEspecialidad: number
  nombre: string
  descripcion: string | null
  isActive: boolean
  profesionalCount: number
}

export interface EspecialidadListResponse {
  ok: boolean
  data: EspecialidadItem[]
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

export interface EspecialidadDetailResponse {
  ok: boolean
  data: EspecialidadItem
  error?: string
}

export interface EspecialidadCreateInput {
  nombre: string
  descripcion?: string | null
  isActive?: boolean
}

export interface EspecialidadUpdateInput {
  nombre?: string
  descripcion?: string | null
  isActive?: boolean
}

export interface EspecialidadListFilters {
  page?: number
  limit?: number
  search?: string
  isActive?: "true" | "false" | "all"
  sortBy?: "nombre" | "idEspecialidad"
  sortOrder?: "asc" | "desc"
}

/**
 * Lista especialidades con filtros y paginación
 */
export async function fetchEspecialidades(filters: EspecialidadListFilters = {}): Promise<EspecialidadListResponse> {
  const params = new URLSearchParams()
  
  if (filters.page) params.set("page", filters.page.toString())
  if (filters.limit) params.set("limit", filters.limit.toString())
  if (filters.search) params.set("search", filters.search)
  if (filters.isActive) params.set("isActive", filters.isActive)
  if (filters.sortBy) params.set("sortBy", filters.sortBy)
  if (filters.sortOrder) params.set("sortOrder", filters.sortOrder)

  const response = await fetch(`/api/admin/especialidades?${params.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || "Error al obtener especialidades")
  }

  return response.json()
}

/**
 * Obtiene el detalle de una especialidad
 */
export async function fetchEspecialidad(id: number): Promise<EspecialidadItem> {
  const response = await fetch(`/api/admin/especialidades/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || "Error al obtener especialidad")
  }

  const result: EspecialidadDetailResponse = await response.json()
  return result.data
}

/**
 * Crea una nueva especialidad
 */
export async function createEspecialidad(data: EspecialidadCreateInput): Promise<EspecialidadItem> {
  const response = await fetch("/api/admin/especialidades", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || "Error al crear especialidad")
  }

  const result: EspecialidadDetailResponse = await response.json()
  return result.data
}

/**
 * Actualiza una especialidad
 */
export async function updateEspecialidad(id: number, data: EspecialidadUpdateInput): Promise<EspecialidadItem> {
  const response = await fetch(`/api/admin/especialidades/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || "Error al actualizar especialidad")
  }

  const result: EspecialidadDetailResponse = await response.json()
  return result.data
}

/**
 * Elimina una especialidad
 */
export async function deleteEspecialidad(id: number): Promise<void> {
  const response = await fetch(`/api/admin/especialidades/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || "Error al eliminar especialidad")
  }
}

/**
 * Alterna el estado activo/inactivo de una especialidad
 */
export async function toggleEspecialidadActive(id: number): Promise<EspecialidadItem> {
  // Use update endpoint to toggle isActive
  const current = await fetchEspecialidad(id)
  return updateEspecialidad(id, { isActive: !current.isActive })
}

