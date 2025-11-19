// src/app/api/admin/procedimientos/_service.ts
/**
 * Servicio para gestión de procedimientos catalog
 */

import { prisma } from "@/lib/prisma"
import type {
  ProcedimientoListQuery,
  ProcedimientoCreateBody,
  ProcedimientoUpdateBody,
  ProcedimientoItem,
  ProcedimientoDetail,
} from "./_schemas"
import { safeAuditWrite } from "@/lib/audit/log"
import { AuditAction, AuditEntity } from "@/lib/audit/actions"
import type { Headers } from "next/headers"

/**
 * Lista procedimientos con filtros, paginación y búsqueda
 */
export async function listProcedimientos(filters: ProcedimientoListQuery) {
  const { page, limit, search, activo, sortBy, sortOrder } = filters
  const skip = (page - 1) * limit

  const where: {
    activo?: boolean
    OR?: Array<{
      code?: { contains: string; mode: "insensitive" }
      nombre?: { contains: string; mode: "insensitive" }
    }>
  } = {}

  // Filter by activo
  if (activo === "true") {
    where.activo = true
  } else if (activo === "false") {
    where.activo = false
  }
  // "all" means no filter

  // Search filter (by code or nombre)
  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { nombre: { contains: search, mode: "insensitive" } },
    ]
  }

  const [data, total] = await Promise.all([
    prisma.procedimientoCatalogo.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        _count: {
          select: {
            pasos: true,
            procedimientos: true,
          },
        },
      },
    }),
    prisma.procedimientoCatalogo.count({ where }),
  ])

  const items: ProcedimientoItem[] = data.map((proc) => ({
    idProcedimiento: proc.idProcedimiento,
    code: proc.code,
    nombre: proc.nombre,
    descripcion: proc.descripcion,
    defaultDurationMin: proc.defaultDurationMin,
    defaultPriceCents: proc.defaultPriceCents,
    aplicaDiente: proc.aplicaDiente,
    aplicaSuperficie: proc.aplicaSuperficie,
    activo: proc.activo,
    createdAt: proc.createdAt.toISOString(),
    updatedAt: proc.updatedAt.toISOString(),
    tratamientoStepsCount: proc._count.pasos,
    consultaProcedimientosCount: proc._count.procedimientos,
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
 * Obtiene un procedimiento por ID con información de referencias
 */
export async function getProcedimientoById(id: number): Promise<ProcedimientoDetail> {
  const procedimiento = await prisma.procedimientoCatalogo.findUnique({
    where: { idProcedimiento: id },
    include: {
      _count: {
        select: {
          pasos: true,
          procedimientos: true,
        },
      },
    },
  })

  if (!procedimiento) {
    throw new Error("Procedimiento no encontrado")
  }

  const hasReferences =
    procedimiento._count.pasos > 0 || procedimiento._count.procedimientos > 0

  return {
    idProcedimiento: procedimiento.idProcedimiento,
    code: procedimiento.code,
    nombre: procedimiento.nombre,
    descripcion: procedimiento.descripcion,
    defaultDurationMin: procedimiento.defaultDurationMin,
    defaultPriceCents: procedimiento.defaultPriceCents,
    aplicaDiente: procedimiento.aplicaDiente,
    aplicaSuperficie: procedimiento.aplicaSuperficie,
    activo: procedimiento.activo,
    createdAt: procedimiento.createdAt.toISOString(),
    updatedAt: procedimiento.updatedAt.toISOString(),
    tratamientoStepsCount: procedimiento._count.pasos,
    consultaProcedimientosCount: procedimiento._count.procedimientos,
    canChangeCode: !hasReferences,
  }
}

/**
 * Crea un nuevo procedimiento
 */
export async function createProcedimiento(
  data: ProcedimientoCreateBody,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<ProcedimientoItem> {
  // Check uniqueness before insert
  const existing = await prisma.procedimientoCatalogo.findUnique({
    where: { code: data.code },
  })

  if (existing) {
    throw new Error("Ya existe un procedimiento con ese código")
  }

  try {
    const procedimiento = await prisma.procedimientoCatalogo.create({
      data: {
        code: data.code,
        nombre: data.nombre,
        descripcion: data.descripcion ?? null,
        defaultDurationMin: data.defaultDurationMin ?? null,
        defaultPriceCents: data.defaultPriceCents ?? null,
        aplicaDiente: data.aplicaDiente ?? false,
        aplicaSuperficie: data.aplicaSuperficie ?? false,
        activo: data.activo ?? true,
      },
      include: {
        _count: {
          select: {
            pasos: true,
            procedimientos: true,
          },
        },
      },
    })

    // Audit log
    await safeAuditWrite({
      actorId,
      action: AuditAction.PROCEDIMIENTO_CREATE,
      entity: AuditEntity.ProcedimientoCatalogo,
      entityId: procedimiento.idProcedimiento,
      metadata: {
        code: procedimiento.code,
        nombre: procedimiento.nombre,
        defaultPriceCents: procedimiento.defaultPriceCents,
        defaultDurationMin: procedimiento.defaultDurationMin,
        aplicaDiente: procedimiento.aplicaDiente,
        aplicaSuperficie: procedimiento.aplicaSuperficie,
        activo: procedimiento.activo,
      },
      headers,
      path,
    })

    return {
      idProcedimiento: procedimiento.idProcedimiento,
      code: procedimiento.code,
      nombre: procedimiento.nombre,
      descripcion: procedimiento.descripcion,
      defaultDurationMin: procedimiento.defaultDurationMin,
      defaultPriceCents: procedimiento.defaultPriceCents,
      aplicaDiente: procedimiento.aplicaDiente,
      aplicaSuperficie: procedimiento.aplicaSuperficie,
      activo: procedimiento.activo,
      createdAt: procedimiento.createdAt.toISOString(),
      updatedAt: procedimiento.updatedAt.toISOString(),
      tratamientoStepsCount: procedimiento._count.pasos,
      consultaProcedimientosCount: procedimiento._count.procedimientos,
    }
  } catch (error: unknown) {
    const prismaError = error as { code?: string; meta?: { target?: string[] } }
    if (prismaError.code === "P2002" && prismaError.meta?.target?.includes("code")) {
      throw new Error("Ya existe un procedimiento con ese código")
    }
    throw error
  }
}

/**
 * Actualiza un procedimiento existente
 */
export async function updateProcedimiento(
  id: number,
  data: ProcedimientoUpdateBody,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<ProcedimientoItem> {
  // Load existing record with reference counts
  const existing = await prisma.procedimientoCatalogo.findUnique({
    where: { idProcedimiento: id },
    include: {
      _count: {
        select: {
          pasos: true,
          procedimientos: true,
        },
      },
    },
  })

  if (!existing) {
    throw new Error("Procedimiento no encontrado")
  }

  // Check if code can be changed (must have no references)
  const hasReferences = existing._count.pasos > 0 || existing._count.procedimientos > 0
  if (data.code && data.code !== existing.code && hasReferences) {
    throw new Error(
      "No se puede cambiar el código porque el procedimiento tiene referencias en tratamientos o consultas"
    )
  }

  // Check uniqueness if code is being changed
  if (data.code && data.code !== existing.code) {
    const duplicate = await prisma.procedimientoCatalogo.findUnique({
      where: { code: data.code },
    })
    if (duplicate) {
      throw new Error("Ya existe un procedimiento con ese código")
    }
  }

  // Track changes for audit (especially price, duration, flags)
  const changes: Record<string, { old: unknown; new: unknown }> = {}

  if (data.code !== undefined && data.code !== existing.code) {
    changes.code = { old: existing.code, new: data.code }
  }

  if (data.nombre !== undefined && data.nombre !== existing.nombre) {
    changes.nombre = { old: existing.nombre, new: data.nombre }
  }

  if (data.descripcion !== undefined && data.descripcion !== existing.descripcion) {
    changes.descripcion = { old: existing.descripcion, new: data.descripcion }
  }

  if (
    data.defaultPriceCents !== undefined &&
    data.defaultPriceCents !== existing.defaultPriceCents
  ) {
    changes.defaultPriceCents = {
      old: existing.defaultPriceCents,
      new: data.defaultPriceCents,
    }
  }

  if (
    data.defaultDurationMin !== undefined &&
    data.defaultDurationMin !== existing.defaultDurationMin
  ) {
    changes.defaultDurationMin = {
      old: existing.defaultDurationMin,
      new: data.defaultDurationMin,
    }
  }

  if (data.aplicaDiente !== undefined && data.aplicaDiente !== existing.aplicaDiente) {
    changes.aplicaDiente = { old: existing.aplicaDiente, new: data.aplicaDiente }
  }

  if (
    data.aplicaSuperficie !== undefined &&
    data.aplicaSuperficie !== existing.aplicaSuperficie
  ) {
    changes.aplicaSuperficie = { old: existing.aplicaSuperficie, new: data.aplicaSuperficie }
  }

  if (data.activo !== undefined && data.activo !== existing.activo) {
    changes.activo = { old: existing.activo, new: data.activo }
  }

  try {
    const updated = await prisma.procedimientoCatalogo.update({
      where: { idProcedimiento: id },
      data: {
        code: data.code,
        nombre: data.nombre,
        descripcion: data.descripcion ?? undefined,
        defaultDurationMin: data.defaultDurationMin ?? undefined,
        defaultPriceCents: data.defaultPriceCents ?? undefined,
        aplicaDiente: data.aplicaDiente,
        aplicaSuperficie: data.aplicaSuperficie,
        activo: data.activo,
      },
      include: {
        _count: {
          select: {
            pasos: true,
            procedimientos: true,
          },
        },
      },
    })

    // Audit log with change tracking
    await safeAuditWrite({
      actorId,
      action: AuditAction.PROCEDIMIENTO_UPDATE,
      entity: AuditEntity.ProcedimientoCatalogo,
      entityId: id,
      metadata: {
        changes: Object.keys(changes).length > 0 ? changes : undefined,
      },
      headers,
      path,
    })

    return {
      idProcedimiento: updated.idProcedimiento,
      code: updated.code,
      nombre: updated.nombre,
      descripcion: updated.descripcion,
      defaultDurationMin: updated.defaultDurationMin,
      defaultPriceCents: updated.defaultPriceCents,
      aplicaDiente: updated.aplicaDiente,
      aplicaSuperficie: updated.aplicaSuperficie,
      activo: updated.activo,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      tratamientoStepsCount: updated._count.pasos,
      consultaProcedimientosCount: updated._count.procedimientos,
    }
  } catch (error: unknown) {
    const prismaError = error as { code?: string; meta?: { target?: string[] } }
    if (prismaError.code === "P2002" && prismaError.meta?.target?.includes("code")) {
      throw new Error("Ya existe un procedimiento con ese código")
    }
    throw error
  }
}

/**
 * Desactiva un procedimiento (set activo=false)
 */
export async function deactivateProcedimiento(
  id: number,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<ProcedimientoItem> {
  const existing = await prisma.procedimientoCatalogo.findUnique({
    where: { idProcedimiento: id },
    include: {
      _count: {
        select: {
          pasos: true,
          procedimientos: true,
        },
      },
    },
  })

  if (!existing) {
    throw new Error("Procedimiento no encontrado")
  }

  if (!existing.activo) {
    throw new Error("El procedimiento ya está desactivado")
  }

  const updated = await prisma.procedimientoCatalogo.update({
    where: { idProcedimiento: id },
    data: { activo: false },
    include: {
      _count: {
        select: {
          pasos: true,
          procedimientos: true,
        },
      },
    },
  })

  // Audit log
  await safeAuditWrite({
    actorId,
    action: AuditAction.PROCEDIMIENTO_DEACTIVATE,
    entity: AuditEntity.ProcedimientoCatalogo,
    entityId: id,
    metadata: {
      changes: {
        activo: { old: existing.activo, new: false },
      },
      code: existing.code,
      nombre: existing.nombre,
    },
    headers,
    path,
  })

  return {
    idProcedimiento: updated.idProcedimiento,
    code: updated.code,
    nombre: updated.nombre,
    descripcion: updated.descripcion,
    defaultDurationMin: updated.defaultDurationMin,
    defaultPriceCents: updated.defaultPriceCents,
    aplicaDiente: updated.aplicaDiente,
    aplicaSuperficie: updated.aplicaSuperficie,
    activo: updated.activo,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    tratamientoStepsCount: updated._count.pasos,
    consultaProcedimientosCount: updated._count.procedimientos,
  }
}

/**
 * Elimina un procedimiento (hard delete)
 * Solo permite eliminar si no tiene referencias en TreatmentStep o ConsultaProcedimiento
 */
export async function deleteProcedimientoIfUnused(
  id: number,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<void> {
  const procedimiento = await prisma.procedimientoCatalogo.findUnique({
    where: { idProcedimiento: id },
    include: {
      _count: {
        select: {
          pasos: true,
          procedimientos: true,
        },
      },
    },
  })

  if (!procedimiento) {
    throw new Error("Procedimiento no encontrado")
  }

  // Check if there are references
  if (procedimiento._count.pasos > 0 || procedimiento._count.procedimientos > 0) {
    throw new Error(
      "No se puede eliminar porque tiene referencias en tratamientos o consultas. Use desactivar en su lugar."
    )
  }

  // Store metadata before deletion
  const metadata = {
    code: procedimiento.code,
    nombre: procedimiento.nombre,
    tratamientoStepsCount: procedimiento._count.pasos,
    consultaProcedimientosCount: procedimiento._count.procedimientos,
  }

  await prisma.procedimientoCatalogo.delete({
    where: { idProcedimiento: id },
  })

  // Audit log (note: entityId will reference a deleted record, but audit log preserves it)
  await safeAuditWrite({
    actorId,
    action: AuditAction.PROCEDIMIENTO_UPDATE, // Using UPDATE as DELETE action doesn't exist
    entity: AuditEntity.ProcedimientoCatalogo,
    entityId: id,
    metadata: {
      ...metadata,
      deleted: true,
    },
    headers,
    path,
  })
}

