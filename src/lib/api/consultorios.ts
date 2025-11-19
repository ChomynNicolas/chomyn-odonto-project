// src/lib/api/consultorios.ts
/**
 * Cliente API para gestión de consultorios
 */

export interface ConsultorioItem {
  idConsultorio: number
  nombre: string
  colorHex: string | null
  activo: boolean
  countFutureCitas: number
  createdAt: string // ISO date string from API
  updatedAt: string // ISO date string from API
}

export interface ConsultorioListResponse {
  ok: boolean
  data: ConsultorioItem[]
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

export interface ConsultorioDetailResponse {
  ok: boolean
  data: ConsultorioItem
  error?: string
}

export interface ConsultorioCreateInput {
  nombre: string
  colorHex?: string | null
  activo?: boolean
}

export interface ConsultorioUpdateInput {
  nombre?: string
  colorHex?: string | null
  activo?: boolean
}

export interface ConsultorioListFilters {
  page?: number
  limit?: number
  search?: string
  activo?: "true" | "false" | "all"
  sortBy?: "nombre" | "idConsultorio" | "createdAt"
  sortOrder?: "asc" | "desc"
}

/**
 * Lista consultorios con filtros y paginación
 */
export async function fetchConsultorios(filters: ConsultorioListFilters = {}): Promise<ConsultorioListResponse> {
  const params = new URLSearchParams()

  if (filters.page) params.set("page", filters.page.toString())
  if (filters.limit) params.set("limit", filters.limit.toString())
  if (filters.search) params.set("search", filters.search)
  if (filters.activo) params.set("activo", filters.activo)
  if (filters.sortBy) params.set("sortBy", filters.sortBy)
  if (filters.sortOrder) params.set("sortOrder", filters.sortOrder)

  const response = await fetch(`/api/consultorios?${params.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || "Error al obtener consultorios")
  }

  return response.json()
}

/**
 * Obtiene el detalle de un consultorio
 */
export async function fetchConsultorio(id: number): Promise<ConsultorioItem> {
  const response = await fetch(`/api/consultorios/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || "Error al obtener consultorio")
  }

  const result: ConsultorioDetailResponse = await response.json()
  return result.data
}

/**
 * Crea un nuevo consultorio
 */
export async function createConsultorio(data: ConsultorioCreateInput): Promise<ConsultorioItem> {
  const response = await fetch("/api/consultorios", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || "Error al crear consultorio")
  }

  const result: ConsultorioDetailResponse = await response.json()
  return result.data
}

/**
 * Actualiza un consultorio
 */
export async function updateConsultorio(id: number, data: ConsultorioUpdateInput): Promise<ConsultorioItem> {
  const response = await fetch(`/api/consultorios/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || "Error al actualizar consultorio")
  }

  const result: ConsultorioDetailResponse = await response.json()
  return result.data
}

/**
 * Elimina un consultorio
 */
export async function deleteConsultorio(id: number): Promise<void> {
  const response = await fetch(`/api/consultorios/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || "Error al eliminar consultorio")
  }
}

/**
 * Alterna el estado activo/inactivo de un consultorio
 */
export async function toggleConsultorioActivo(id: number, activo: boolean): Promise<ConsultorioItem> {
  return updateConsultorio(id, { activo })
}

