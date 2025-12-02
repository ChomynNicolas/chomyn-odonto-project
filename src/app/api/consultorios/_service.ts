// src/app/api/consultorios/_service.ts
/**
 * Servicio para gestión de consultorios
 */

import { prisma } from "@/lib/prisma"
import type {
  ConsultorioListQuery,
  ConsultorioCreateBody,
  ConsultorioUpdateBody,
  ConsultorioItem,
} from "./_schemas"
import { safeAuditWrite } from "@/lib/audit/log"
import { AuditAction, AuditEntity } from "@/lib/audit/actions"
// Removed invalid import of type { Headers } from "next/headers"

/**
 * Lista consultorios con filtros, paginación, búsqueda y estadísticas
 */
export async function listConsultoriosWithStats(filters: ConsultorioListQuery) {
  const { page, limit, search, activo, sortBy, sortOrder } = filters
  const skip = (page - 1) * limit
  const now = new Date()

  const where: {
    activo?: boolean
    nombre?: { contains: string; mode: "insensitive" }
  } = {}

  // Filter by activo
  if (activo === "true") {
    where.activo = true
  } else if (activo === "false") {
    where.activo = false
  }
  // "all" means no filter

  // Search filter
  if (search) {
    where.nombre = { contains: search, mode: "insensitive" }
  }

  const [data, total] = await Promise.all([
    prisma.consultorio.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        citas: {
          where: {
            inicio: {
              gt: now,
            },
            estado: {
              in: ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"],
            },
          },
          select: {
            idCita: true,
          },
        },
      },
    }),
    prisma.consultorio.count({ where }),
  ])

  const items: ConsultorioItem[] = data.map((consultorio) => ({
    idConsultorio: consultorio.idConsultorio,
    nombre: consultorio.nombre,
    colorHex: consultorio.colorHex,
    activo: consultorio.activo,
    countFutureCitas: consultorio.citas.length,
    createdAt: consultorio.createdAt,
    updatedAt: consultorio.updatedAt,
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
 * Obtiene un consultorio por ID con estadísticas
 */
export async function getConsultorioById(id: number): Promise<ConsultorioItem> {
  const now = new Date()

  const consultorio = await prisma.consultorio.findUnique({
    where: { idConsultorio: id },
    include: {
      citas: {
        where: {
          inicio: {
            gt: now,
          },
          estado: {
            in: ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"],
          },
        },
        select: {
          idCita: true,
        },
      },
    },
  })

  if (!consultorio) {
    throw new Error("Consultorio no encontrado")
  }

  return {
    idConsultorio: consultorio.idConsultorio,
    nombre: consultorio.nombre,
    colorHex: consultorio.colorHex,
    activo: consultorio.activo,
    countFutureCitas: consultorio.citas.length,
    createdAt: consultorio.createdAt,
    updatedAt: consultorio.updatedAt,
  }
}

/**
 * Crea un nuevo consultorio
 */
export async function createConsultorio(
  data: ConsultorioCreateBody,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<ConsultorioItem> {
  // Check uniqueness before insert
  const existing = await prisma.consultorio.findUnique({
    where: { nombre: data.nombre },
  })

  if (existing) {
    throw new Error("Ya existe un consultorio con ese nombre")
  }

  try {
    const consultorio = await prisma.consultorio.create({
      data: {
        nombre: data.nombre,
        colorHex: data.colorHex ?? null,
        activo: data.activo ?? true,
      },
    })

    // Audit log
    await safeAuditWrite({
      actorId,
      action: AuditAction.CONSULTORIO_CREATE,
      entity: AuditEntity.Consultorio,
      entityId: consultorio.idConsultorio,
      metadata: {
        nombre: consultorio.nombre,
        colorHex: consultorio.colorHex,
        activo: consultorio.activo,
      },
      headers,
      path,
    })

    return {
      idConsultorio: consultorio.idConsultorio,
      nombre: consultorio.nombre,
      colorHex: consultorio.colorHex,
      activo: consultorio.activo,
      countFutureCitas: 0,
      createdAt: consultorio.createdAt,
      updatedAt: consultorio.updatedAt,
    }
  } catch (error: unknown) {
    const prismaError = error as { code?: string; meta?: { target?: string[] } }
    if (prismaError.code === "P2002" && prismaError.meta?.target?.includes("nombre")) {
      throw new Error("Ya existe un consultorio con ese nombre")
    }
    throw error
  }
}

/**
 * Actualiza un consultorio existente
 */
export async function updateConsultorio(
  id: number,
  data: ConsultorioUpdateBody,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<ConsultorioItem> {
  // Load existing record
  const existing = await prisma.consultorio.findUnique({
    where: { idConsultorio: id },
  })

  if (!existing) {
    throw new Error("Consultorio no encontrado")
  }

  // Check uniqueness if nombre is being changed
  if (data.nombre && data.nombre !== existing.nombre) {
    const duplicate = await prisma.consultorio.findUnique({
      where: { nombre: data.nombre },
    })
    if (duplicate) {
      throw new Error("Ya existe un consultorio con ese nombre")
    }
  }

  // If deactivating, check for future citas
  if (data.activo === false && existing.activo === true) {
    const now = new Date()
    const futureCitas = await prisma.cita.count({
      where: {
        consultorioId: id,
        inicio: {
          gt: now,
        },
        estado: {
          in: ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"],
        },
      },
    })

    if (futureCitas > 0) {
      throw new Error("No se puede desactivar porque tiene citas futuras programadas")
    }
  }

  // Track changes for audit
  const changes: Record<string, { old: unknown; new: unknown }> = {}

  if (data.nombre !== undefined && data.nombre !== existing.nombre) {
    changes.nombre = { old: existing.nombre, new: data.nombre }
  }

  if (data.colorHex !== undefined && data.colorHex !== existing.colorHex) {
    changes.colorHex = { old: existing.colorHex, new: data.colorHex }
  }

  if (data.activo !== undefined && data.activo !== existing.activo) {
    changes.activo = { old: existing.activo, new: data.activo }
  }

  try {
    const updated = await prisma.consultorio.update({
      where: { idConsultorio: id },
      data: {
        nombre: data.nombre,
        colorHex: data.colorHex ?? undefined,
        activo: data.activo,
      },
    })

    // Get count of future citas for response
    const now = new Date()
    const countFutureCitas = await prisma.cita.count({
      where: {
        consultorioId: id,
        inicio: {
          gt: now,
        },
        estado: {
          in: ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"],
        },
      },
    })

    // Determine audit action based on activo change
    let auditAction: typeof AuditAction[keyof typeof AuditAction] = AuditAction.CONSULTORIO_UPDATE
    if (changes.activo) {
      auditAction =
        changes.activo.new === true
          ? AuditAction.CONSULTORIO_REACTIVATE
          : AuditAction.CONSULTORIO_DEACTIVATE
    }

    // Audit log
    await safeAuditWrite({
      actorId,
      action: auditAction,
      entity: AuditEntity.Consultorio,
      entityId: id,
      metadata: {
        changes: Object.keys(changes).length > 0 ? changes : undefined,
      },
      headers,
      path,
    })

    return {
      idConsultorio: updated.idConsultorio,
      nombre: updated.nombre,
      colorHex: updated.colorHex,
      activo: updated.activo,
      countFutureCitas,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    }
  } catch (error: unknown) {
    const prismaError = error as { code?: string; meta?: { target?: string[] } }
    if (prismaError.code === "P2002" && prismaError.meta?.target?.includes("nombre")) {
      throw new Error("Ya existe un consultorio con ese nombre")
    }
    throw error
  }
}

/**
 * Alterna el estado activo/inactivo de un consultorio
 * Bloquea la desactivación si hay citas futuras
 */
export async function toggleConsultorioActivo(
  id: number,
  activo: boolean,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<ConsultorioItem> {
  const existing = await prisma.consultorio.findUnique({
    where: { idConsultorio: id },
  })

  if (!existing) {
    throw new Error("Consultorio no encontrado")
  }

  // If deactivating, check for future citas
  if (activo === false && existing.activo === true) {
    const now = new Date()
    const futureCitas = await prisma.cita.count({
      where: {
        consultorioId: id,
        inicio: {
          gt: now,
        },
        estado: {
          in: ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"],
        },
      },
    })

    if (futureCitas > 0) {
      throw new Error("No se puede desactivar porque tiene citas futuras programadas")
    }
  }

  const updated = await prisma.consultorio.update({
    where: { idConsultorio: id },
    data: { activo },
  })

  // Get count of future citas for response
  const now = new Date()
  const countFutureCitas = await prisma.cita.count({
    where: {
      consultorioId: id,
      inicio: {
        gt: now,
      },
      estado: {
        in: ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"],
      },
    },
  })

  // Audit log
  await safeAuditWrite({
    actorId,
    action: activo ? AuditAction.CONSULTORIO_REACTIVATE : AuditAction.CONSULTORIO_DEACTIVATE,
    entity: AuditEntity.Consultorio,
    entityId: id,
    metadata: {
      changes: {
        activo: { old: existing.activo, new: activo },
      },
    },
    headers,
    path,
  })

  return {
    idConsultorio: updated.idConsultorio,
    nombre: updated.nombre,
    colorHex: updated.colorHex,
    activo: updated.activo,
    countFutureCitas,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  }
}

/**
 * Elimina un consultorio (hard delete)
 * Solo permite eliminar si no tiene citas ni bloqueos asociados
 */
export async function deleteConsultorio(
  id: number,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<void> {
  const consultorio = await prisma.consultorio.findUnique({
    where: { idConsultorio: id },
    include: {
      _count: {
        select: {
          citas: true,
          BloqueoAgenda: true,
        },
      },
    },
  })

  if (!consultorio) {
    throw new Error("Consultorio no encontrado")
  }

  // Check if there are references in Cita or BloqueoAgenda
  if (consultorio._count.citas > 0 || consultorio._count.BloqueoAgenda > 0) {
    throw new Error("No se puede eliminar porque tiene citas o bloqueos asociados")
  }

  // Store metadata before deletion
  const metadata = {
    nombre: consultorio.nombre,
    colorHex: consultorio.colorHex,
    activo: consultorio.activo,
    citasCount: consultorio._count.citas,
    bloqueosCount: consultorio._count.BloqueoAgenda,
  }

  await prisma.consultorio.delete({
    where: { idConsultorio: id },
  })

  // Audit log
  await safeAuditWrite({
    actorId,
    action: AuditAction.CONSULTORIO_DELETE,
    entity: AuditEntity.Consultorio,
    entityId: id,
    metadata,
    headers,
    path,
  })
}

