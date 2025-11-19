// src/app/api/admin/users/_service.ts
/**
 * Servicio para gestión de usuarios
 */

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import type { UserListQuery, UserCreateBody, UserUpdateBody, PasswordResetBody } from "./_schemas"
import { validateUserUpdateSafety } from "./_security"
import { safeAuditWrite } from "@/lib/audit/log"
import { AuditAction, AuditEntity } from "@/lib/audit/actions"

/**
 * Lista usuarios con filtros, paginación y búsqueda
 */
export async function listUsers(filters: UserListQuery) {
  const { page, limit, rolId, estaActivo, search, sortBy, sortOrder } = filters
  const skip = (page - 1) * limit

  const where: {
    rolId?: number
    estaActivo?: boolean
    OR?: Array<{
      usuario?: { contains: string; mode: "insensitive" }
      nombreApellido?: { contains: string; mode: "insensitive" }
      email?: { contains: string; mode: "insensitive" }
    }>
  } = {}

  if (rolId) {
    where.rolId = rolId
  }

  if (estaActivo !== undefined) {
    where.estaActivo = estaActivo
  }

  if (search) {
    where.OR = [
      { usuario: { contains: search, mode: "insensitive" } },
      { nombreApellido: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ]
  }

  const [data, total] = await Promise.all([
    prisma.usuario.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      select: {
        idUsuario: true,
        usuario: true,
        email: true,
        nombreApellido: true,
        rolId: true,
        estaActivo: true,
        createdAt: true,
        updatedAt: true,
        ultimoLoginAt: true,
        rol: {
          select: {
            nombreRol: true,
          },
        },
        profesional: {
          select: {
            idProfesional: true,
          },
        },
      },
    }),
    prisma.usuario.count({ where }),
  ])

  // Convertir fechas a strings ISO para serialización
  const serializedData = data.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    ultimoLoginAt: user.ultimoLoginAt?.toISOString() || null,
  }))

  return {
    data: serializedData,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  }
}

/**
 * Obtiene un usuario por ID con información completa
 */
export async function getUserById(id: number) {
  const user = await prisma.usuario.findUnique({
    where: { idUsuario: id },
    select: {
      idUsuario: true,
      usuario: true,
      email: true,
      nombreApellido: true,
      rolId: true,
      estaActivo: true,
      createdAt: true,
      updatedAt: true,
      ultimoLoginAt: true,
      rol: {
        select: {
          idRol: true,
          nombreRol: true,
        },
      },
      profesional: {
        select: {
          idProfesional: true,
        },
      },
    },
  })

  return user
}

/**
 * Crea un nuevo usuario
 */
export async function createUser(
  body: UserCreateBody,
  actorId: number,
  headers?: Headers,
  path?: string
) {
  // Validar unicidad de usuario
  const existingUser = await prisma.usuario.findUnique({
    where: { usuario: body.usuario },
  })

  if (existingUser) {
    throw new Error("El nombre de usuario ya existe")
  }

  // Validar unicidad de email si se proporciona
  if (body.email) {
    const existingEmail = await prisma.usuario.findUnique({
      where: { email: body.email },
    })

    if (existingEmail) {
      throw new Error("El email ya está en uso")
    }
  }

  // Validar que el rol existe
  const role = await prisma.rol.findUnique({
    where: { idRol: body.rolId },
  })

  if (!role) {
    throw new Error("El rol especificado no existe")
  }

  // Hash de contraseña
  const passwordHash = await bcrypt.hash(body.password, 10)

  // Crear usuario
  const user = await prisma.usuario.create({
    data: {
      usuario: body.usuario,
      email: body.email || null,
      nombreApellido: body.nombreApellido,
      passwordHash,
      rolId: body.rolId,
      estaActivo: true,
    },
    select: {
      idUsuario: true,
      usuario: true,
      email: true,
      nombreApellido: true,
      rolId: true,
      estaActivo: true,
      createdAt: true,
      updatedAt: true,
      ultimoLoginAt: true,
      rol: {
        select: {
          nombreRol: true,
        },
      },
    },
  })

  // Log de auditoría
  await safeAuditWrite({
    actorId,
    action: AuditAction.USER_CREATE,
    entity: AuditEntity.Usuario,
    entityId: user.idUsuario,
    metadata: {
      usuario: user.usuario,
      email: user.email,
      nombreApellido: user.nombreApellido,
      rolId: user.rolId,
      rolNombre: user.rol.nombreRol,
    },
    headers,
    path,
  })

  return user
}

/**
 * Actualiza un usuario existente
 */
export async function updateUser(
  id: number,
  body: UserUpdateBody,
  actorId: number,
  headers?: Headers,
  path?: string
) {
  // Validar seguridad
  const securityCheck = await validateUserUpdateSafety(id, body, actorId)
  if (!securityCheck.ok) {
    throw new Error(securityCheck.error || "Validación de seguridad fallida")
  }

  // Obtener usuario actual para comparar cambios
  const currentUser = await prisma.usuario.findUnique({
    where: { idUsuario: id },
    include: { rol: true },
  })

  if (!currentUser) {
    throw new Error("Usuario no encontrado")
  }

  // Validar unicidad de usuario si se está cambiando
  if (body.usuario && body.usuario !== currentUser.usuario) {
    const existingUser = await prisma.usuario.findUnique({
      where: { usuario: body.usuario },
    })

    if (existingUser) {
      throw new Error("El nombre de usuario ya existe")
    }
  }

  // Validar unicidad de email si se está cambiando
  if (body.email !== undefined && body.email !== currentUser.email) {
    if (body.email) {
      const existingEmail = await prisma.usuario.findUnique({
        where: { email: body.email },
      })

      if (existingEmail) {
        throw new Error("El email ya está en uso")
      }
    }
  }

  // Validar rol si se está cambiando
  if (body.rolId && body.rolId !== currentUser.rolId) {
    const role = await prisma.rol.findUnique({
      where: { idRol: body.rolId },
    })

    if (!role) {
      throw new Error("El rol especificado no existe")
    }
  }

  // Preparar datos de actualización
  const updateData: {
    usuario?: string
    email?: string | null
    nombreApellido?: string
    rolId?: number
    estaActivo?: boolean
  } = {}

  if (body.usuario !== undefined) updateData.usuario = body.usuario
  if (body.email !== undefined) updateData.email = body.email
  if (body.nombreApellido !== undefined) updateData.nombreApellido = body.nombreApellido
  if (body.rolId !== undefined) updateData.rolId = body.rolId
  if (body.estaActivo !== undefined) updateData.estaActivo = body.estaActivo

  // Actualizar usuario
  const updatedUser = await prisma.usuario.update({
    where: { idUsuario: id },
    data: updateData,
    select: {
      idUsuario: true,
      usuario: true,
      email: true,
      nombreApellido: true,
      rolId: true,
      estaActivo: true,
      createdAt: true,
      updatedAt: true,
      ultimoLoginAt: true,
      rol: {
        select: {
          nombreRol: true,
        },
      },
    },
  })

  // Determinar tipo de acción para audit log
  let auditAction = AuditAction.USER_UPDATE
  const metadata: Record<string, unknown> = {
    changes: {},
  }

  // Detectar cambios específicos
  if (body.rolId !== undefined && body.rolId !== currentUser.rolId) {
    auditAction = AuditAction.USER_ROLE_CHANGE
    metadata.changes = {
      rolId: { old: currentUser.rolId, new: body.rolId },
      rolNombre: {
        old: currentUser.rol.nombreRol,
        new: updatedUser.rol.nombreRol,
      },
    }
  } else if (body.estaActivo !== undefined && body.estaActivo !== currentUser.estaActivo) {
    auditAction = body.estaActivo ? AuditAction.USER_REACTIVATE : AuditAction.USER_DEACTIVATE
    metadata.changes = {
      estaActivo: { old: currentUser.estaActivo, new: body.estaActivo },
    }
  } else {
    // Cambios generales
    const changes: Record<string, { old: unknown; new: unknown }> = {}
    if (body.usuario !== undefined && body.usuario !== currentUser.usuario) {
      changes.usuario = { old: currentUser.usuario, new: body.usuario }
    }
    if (body.email !== undefined && body.email !== currentUser.email) {
      changes.email = { old: currentUser.email, new: body.email }
    }
    if (body.nombreApellido !== undefined && body.nombreApellido !== currentUser.nombreApellido) {
      changes.nombreApellido = { old: currentUser.nombreApellido, new: body.nombreApellido }
    }
    if (Object.keys(changes).length > 0) {
      metadata.changes = changes
    }
  }

  // Log de auditoría
  await safeAuditWrite({
    actorId,
    action: auditAction,
    entity: AuditEntity.Usuario,
    entityId: id,
    metadata,
    headers,
    path,
  })

  return updatedUser
}

/**
 * Resetea la contraseña de un usuario
 */
export async function resetUserPassword(
  id: number,
  body: PasswordResetBody,
  actorId: number,
  headers?: Headers,
  path?: string
) {
  const user = await prisma.usuario.findUnique({
    where: { idUsuario: id },
  })

  if (!user) {
    throw new Error("Usuario no encontrado")
  }

  let temporaryPassword: string | undefined

  if (body.tipo === "temporary") {
    // Generar contraseña temporal aleatoria
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
    temporaryPassword = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")

    // Hash y actualizar contraseña
    const passwordHash = await bcrypt.hash(temporaryPassword, 10)
    await prisma.usuario.update({
      where: { idUsuario: id },
      data: { passwordHash },
    })
  } else {
    // Para reset_link, en el futuro se podría generar un token y enviarlo por email
    // Por ahora solo logueamos la acción
  }

  // Log de auditoría
  await safeAuditWrite({
    actorId,
    action: AuditAction.USER_PASSWORD_RESET_REQUEST,
    entity: AuditEntity.Usuario,
    entityId: id,
    metadata: {
      tipo: body.tipo,
      motivo: body.motivo,
      usuario: user.usuario,
    },
    headers,
    path,
  })

  return {
    success: true,
    tipo: body.tipo,
    temporaryPassword: body.tipo === "temporary" ? temporaryPassword : undefined,
  }
}

