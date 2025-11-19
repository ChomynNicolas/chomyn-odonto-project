// src/lib/api/admin/roles.ts
/**
 * Cliente API para gestión de roles
 */

export interface RoleListItem {
  idRol: number
  nombreRol: "ADMIN" | "ODONT" | "RECEP"
  userCount: number
}

export interface RolesResponse {
  ok: boolean
  data: RoleListItem[]
  error?: string
}

/**
 * Obtiene la lista de roles con conteo de usuarios
 */
export async function fetchRoles(): Promise<RoleListItem[]> {
  const response = await fetch("/api/admin/roles", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const error: RolesResponse = await response.json()
    throw new Error(error.error || "Error al obtener roles")
  }

  const result: RolesResponse = await response.json()
  return result.data
}

