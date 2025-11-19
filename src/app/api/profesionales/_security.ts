// src/app/api/profesionales/_security.ts
/**
 * Validaciones de seguridad para operaciones de profesionales
 */

import { prisma } from "@/lib/prisma"

export interface SecurityValidationResult {
  ok: boolean
  error?: string
}

/**
 * Valida que el usuario tiene permisos para acceder/modificar un profesional
 */
export async function validateProfesionalAccess(
  profesionalId: number,
  actorId: number,
  actorRole: "ADMIN" | "ODONT" | "RECEP"
): Promise<SecurityValidationResult> {
  // ADMIN tiene acceso completo
  if (actorRole === "ADMIN") {
    return { ok: true }
  }

  // RECEP solo lectura
  if (actorRole === "RECEP") {
    return { ok: true }
  }

  // ODONT solo puede acceder a su propio registro
  if (actorRole === "ODONT") {
    const profesional = await prisma.profesional.findUnique({
      where: { idProfesional: profesionalId },
      select: { userId: true },
    })

    if (!profesional) {
      return { ok: false, error: "Profesional no encontrado" }
    }

    // Obtener el usuario del actor
    const actorUsuario = await prisma.usuario.findUnique({
      where: { idUsuario: actorId },
      select: { idUsuario: true },
    })

    if (!actorUsuario) {
      return { ok: false, error: "Usuario no encontrado" }
    }

    if (profesional.userId !== actorUsuario.idUsuario) {
      return {
        ok: false,
        error: "No tienes permisos para acceder a este profesional",
      }
    }

    return { ok: true }
  }

  return { ok: false, error: "Rol no autorizado" }
}

/**
 * Valida que un Usuario tiene rol ODONT
 */
export async function validateUsuarioODONT(userId: number): Promise<SecurityValidationResult> {
  const usuario = await prisma.usuario.findUnique({
    where: { idUsuario: userId },
    include: { rol: true },
  })

  if (!usuario) {
    return { ok: false, error: "Usuario no encontrado" }
  }

  if (usuario.rol.nombreRol !== "ODONT") {
    return {
      ok: false,
      error: `El usuario debe tener rol ODONT, pero tiene rol ${usuario.rol.nombreRol}`,
    }
  }

  return { ok: true }
}

/**
 * Valida constraints de unicidad para Profesional
 */
export async function validateUniqueness(
  numeroLicencia: string | null | undefined,
  userId: number,
  personaId: number,
  excludeId?: number
): Promise<SecurityValidationResult> {
  // Validar unicidad de numeroLicencia si se proporciona
  if (numeroLicencia) {
    const existingByLicencia = await prisma.profesional.findFirst({
      where: {
        numeroLicencia,
        ...(excludeId ? { idProfesional: { not: excludeId } } : {}),
      },
    })

    if (existingByLicencia) {
      return {
        ok: false,
        error: `Ya existe un profesional con el número de licencia ${numeroLicencia}`,
      }
    }
  }

  // Validar unicidad de userId (1:1)
  const existingByUserId = await prisma.profesional.findFirst({
    where: {
      userId,
      ...(excludeId ? { idProfesional: { not: excludeId } } : {}),
    },
  })

  if (existingByUserId) {
    return {
      ok: false,
      error: "Este usuario ya está vinculado a otro profesional",
    }
  }

  // Validar unicidad de personaId (1:1)
  const existingByPersonaId = await prisma.profesional.findFirst({
    where: {
      personaId,
      ...(excludeId ? { idProfesional: { not: excludeId } } : {}),
    },
  })

  if (existingByPersonaId) {
    return {
      ok: false,
      error: "Esta persona ya está vinculada a otro profesional",
    }
  }

  return { ok: true }
}

/**
 * Valida permisos para actualización (ODONT solo puede actualizar disponibilidad)
 */
export async function validateUpdatePermissions(
  profesionalId: number,
  actorId: number,
  actorRole: "ADMIN" | "ODONT" | "RECEP",
  updates: {
    numeroLicencia?: unknown
    estaActivo?: unknown
    disponibilidad?: unknown
    especialidadIds?: unknown
  }
): Promise<SecurityValidationResult> {
  // ADMIN puede actualizar todo
  if (actorRole === "ADMIN") {
    return { ok: true }
  }

  // RECEP no puede actualizar
  if (actorRole === "RECEP") {
    return { ok: false, error: "Los recepcionistas no pueden actualizar profesionales" }
  }

  // ODONT solo puede actualizar disponibilidad
  if (actorRole === "ODONT") {
    // Verificar que es su propio registro
    const accessCheck = await validateProfesionalAccess(profesionalId, actorId, actorRole)
    if (!accessCheck.ok) {
      return accessCheck
    }

    // Verificar que solo está intentando actualizar disponibilidad
    const hasOtherUpdates =
      updates.numeroLicencia !== undefined ||
      updates.estaActivo !== undefined ||
      updates.especialidadIds !== undefined

    if (hasOtherUpdates) {
      return {
        ok: false,
        error: "Los odontólogos solo pueden actualizar su disponibilidad",
      }
    }

    return { ok: true }
  }

  return { ok: false, error: "Rol no autorizado" }
}

