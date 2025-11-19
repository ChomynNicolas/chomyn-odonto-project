// src/lib/api/admin/procedimientos.ts
/**
 * Cliente API para gestión de procedimientos catalog
 */

export interface ProcedimientoItem {
  idProcedimiento: number
  code: string
  nombre: string
  descripcion: string | null
  defaultDurationMin: number | null
  defaultPriceCents: number | null
  aplicaDiente: boolean
  aplicaSuperficie: boolean
  activo: boolean
  createdAt: string
  updatedAt: string
  tratamientoStepsCount: number
  consultaProcedimientosCount: number
}

export interface ProcedimientoDetail extends ProcedimientoItem {
  canChangeCode: boolean
}

export interface ProcedimientoListResponse {
  ok: boolean
  data: ProcedimientoItem[]
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

export interface ProcedimientoDetailResponse {
  ok: boolean
  data: ProcedimientoDetail
  error?: string
}

export interface ProcedimientoCreateInput {
  code: string
  nombre: string
  descripcion?: string | null
  defaultDurationMin?: number | null
  defaultPriceCents?: number | null
  aplicaDiente?: boolean
  aplicaSuperficie?: boolean
  activo?: boolean
}

export interface ProcedimientoUpdateInput {
  code?: string
  nombre?: string
  descripcion?: string | null
  defaultDurationMin?: number | null
  defaultPriceCents?: number | null
  aplicaDiente?: boolean
  aplicaSuperficie?: boolean
  activo?: boolean
}

export interface ProcedimientoListFilters {
  page?: number
  limit?: number
  search?: string
  activo?: "true" | "false" | "all"
  sortBy?: "code" | "nombre" | "idProcedimiento" | "updatedAt"
  sortOrder?: "asc" | "desc"
}

export interface AuditLogEntry {
  idAuditLog: number
  action: string
  actor: {
    id: number
    nombre: string | null
    usuario: string
  }
  createdAt: string
  metadata: unknown
  ip: string | null
}

export interface AuditLogResponse {
  ok: boolean
  data: AuditLogEntry[]
  error?: string
}

/**
 * TanStack Query keys for procedimientos
 */
export const procedimientosKeys = {
  all: ["procedimientos"] as const,
  lists: () => [...procedimientosKeys.all, "list"] as const,
  list: (filters: ProcedimientoListFilters) => [...procedimientosKeys.lists(), filters] as const,
  details: () => [...procedimientosKeys.all, "detail"] as const,
  detail: (id: number) => [...procedimientosKeys.details(), id] as const,
  audit: (id: number) => [...procedimientosKeys.detail(id), "audit"] as const,
}

/**
 * Lista procedimientos con filtros y paginación
 */
export async function listProcedimientos(
  filters: ProcedimientoListFilters = {}
): Promise<ProcedimientoListResponse> {
  const params = new URLSearchParams()

  if (filters.page) params.set("page", filters.page.toString())
  if (filters.limit) params.set("limit", filters.limit.toString())
  if (filters.search) params.set("search", filters.search)
  if (filters.activo) params.set("activo", filters.activo)
  if (filters.sortBy) params.set("sortBy", filters.sortBy)
  if (filters.sortOrder) params.set("sortOrder", filters.sortOrder)

  const response = await fetch(`/api/admin/procedimientos?${params.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || "Error al obtener procedimientos")
  }

  return response.json()
}

/**
 * Obtiene el detalle de un procedimiento
 */
export async function getProcedimientoById(id: number): Promise<ProcedimientoDetail> {
  const response = await fetch(`/api/admin/procedimientos/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || "Error al obtener procedimiento")
  }

  const result: ProcedimientoDetailResponse = await response.json()
  return result.data
}

/**
 * Crea un nuevo procedimiento
 */
export async function createProcedimiento(
  data: ProcedimientoCreateInput
): Promise<ProcedimientoItem> {
  const response = await fetch("/api/admin/procedimientos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || "Error al crear procedimiento")
  }

  const result: ProcedimientoDetailResponse = await response.json()
  return result.data
}

/**
 * Actualiza un procedimiento
 */
export async function updateProcedimiento(
  id: number,
  data: ProcedimientoUpdateInput
): Promise<ProcedimientoItem> {
  const response = await fetch(`/api/admin/procedimientos/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || "Error al actualizar procedimiento")
  }

  const result: ProcedimientoDetailResponse = await response.json()
  return result.data
}

/**
 * Desactiva un procedimiento
 */
export async function deactivateProcedimiento(id: number): Promise<ProcedimientoItem> {
  const response = await fetch(`/api/admin/procedimientos/${id}/deactivate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || "Error al desactivar procedimiento")
  }

  const result: ProcedimientoDetailResponse = await response.json()
  return result.data
}

/**
 * Elimina un procedimiento (solo si no tiene referencias)
 */
export async function deleteProcedimiento(id: number): Promise<void> {
  const response = await fetch(`/api/admin/procedimientos/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || "Error al eliminar procedimiento")
  }
}

/**
 * Obtiene el log de auditoría de un procedimiento
 */
export async function getProcedimientoAuditLog(id: number): Promise<AuditLogEntry[]> {
  const response = await fetch(`/api/admin/procedimientos/${id}/audit`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || "Error al obtener log de auditoría")
  }

  const result: AuditLogResponse = await response.json()
  return result.data
}

