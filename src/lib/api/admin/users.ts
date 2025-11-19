// src/lib/api/admin/users.ts
/**
 * Cliente API para gestión de usuarios
 */

export interface UserListItem {
  idUsuario: number
  usuario: string
  email: string | null
  nombreApellido: string
  rolId: number
  estaActivo: boolean
  createdAt: string
  updatedAt: string
  ultimoLoginAt: string | null
  rol: {
    nombreRol: string
  }
  profesional?: {
    idProfesional: number
  } | null
}

export interface UserDetail extends UserListItem {
  rol: {
    idRol: number
    nombreRol: string
  }
}

export interface UserListResponse {
  ok: boolean
  data: UserListItem[]
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

export interface UserDetailResponse {
  ok: boolean
  data: UserDetail
  error?: string
}

export interface UserCreateInput {
  usuario: string
  email?: string | null
  nombreApellido: string
  rolId: number
  password: string
}

export interface UserUpdateInput {
  usuario?: string
  email?: string | null
  nombreApellido?: string
  rolId?: number
  estaActivo?: boolean
}

export interface PasswordResetInput {
  tipo: "temporary" | "reset_link"
  motivo?: string
}

export interface UserListFilters {
  rolId?: number
  estaActivo?: boolean
  search?: string
  page?: number
  limit?: number
  sortBy?: "usuario" | "nombreApellido" | "createdAt" | "ultimoLoginAt"
  sortOrder?: "asc" | "desc"
}

/**
 * Lista usuarios con filtros y paginación
 */
export async function fetchUsers(filters: UserListFilters = {}): Promise<UserListResponse> {
  const params = new URLSearchParams()
  
  if (filters.rolId) params.set("rolId", filters.rolId.toString())
  if (filters.estaActivo !== undefined) params.set("estaActivo", filters.estaActivo.toString())
  if (filters.search) params.set("search", filters.search)
  if (filters.page) params.set("page", filters.page.toString())
  if (filters.limit) params.set("limit", filters.limit.toString())
  if (filters.sortBy) params.set("sortBy", filters.sortBy)
  if (filters.sortOrder) params.set("sortOrder", filters.sortOrder)

  const response = await fetch(`/api/admin/users?${params.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Error al obtener usuarios")
  }

  return response.json()
}

/**
 * Obtiene el detalle de un usuario
 */
export async function fetchUser(id: number): Promise<UserDetail> {
  const response = await fetch(`/api/admin/users/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Error al obtener usuario")
  }

  const result: UserDetailResponse = await response.json()
  return result.data
}

/**
 * Crea un nuevo usuario
 */
export async function createUser(data: UserCreateInput): Promise<UserDetail> {
  const response = await fetch("/api/admin/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || "Error al crear usuario")
  }

  const result: UserDetailResponse = await response.json()
  return result.data
}

/**
 * Actualiza un usuario
 */
export async function updateUser(id: number, data: UserUpdateInput): Promise<UserDetail> {
  const response = await fetch(`/api/admin/users/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || "Error al actualizar usuario")
  }

  const result: UserDetailResponse = await response.json()
  return result.data
}

/**
 * Resetea la contraseña de un usuario
 */
export async function resetPassword(id: number, data: PasswordResetInput): Promise<{ success: boolean; tipo: string; temporaryPassword?: string }> {
  const response = await fetch(`/api/admin/users/${id}/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || "Error al resetear contraseña")
  }

  const result = await response.json()
  return result.data
}

