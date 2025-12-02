// src/app/api/diagnosis-catalog/_service.ts
/**
 * Servicio para gestión de diagnosis catalog
 */

import { prisma } from "@/lib/prisma"
import type {
  DiagnosisCatalogListQuery,
  DiagnosisCatalogCreateBody,
  DiagnosisCatalogUpdateBody,
  DiagnosisCatalogItem,
} from "./_schemas"
import { safeAuditWrite } from "@/lib/audit/log"
import { AuditAction, AuditEntity } from "@/lib/audit/actions"

/**
 * Lista diagnosis catalogs con filtros, paginación y búsqueda
 */
export async function listDiagnosisCatalogs(filters: DiagnosisCatalogListQuery) {
  const { page, limit, search, isActive, sortBy, sortOrder } = filters
  const skip = (page - 1) * limit

  const where: {
    isActive?: boolean
    OR?: Array<{ code?: { contains: string; mode: "insensitive" }; name?: { contains: string; mode: "insensitive" } }>
  } = {}

  // Filter by isActive
  if (isActive === "true") {
    where.isActive = true
  } else if (isActive === "false") {
    where.isActive = false
  }
  // "all" means no filter

  // Search filter (code or name)
  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ]
  }

  const [data, total] = await Promise.all([
    prisma.diagnosisCatalog.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        _count: {
          select: {
            patientDiagnoses: true,
          },
        },
      },
    }),
    prisma.diagnosisCatalog.count({ where }),
  ])

  const items: DiagnosisCatalogItem[] = data.map((dc) => ({
    idDiagnosisCatalog: dc.idDiagnosisCatalog,
    code: dc.code,
    name: dc.name,
    description: dc.description,
    isActive: dc.isActive,
    createdAt: dc.createdAt,
    updatedAt: dc.updatedAt,
    referenceCount: dc._count.patientDiagnoses,
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
 * Obtiene un diagnosis catalog por ID
 */
export async function getDiagnosisCatalogById(id: number): Promise<DiagnosisCatalogItem> {
  const diagnosisCatalog = await prisma.diagnosisCatalog.findUnique({
    where: { idDiagnosisCatalog: id },
    include: {
      _count: {
        select: {
          patientDiagnoses: true,
        },
      },
    },
  })

  if (!diagnosisCatalog) {
    throw new Error("Diagnosis catalog no encontrado")
  }

  return {
    idDiagnosisCatalog: diagnosisCatalog.idDiagnosisCatalog,
    code: diagnosisCatalog.code,
    name: diagnosisCatalog.name,
    description: diagnosisCatalog.description,
    isActive: diagnosisCatalog.isActive,
    createdAt: diagnosisCatalog.createdAt,
    updatedAt: diagnosisCatalog.updatedAt,
    referenceCount: diagnosisCatalog._count.patientDiagnoses,
  }
}

/**
 * Crea un nuevo diagnosis catalog
 */
export async function createDiagnosisCatalog(
  data: DiagnosisCatalogCreateBody,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<DiagnosisCatalogItem> {
  // Check uniqueness before insert
  const existing = await prisma.diagnosisCatalog.findUnique({
    where: { code: data.code },
  })

  if (existing) {
    throw new Error("Ya existe un diagnóstico con ese código")
  }

  try {
    const diagnosisCatalog = await prisma.diagnosisCatalog.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        isActive: data.isActive ?? true,
      },
      include: {
        _count: {
          select: {
            patientDiagnoses: true,
          },
        },
      },
    })

    // Audit log
    await safeAuditWrite({
      actorId,
      action: AuditAction.DIAGNOSIS_CATALOG_CREATE,
      entity: AuditEntity.DiagnosisCatalog,
      entityId: diagnosisCatalog.idDiagnosisCatalog,
      metadata: {
        code: diagnosisCatalog.code,
        name: diagnosisCatalog.name,
        description: diagnosisCatalog.description,
        isActive: diagnosisCatalog.isActive,
      },
      headers,
      path,
    })

    return {
      idDiagnosisCatalog: diagnosisCatalog.idDiagnosisCatalog,
      code: diagnosisCatalog.code,
      name: diagnosisCatalog.name,
      description: diagnosisCatalog.description,
      isActive: diagnosisCatalog.isActive,
      createdAt: diagnosisCatalog.createdAt,
      updatedAt: diagnosisCatalog.updatedAt,
      referenceCount: diagnosisCatalog._count.patientDiagnoses,
    }
  } catch (error: unknown) {
    const prismaError = error as { code?: string; meta?: { target?: string[] } }
    if (prismaError.code === "P2002" && prismaError.meta?.target?.includes("code")) {
      throw new Error("Ya existe un diagnóstico con ese código")
    }
    throw error
  }
}

/**
 * Actualiza un diagnosis catalog existente
 */
export async function updateDiagnosisCatalog(
  id: number,
  data: DiagnosisCatalogUpdateBody,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<DiagnosisCatalogItem> {
  // Load existing record
  const existing = await prisma.diagnosisCatalog.findUnique({
    where: { idDiagnosisCatalog: id },
    include: {
      _count: {
        select: {
          patientDiagnoses: true,
        },
      },
    },
  })

  if (!existing) {
    throw new Error("Diagnosis catalog no encontrado")
  }

  // Check uniqueness if code is being changed
  if (data.code && data.code !== existing.code) {
    const duplicate = await prisma.diagnosisCatalog.findUnique({
      where: { code: data.code },
    })
    if (duplicate) {
      throw new Error("Ya existe un diagnóstico con ese código")
    }
  }

  // Track changes for audit
  const changes: Record<string, { old: unknown; new: unknown }> = {}

  if (data.code !== undefined && data.code !== existing.code) {
    changes.code = { old: existing.code, new: data.code }
  }

  if (data.name !== undefined && data.name !== existing.name) {
    changes.name = { old: existing.name, new: data.name }
  }

  if (data.description !== undefined && data.description !== existing.description) {
    changes.description = { old: existing.description, new: data.description }
  }

  if (data.isActive !== undefined && data.isActive !== existing.isActive) {
    changes.isActive = { old: existing.isActive, new: data.isActive }
  }

  try {
    // Build update data, only including fields that are explicitly provided
    const updateData: {
      code?: string
      name?: string
      description?: string | null
      isActive?: boolean
    } = {}

    if (data.code !== undefined) updateData.code = data.code
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    const updated = await prisma.diagnosisCatalog.update({
      where: { idDiagnosisCatalog: id },
      data: updateData,
      include: {
        _count: {
          select: {
            patientDiagnoses: true,
          },
        },
      },
    })

    // Determine audit action based on isActive change
    let auditAction: typeof AuditAction[keyof typeof AuditAction] = AuditAction.DIAGNOSIS_CATALOG_UPDATE
    if (changes.isActive) {
      auditAction = changes.isActive.new === true
        ? AuditAction.DIAGNOSIS_CATALOG_REACTIVATE
        : AuditAction.DIAGNOSIS_CATALOG_DEACTIVATE
    }

    // Audit log
    await safeAuditWrite({
      actorId,
      action: auditAction,
      entity: AuditEntity.DiagnosisCatalog,
      entityId: id,
      metadata: {
        changes: Object.keys(changes).length > 0 ? changes : undefined,
      },
      headers,
      path,
    })

    return {
      idDiagnosisCatalog: updated.idDiagnosisCatalog,
      code: updated.code,
      name: updated.name,
      description: updated.description,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      referenceCount: updated._count.patientDiagnoses,
    }
  } catch (error: unknown) {
    const prismaError = error as { code?: string; meta?: { target?: string[] } }
    if (prismaError.code === "P2002" && prismaError.meta?.target?.includes("code")) {
      throw new Error("Ya existe un diagnóstico con ese código")
    }
    throw error
  }
}

/**
 * Alterna el estado activo/inactivo de un diagnosis catalog
 */
export async function toggleDiagnosisCatalogActive(
  id: number,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<DiagnosisCatalogItem> {
  const existing = await prisma.diagnosisCatalog.findUnique({
    where: { idDiagnosisCatalog: id },
    include: {
      _count: {
        select: {
          patientDiagnoses: true,
        },
      },
    },
  })

  if (!existing) {
    throw new Error("Diagnosis catalog no encontrado")
  }

  const newIsActive = !existing.isActive

  const updated = await prisma.diagnosisCatalog.update({
    where: { idDiagnosisCatalog: id },
    data: { isActive: newIsActive },
    include: {
      _count: {
        select: {
          patientDiagnoses: true,
        },
      },
    },
  })

  // Audit log
  await safeAuditWrite({
    actorId,
    action: newIsActive ? AuditAction.DIAGNOSIS_CATALOG_REACTIVATE : AuditAction.DIAGNOSIS_CATALOG_DEACTIVATE,
    entity: AuditEntity.DiagnosisCatalog,
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
    idDiagnosisCatalog: updated.idDiagnosisCatalog,
    code: updated.code,
    name: updated.name,
    description: updated.description,
    isActive: updated.isActive,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    referenceCount: updated._count.patientDiagnoses,
  }
}

/**
 * Elimina un diagnosis catalog (hard delete)
 * Solo permite eliminar si no tiene referencias en PatientDiagnosis
 */
export async function deleteDiagnosisCatalog(
  id: number,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<void> {
  const diagnosisCatalog = await prisma.diagnosisCatalog.findUnique({
    where: { idDiagnosisCatalog: id },
    include: {
      _count: {
        select: {
          patientDiagnoses: true,
        },
      },
    },
  })

  if (!diagnosisCatalog) {
    throw new Error("Diagnosis catalog no encontrado")
  }

  // Check if there are PatientDiagnosis references
  if (diagnosisCatalog._count.patientDiagnoses > 0) {
    throw new Error(
      `No se puede eliminar porque está siendo utilizado en ${diagnosisCatalog._count.patientDiagnoses} diagnóstico(s) de paciente(s). Use 'Desactivar' en su lugar.`
    )
  }

  // Store metadata before deletion
  const metadata = {
    code: diagnosisCatalog.code,
    name: diagnosisCatalog.name,
    description: diagnosisCatalog.description,
    referenceCount: diagnosisCatalog._count.patientDiagnoses,
  }

  await prisma.diagnosisCatalog.delete({
    where: { idDiagnosisCatalog: id },
  })

  // Audit log
  await safeAuditWrite({
    actorId,
    action: AuditAction.DIAGNOSIS_CATALOG_DELETE,
    entity: AuditEntity.DiagnosisCatalog,
    entityId: id,
    metadata,
    headers,
    path,
  })
}

