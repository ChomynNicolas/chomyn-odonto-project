// src/app/api/admin/users/_security.ts
/**
 * Validaciones de seguridad para operaciones de usuarios
 */

import { prisma } from "@/lib/prisma"
import type { UserUpdateBody } from "./_schemas"

export interface SecurityValidationResult {
  ok: boolean
  error?: string
  warning?: string
}

/**
 * Valida que las actualizaciones de usuario no violen reglas de seguridad
 */
export async function validateUserUpdateSafety(
  userId: number,
  updates: UserUpdateBody,
  actorId: number
): Promise<SecurityValidationResult> {
  // Obtener el usuario que se está actualizando
  const user = await prisma.usuario.findUnique({
    where: { idUsuario: userId },
    include: { rol: true },
  })

  if (!user) {
    return { ok: false, error: "Usuario no encontrado" }
  }

  // 1. No puede desactivarse a sí mismo
  if (updates.estaActivo === false && userId === actorId) {
    return {
      ok: false,
      error: "No puedes desactivar tu propia cuenta",
    }
  }

  // 2. No puede cambiar su propio rol de ADMIN a otro
  if (updates.rolId !== undefined && userId === actorId && user.rol.nombreRol === "ADMIN") {
    const newRole = await prisma.rol.findUnique({
      where: { idRol: updates.rolId },
    })

    if (newRole && newRole.nombreRol !== "ADMIN") {
      return {
        ok: false,
        error: "No puedes cambiar tu propio rol de ADMIN a otro rol",
      }
    }
  }

  // 3. No puede desactivar el último ADMIN activo
  if (updates.estaActivo === false && user.rol.nombreRol === "ADMIN") {
    const activeAdmins = await prisma.usuario.count({
      where: {
        estaActivo: true,
        rol: {
          nombreRol: "ADMIN",
        },
      },
    })

    if (activeAdmins <= 1) {
      return {
        ok: false,
        error: "No se puede desactivar el último administrador activo",
      }
    }
  }

  // 4. Warning si está cambiando el rol de otro usuario a ADMIN (opcional, solo warning)
  if (updates.rolId !== undefined && userId !== actorId) {
    const newRole = await prisma.rol.findUnique({
      where: { idRol: updates.rolId },
    })

    if (newRole && newRole.nombreRol === "ADMIN" && user.rol.nombreRol !== "ADMIN") {
      return {
        ok: true,
        warning: "Estás otorgando permisos de administrador a este usuario",
      }
    }
  }

  return { ok: true }
}

