// src/lib/api/admin/profesionales.ts
/**
 * Cliente API para gestión de profesionales
 */

import type { ProfesionalListItemDTO, ProfesionalDetailDTO, PersonaSearchResultDTO, UsuarioSearchResultDTO } from "@/app/api/profesionales/_dto"

export type ProfesionalListItem = ProfesionalListItemDTO
export type ProfesionalDetail = ProfesionalDetailDTO
export type PersonaSearchResult = PersonaSearchResultDTO
export type UsuarioSearchResult = UsuarioSearchResultDTO

export interface ProfesionalListResponse {
  ok: boolean
  data: ProfesionalListItem[]
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

export interface ProfesionalDetailResponse {
  ok: boolean
  data: ProfesionalDetail
  error?: string
}

export interface ProfesionalCreateInput {
  personaId: number
  userId: number
  numeroLicencia?: string | null
  estaActivo?: boolean
  disponibilidad?: {
    weekly?: {
      monday?: Array<{ start: string; end: string }>
      tuesday?: Array<{ start: string; end: string }>
      wednesday?: Array<{ start: string; end: string }>
      thursday?: Array<{ start: string; end: string }>
      friday?: Array<{ start: string; end: string }>
      saturday?: Array<{ start: string; end: string }>
      sunday?: Array<{ start: string; end: string }>
    }
    exceptions?: Array<{
      date: string
      timeRanges?: Array<{ start: string; end: string }>
      note?: string
    }>
    timezone?: string
  } | null
  especialidadIds?: number[]
}

export interface ProfesionalUpdateInput {
  numeroLicencia?: string | null
  estaActivo?: boolean
  disponibilidad?: {
    weekly?: {
      monday?: Array<{ start: string; end: string }>
      tuesday?: Array<{ start: string; end: string }>
      wednesday?: Array<{ start: string; end: string }>
      thursday?: Array<{ start: string; end: string }>
      friday?: Array<{ start: string; end: string }>
      saturday?: Array<{ start: string; end: string }>
      sunday?: Array<{ start: string; end: string }>
    }
    exceptions?: Array<{
      date: string
      timeRanges?: Array<{ start: string; end: string }>
      note?: string
    }>
    timezone?: string
  } | null
  especialidadIds?: number[]
}

export interface DisponibilidadUpdateInput {
  disponibilidad: {
    weekly?: {
      monday?: Array<{ start: string; end: string }>
      tuesday?: Array<{ start: string; end: string }>
      wednesday?: Array<{ start: string; end: string }>
      thursday?: Array<{ start: string; end: string }>
      friday?: Array<{ start: string; end: string }>
      saturday?: Array<{ start: string; end: string }>
      sunday?: Array<{ start: string; end: string }>
    }
    exceptions?: Array<{
      date: string
      timeRanges?: Array<{ start: string; end: string }>
      note?: string
    }>
    timezone?: string
  }
}

export interface ProfesionalListFilters {
  estaActivo?: boolean
  especialidadId?: number
  search?: string
  page?: number
  limit?: number
  sortBy?: "nombre" | "numeroLicencia" | "createdAt"
  sortOrder?: "asc" | "desc"
}

/**
 * Lista profesionales con filtros y paginación
 */
export async function fetchProfesionales(filters: ProfesionalListFilters = {}): Promise<ProfesionalListResponse> {
  const params = new URLSearchParams()

  if (filters.estaActivo !== undefined) params.set("estaActivo", filters.estaActivo.toString())
  if (filters.especialidadId) params.set("especialidadId", filters.especialidadId.toString())
  if (filters.search) params.set("search", filters.search)
  if (filters.page) params.set("page", filters.page.toString())
  if (filters.limit) params.set("limit", filters.limit.toString())
  if (filters.sortBy) params.set("sortBy", filters.sortBy)
  if (filters.sortOrder) params.set("sortOrder", filters.sortOrder)

  const response = await fetch(`/api/profesionales?${params.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Error al obtener profesionales")
  }

  return response.json()
}

/**
 * Obtiene el detalle de un profesional
 */
export async function fetchProfesional(id: number): Promise<ProfesionalDetail> {
  const response = await fetch(`/api/profesionales/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Error al obtener profesional")
  }

  const result: ProfesionalDetailResponse = await response.json()
  return result.data
}

/**
 * Crea un nuevo profesional
 */
export async function createProfesional(data: ProfesionalCreateInput): Promise<ProfesionalDetail> {
  const response = await fetch("/api/profesionales", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || "Error al crear profesional")
  }

  const result: ProfesionalDetailResponse = await response.json()
  return result.data
}

/**
 * Actualiza un profesional
 */
export async function updateProfesional(id: number, data: ProfesionalUpdateInput): Promise<ProfesionalDetail> {
  const response = await fetch(`/api/profesionales/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || "Error al actualizar profesional")
  }

  const result: ProfesionalDetailResponse = await response.json()
  return result.data
}

/**
 * Actualiza solo la disponibilidad de un profesional
 */
export async function updateProfesionalAvailability(
  id: number,
  data: DisponibilidadUpdateInput
): Promise<ProfesionalDetail> {
  const response = await fetch(`/api/profesionales/${id}/availability`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || "Error al actualizar disponibilidad")
  }

  const result: ProfesionalDetailResponse = await response.json()
  return result.data
}

/**
 * Activa o desactiva un profesional
 */
export async function toggleProfesionalActivo(
  id: number,
  estaActivo: boolean
): Promise<ProfesionalDetail> {
  const response = await fetch(`/api/profesionales/${id}/toggle-activo`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ estaActivo }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || "Error al cambiar estado del profesional")
  }

  const result: ProfesionalDetailResponse = await response.json()
  return result.data
}

/**
 * Busca personas para el wizard de creación
 */
export async function searchPersonas(query: string, limit: number = 20): Promise<PersonaSearchResult[]> {
  const params = new URLSearchParams()
  params.set("q", query)
  params.set("limit", limit.toString())

  const response = await fetch(`/api/profesionales/search/personas?${params.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Error al buscar personas")
  }

  const result = await response.json()
  return result.data
}

/**
 * Busca usuarios ODONT para el wizard de creación
 */
export async function searchUsuariosODONT(query: string, limit: number = 20): Promise<UsuarioSearchResult[]> {
  const params = new URLSearchParams()
  params.set("q", query)
  params.set("limit", limit.toString())

  const response = await fetch(`/api/profesionales/search/usuarios?${params.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Error al buscar usuarios")
  }

  const result = await response.json()
  return result.data
}

