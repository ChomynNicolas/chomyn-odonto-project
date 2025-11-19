// src/app/api/admin/especialidades/_service.ts
/**
 * Servicio para gestión de especialidades
 */

import { prisma } from "@/lib/prisma"
import type {
  EspecialidadListQuery,
  EspecialidadCreateBody,
  EspecialidadUpdateBody,
  EspecialidadItem,
} from "./_schemas"
import { safeAuditWrite } from "@/lib/audit/log"
import { AuditAction, AuditEntity } from "@/lib/audit/actions"
import type { Headers } from "next/headers"

/**
 * Lista especialidades con filtros, paginación y búsqueda
 */
export async function listEspecialidades(filters: EspecialidadListQuery) {
  const { page, limit, search, isActive, sortBy, sortOrder } = filters
  const skip = (page - 1) * limit

  const where: {
    isActive?: boolean
    nombre?: { contains: string; mode: "insensitive" }
  } = {}

  // Filter by isActive
  if (isActive === "true") {
    where.isActive = true
  } else if (isActive === "false") {
    where.isActive = false
  }
  // "all" means no filter

  // Search filter
  if (search) {
    where.nombre = { contains: search, mode: "insensitive" }
  }

  const [data, total] = await Promise.all([
    prisma.especialidad.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        _count: {
          select: {
            profesionales: true,
          },
        },
      },
    }),
    prisma.especialidad.count({ where }),
  ])

  const items: EspecialidadItem[] = data.map((esp) => ({
    idEspecialidad: esp.idEspecialidad,
    nombre: esp.nombre,
    descripcion: esp.descripcion,
    isActive: esp.isActive,
    profesionalCount: esp._count.profesionales,
  }))

  const totalPages = Math.ceil(total / limit)

  return {
    data: items,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  }
}

/**
 * Obtiene una especialidad por ID
 */
export async function getEspecialidadById(id: number): Promise<EspecialidadItem> {
  const especialidad = await prisma.especialidad.findUnique({
    where: { idEspecialidad: id },
    include: {
      _count: {
        select: {
          profesionales: true,
        },
      },
    },
  })

  if (!especialidad) {
    throw new Error("Especialidad no encontrada")
  }

  return {
    idEspecialidad: especialidad.idEspecialidad,
    nombre: especialidad.nombre,
    descripcion: especialidad.descripcion,
    isActive: especialidad.isActive,
    profesionalCount: especialidad._count.profesionales,
  }
}

/**
 * Crea una nueva especialidad
 */
export async function createEspecialidad(
  data: EspecialidadCreateBody,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<EspecialidadItem> {
  // Check uniqueness before insert
  const existing = await prisma.especialidad.findUnique({
    where: { nombre: data.nombre },
  })

  if (existing) {
    throw new Error("Ya existe una especialidad con ese nombre")
  }

  try {
    const especialidad = await prisma.especialidad.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion ?? null,
        isActive: data.isActive ?? true,
      },
      include: {
        _count: {
          select: {
            profesionales: true,
          },
        },
      },
    })

    // Audit log
    await safeAuditWrite({
      actorId,
      action: AuditAction.ESPECIALIDAD_CREATE,
      entity: AuditEntity.Especialidad,
      entityId: especialidad.idEspecialidad,
      metadata: {
        nombre: especialidad.nombre,
        descripcion: especialidad.descripcion,
        isActive: especialidad.isActive,
      },
      headers,
      path,
    })

    return {
      idEspecialidad: especialidad.idEspecialidad,
      nombre: especialidad.nombre,
      descripcion: especialidad.descripcion,
      isActive: especialidad.isActive,
      profesionalCount: especialidad._count.profesionales,
    }
  } catch (error: unknown) {
    const prismaError = error as { code?: string; meta?: { target?: string[] } }
    if (prismaError.code === "P2002" && prismaError.meta?.target?.includes("nombre")) {
      throw new Error("Ya existe una especialidad con ese nombre")
    }
    throw error
  }
}

/**
 * Actualiza una especialidad existente
 */
export async function updateEspecialidad(
  id: number,
  data: EspecialidadUpdateBody,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<EspecialidadItem> {
  // Load existing record
  const existing = await prisma.especialidad.findUnique({
    where: { idEspecialidad: id },
  })

  if (!existing) {
    throw new Error("Especialidad no encontrada")
  }

  // Check uniqueness if nombre is being changed
  if (data.nombre && data.nombre !== existing.nombre) {
    const duplicate = await prisma.especialidad.findUnique({
      where: { nombre: data.nombre },
    })
    if (duplicate) {
      throw new Error("Ya existe una especialidad con ese nombre")
    }
  }

  // Track changes for audit
  const changes: Record<string, { old: unknown; new: unknown }> = {}

  if (data.nombre !== undefined && data.nombre !== existing.nombre) {
    changes.nombre = { old: existing.nombre, new: data.nombre }
  }

  if (data.descripcion !== undefined && data.descripcion !== existing.descripcion) {
    changes.descripcion = { old: existing.descripcion, new: data.descripcion }
  }

  if (data.isActive !== undefined && data.isActive !== existing.isActive) {
    changes.isActive = { old: existing.isActive, new: data.isActive }
  }

  try {
    const updated = await prisma.especialidad.update({
      where: { idEspecialidad: id },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion ?? undefined,
        isActive: data.isActive,
      },
      include: {
        _count: {
          select: {
            profesionales: true,
          },
        },
      },
    })

    // Determine audit action based on isActive change
    let auditAction = AuditAction.ESPECIALIDAD_UPDATE
    if (changes.isActive) {
      auditAction = changes.isActive.new === true
        ? AuditAction.ESPECIALIDAD_REACTIVATE
        : AuditAction.ESPECIALIDAD_DEACTIVATE
    }

    // Audit log
    await safeAuditWrite({
      actorId,
      action: auditAction,
      entity: AuditEntity.Especialidad,
      entityId: id,
      metadata: {
        changes: Object.keys(changes).length > 0 ? changes : undefined,
      },
      headers,
      path,
    })

    return {
      idEspecialidad: updated.idEspecialidad,
      nombre: updated.nombre,
      descripcion: updated.descripcion,
      isActive: updated.isActive,
      profesionalCount: updated._count.profesionales,
    }
  } catch (error: unknown) {
    const prismaError = error as { code?: string; meta?: { target?: string[] } }
    if (prismaError.code === "P2002" && prismaError.meta?.target?.includes("nombre")) {
      throw new Error("Ya existe una especialidad con ese nombre")
    }
    throw error
  }
}

/**
 * Alterna el estado activo/inactivo de una especialidad
 */
export async function toggleEspecialidadActive(
  id: number,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<EspecialidadItem> {
  const existing = await prisma.especialidad.findUnique({
    where: { idEspecialidad: id },
  })

  if (!existing) {
    throw new Error("Especialidad no encontrada")
  }

  const newIsActive = !existing.isActive

  const updated = await prisma.especialidad.update({
    where: { idEspecialidad: id },
    data: { isActive: newIsActive },
    include: {
      _count: {
        select: {
          profesionales: true,
        },
      },
    },
  })

  // Audit log
  await safeAuditWrite({
    actorId,
    action: newIsActive ? AuditAction.ESPECIALIDAD_REACTIVATE : AuditAction.ESPECIALIDAD_DEACTIVATE,
    entity: AuditEntity.Especialidad,
    entityId: id,
    metadata: {
      changes: {
        isActive: { old: existing.isActive, new: newIsActive },
      },
    },
    headers,
    path,
  })

  return {
    idEspecialidad: updated.idEspecialidad,
    nombre: updated.nombre,
    descripcion: updated.descripcion,
    isActive: updated.isActive,
    profesionalCount: updated._count.profesionales,
  }
}

/**
 * Elimina una especialidad (hard delete)
 * Solo permite eliminar si no tiene profesionales asignados
 */
export async function deleteEspecialidad(
  id: number,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<void> {
  const especialidad = await prisma.especialidad.findUnique({
    where: { idEspecialidad: id },
    include: {
      _count: {
        select: {
          profesionales: true,
        },
      },
    },
  })

  if (!especialidad) {
    throw new Error("Especialidad no encontrada")
  }

  // Check if there are profesionales assigned
  if (especialidad._count.profesionales > 0) {
    throw new Error("No se puede eliminar porque tiene profesionales asignados")
  }

  // Store metadata before deletion
  const metadata = {
    nombre: especialidad.nombre,
    descripcion: especialidad.descripcion,
    profesionalCount: especialidad._count.profesionales,
  }

  await prisma.especialidad.delete({
    where: { idEspecialidad: id },
  })

  // Audit log
  await safeAuditWrite({
    actorId,
    action: AuditAction.ESPECIALIDAD_DELETE,
    entity: AuditEntity.Especialidad,
    entityId: id,
    metadata,
    headers,
    path,
  })
}

