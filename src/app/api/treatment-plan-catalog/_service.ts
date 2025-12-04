// src/app/api/treatment-plan-catalog/_service.ts
/**
 * Servicio para gestión de treatment plan catalog
 */

import { prisma } from "@/lib/prisma"
import type {
  TreatmentPlanCatalogListQuery,
  TreatmentPlanCatalogCreateBody,
  TreatmentPlanCatalogUpdateBody,
  TreatmentPlanCatalogItem,
} from "./_schemas"
import { safeAuditWrite } from "@/lib/audit/log"
import { AuditAction, AuditEntity } from "@/lib/audit/actions"

/**
 * Lista treatment plan catalogs con filtros, paginación y búsqueda
 */
export async function listTreatmentPlanCatalogs(filters: TreatmentPlanCatalogListQuery) {
  const { page, limit, search, isActive, sortBy, sortOrder } = filters
  const skip = (page - 1) * limit

  const where: {
    isActive?: boolean
    OR?: Array<{ code?: { contains: string; mode: "insensitive" }; nombre?: { contains: string; mode: "insensitive" } }>
  } = {}

  // Filter by isActive
  if (isActive === "true") {
    where.isActive = true
  } else if (isActive === "false") {
    where.isActive = false
  }
  // "all" means no filter

  // Search filter (code or nombre)
  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { nombre: { contains: search, mode: "insensitive" } },
    ]
  }

  const [data, total] = await Promise.all([
    prisma.treatmentPlanCatalog.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        steps: {
          orderBy: {
            order: "asc",
          },
        },
        _count: {
          select: {
            treatmentPlans: true,
          },
        },
      },
    }),
    prisma.treatmentPlanCatalog.count({ where }),
  ])

  const items: TreatmentPlanCatalogItem[] = data.map((tpc) => ({
    idTreatmentPlanCatalog: tpc.idTreatmentPlanCatalog,
    code: tpc.code,
    nombre: tpc.nombre,
    descripcion: tpc.descripcion,
    isActive: tpc.isActive,
    createdAt: tpc.createdAt,
    updatedAt: tpc.updatedAt,
    steps: tpc.steps.map((step) => ({
      idTreatmentPlanCatalogStep: step.idTreatmentPlanCatalogStep,
      catalogPlanId: step.catalogPlanId,
      order: step.order,
      procedureId: step.procedureId,
      serviceType: step.serviceType,
      toothNumber: step.toothNumber,
      toothSurface: step.toothSurface,
      estimatedDurationMin: step.estimatedDurationMin,
      estimatedCostCents: step.estimatedCostCents,
      priority: step.priority,
      notes: step.notes,
      requiresMultipleSessions: step.requiresMultipleSessions,
      totalSessions: step.totalSessions,
      currentSession: step.currentSession,
      createdAt: step.createdAt,
      updatedAt: step.updatedAt,
    })),
    referenceCount: tpc._count.treatmentPlans,
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
 * Obtiene un treatment plan catalog por ID
 */
export async function getTreatmentPlanCatalogById(id: number): Promise<TreatmentPlanCatalogItem> {
  const catalog = await prisma.treatmentPlanCatalog.findUnique({
    where: { idTreatmentPlanCatalog: id },
    include: {
      steps: {
        orderBy: {
          order: "asc",
        },
      },
      _count: {
        select: {
          treatmentPlans: true,
        },
      },
    },
  })

  if (!catalog) {
    throw new Error("Treatment plan catalog no encontrado")
  }

  return {
    idTreatmentPlanCatalog: catalog.idTreatmentPlanCatalog,
    code: catalog.code,
    nombre: catalog.nombre,
    descripcion: catalog.descripcion,
    isActive: catalog.isActive,
    createdAt: catalog.createdAt,
    updatedAt: catalog.updatedAt,
    steps: catalog.steps.map((step) => ({
      idTreatmentPlanCatalogStep: step.idTreatmentPlanCatalogStep,
      catalogPlanId: step.catalogPlanId,
      order: step.order,
      procedureId: step.procedureId,
      serviceType: step.serviceType,
      toothNumber: step.toothNumber,
      toothSurface: step.toothSurface,
      estimatedDurationMin: step.estimatedDurationMin,
      estimatedCostCents: step.estimatedCostCents,
      priority: step.priority,
      notes: step.notes,
      requiresMultipleSessions: step.requiresMultipleSessions,
      totalSessions: step.totalSessions,
      currentSession: step.currentSession,
      createdAt: step.createdAt,
      updatedAt: step.updatedAt,
    })),
    referenceCount: catalog._count.treatmentPlans,
  }
}

/**
 * Crea un nuevo treatment plan catalog
 */
export async function createTreatmentPlanCatalog(
  data: TreatmentPlanCatalogCreateBody,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<TreatmentPlanCatalogItem> {
  // Check uniqueness before insert
  const existing = await prisma.treatmentPlanCatalog.findUnique({
    where: { code: data.code },
  })

  if (existing) {
    throw new Error("Ya existe un plan de tratamiento con ese código")
  }

  try {
    const catalog = await prisma.treatmentPlanCatalog.create({
      data: {
        code: data.code,
        nombre: data.nombre,
        descripcion: data.descripcion ?? null,
        isActive: data.isActive ?? true,
        steps: {
          create: data.steps.map((step) => ({
            order: step.order,
            procedureId: step.procedureId ?? null,
            serviceType: step.serviceType ?? null,
            toothNumber: step.toothNumber ?? null,
            toothSurface: step.toothSurface ?? null,
            estimatedDurationMin: step.estimatedDurationMin ?? null,
            estimatedCostCents: step.estimatedCostCents ?? null,
            priority: step.priority ?? null,
            notes: step.notes ?? null,
            requiresMultipleSessions: step.requiresMultipleSessions ?? false,
            totalSessions: step.totalSessions ?? null,
            currentSession: step.currentSession ?? (step.requiresMultipleSessions ? 1 : null),
          })),
        },
      },
      include: {
        steps: {
          orderBy: {
            order: "asc",
          },
        },
        _count: {
          select: {
            treatmentPlans: true,
          },
        },
      },
    })

    // Audit log
    await safeAuditWrite({
      actorId,
      action: AuditAction.TREATMENT_PLAN_CATALOG_CREATE,
      entity: AuditEntity.TreatmentPlanCatalog,
      entityId: catalog.idTreatmentPlanCatalog,
      metadata: {
        code: catalog.code,
        nombre: catalog.nombre,
        descripcion: catalog.descripcion,
        isActive: catalog.isActive,
        stepsCount: catalog.steps.length,
      },
      headers,
      path,
    })

    return {
      idTreatmentPlanCatalog: catalog.idTreatmentPlanCatalog,
      code: catalog.code,
      nombre: catalog.nombre,
      descripcion: catalog.descripcion,
      isActive: catalog.isActive,
      createdAt: catalog.createdAt,
      updatedAt: catalog.updatedAt,
      steps: catalog.steps.map((step) => ({
        idTreatmentPlanCatalogStep: step.idTreatmentPlanCatalogStep,
        catalogPlanId: step.catalogPlanId,
        order: step.order,
        procedureId: step.procedureId,
        serviceType: step.serviceType,
        toothNumber: step.toothNumber,
        toothSurface: step.toothSurface,
        estimatedDurationMin: step.estimatedDurationMin,
        estimatedCostCents: step.estimatedCostCents,
        priority: step.priority,
        notes: step.notes,
        requiresMultipleSessions: step.requiresMultipleSessions,
        totalSessions: step.totalSessions,
        currentSession: step.currentSession,
        createdAt: step.createdAt,
        updatedAt: step.updatedAt,
      })),
      referenceCount: catalog._count.treatmentPlans,
    }
  } catch (error: unknown) {
    const prismaError = error as { code?: string; meta?: { target?: string[] } }
    if (prismaError.code === "P2002" && prismaError.meta?.target?.includes("code")) {
      throw new Error("Ya existe un plan de tratamiento con ese código")
    }
    throw error
  }
}

/**
 * Actualiza un treatment plan catalog existente
 */
export async function updateTreatmentPlanCatalog(
  id: number,
  data: TreatmentPlanCatalogUpdateBody,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<TreatmentPlanCatalogItem> {
  // Load existing record
  const existing = await prisma.treatmentPlanCatalog.findUnique({
    where: { idTreatmentPlanCatalog: id },
    include: {
      steps: {
        orderBy: {
          order: "asc",
        },
      },
      _count: {
        select: {
          treatmentPlans: true,
        },
      },
    },
  })

  if (!existing) {
    throw new Error("Treatment plan catalog no encontrado")
  }

  // Check uniqueness if code is being changed
  if (data.code && data.code !== existing.code) {
    const duplicate = await prisma.treatmentPlanCatalog.findUnique({
      where: { code: data.code },
    })
    if (duplicate) {
      throw new Error("Ya existe un plan de tratamiento con ese código")
    }
  }

  // Track changes for audit
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

  if (data.isActive !== undefined && data.isActive !== existing.isActive) {
    changes.isActive = { old: existing.isActive, new: data.isActive }
  }

  try {
    // Use transaction for steps update
    const updated = await prisma.$transaction(async (tx) => {
      // Build update data
      const updateData: {
        code?: string
        nombre?: string
        descripcion?: string | null
        isActive?: boolean
      } = {}

      if (data.code !== undefined) updateData.code = data.code
      if (data.nombre !== undefined) updateData.nombre = data.nombre
      if (data.descripcion !== undefined) updateData.descripcion = data.descripcion
      if (data.isActive !== undefined) updateData.isActive = data.isActive

      // Handle steps update if provided
      if (data.steps !== undefined) {
        // Delete existing steps
        await tx.treatmentPlanCatalogStep.deleteMany({
          where: { catalogPlanId: id },
        })

        // Create new steps
        await tx.treatmentPlanCatalogStep.createMany({
          data: data.steps.map((step) => ({
            catalogPlanId: id,
            order: step.order,
            procedureId: step.procedureId ?? null,
            serviceType: step.serviceType ?? null,
            toothNumber: step.toothNumber ?? null,
            toothSurface: step.toothSurface ?? null,
            estimatedDurationMin: step.estimatedDurationMin ?? null,
            estimatedCostCents: step.estimatedCostCents ?? null,
            priority: step.priority ?? null,
            notes: step.notes ?? null,
            requiresMultipleSessions: step.requiresMultipleSessions ?? false,
            totalSessions: step.totalSessions ?? null,
            currentSession: step.currentSession ?? (step.requiresMultipleSessions ? 1 : null),
          })),
        })
      }

      // Update catalog
      return tx.treatmentPlanCatalog.update({
        where: { idTreatmentPlanCatalog: id },
        data: updateData,
        include: {
          steps: {
            orderBy: {
              order: "asc",
            },
          },
          _count: {
            select: {
              treatmentPlans: true,
            },
          },
        },
      })
    })

    // Determine audit action based on isActive change
    let auditAction: typeof AuditAction[keyof typeof AuditAction] = AuditAction.TREATMENT_PLAN_CATALOG_UPDATE
    if (changes.isActive) {
      auditAction = changes.isActive.new === true
        ? AuditAction.TREATMENT_PLAN_CATALOG_REACTIVATE
        : AuditAction.TREATMENT_PLAN_CATALOG_DEACTIVATE
    }

    // Audit log
    await safeAuditWrite({
      actorId,
      action: auditAction,
      entity: AuditEntity.TreatmentPlanCatalog,
      entityId: id,
      metadata: {
        changes: Object.keys(changes).length > 0 ? changes : undefined,
        stepsUpdated: data.steps !== undefined,
      },
      headers,
      path,
    })

    return {
      idTreatmentPlanCatalog: updated.idTreatmentPlanCatalog,
      code: updated.code,
      nombre: updated.nombre,
      descripcion: updated.descripcion,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      steps: updated.steps.map((step) => ({
        idTreatmentPlanCatalogStep: step.idTreatmentPlanCatalogStep,
        catalogPlanId: step.catalogPlanId,
        order: step.order,
        procedureId: step.procedureId,
        serviceType: step.serviceType,
        toothNumber: step.toothNumber,
        toothSurface: step.toothSurface,
        estimatedDurationMin: step.estimatedDurationMin,
        estimatedCostCents: step.estimatedCostCents,
        priority: step.priority,
        notes: step.notes,
        requiresMultipleSessions: step.requiresMultipleSessions,
        totalSessions: step.totalSessions,
        currentSession: step.currentSession,
        createdAt: step.createdAt,
        updatedAt: step.updatedAt,
      })),
      referenceCount: updated._count.treatmentPlans,
    }
  } catch (error: unknown) {
    const prismaError = error as { code?: string; meta?: { target?: string[] } }
    if (prismaError.code === "P2002" && prismaError.meta?.target?.includes("code")) {
      throw new Error("Ya existe un plan de tratamiento con ese código")
    }
    throw error
  }
}

/**
 * Alterna el estado activo/inactivo de un treatment plan catalog
 */
export async function toggleTreatmentPlanCatalogActive(
  id: number,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<TreatmentPlanCatalogItem> {
  const existing = await prisma.treatmentPlanCatalog.findUnique({
    where: { idTreatmentPlanCatalog: id },
    include: {
      steps: {
        orderBy: {
          order: "asc",
        },
      },
      _count: {
        select: {
          treatmentPlans: true,
        },
      },
    },
  })

  if (!existing) {
    throw new Error("Treatment plan catalog no encontrado")
  }

  const newIsActive = !existing.isActive

  const updated = await prisma.treatmentPlanCatalog.update({
    where: { idTreatmentPlanCatalog: id },
    data: { isActive: newIsActive },
    include: {
      steps: {
        orderBy: {
          order: "asc",
        },
      },
      _count: {
        select: {
          treatmentPlans: true,
        },
      },
    },
  })

  // Audit log
  await safeAuditWrite({
    actorId,
    action: newIsActive ? AuditAction.TREATMENT_PLAN_CATALOG_REACTIVATE : AuditAction.TREATMENT_PLAN_CATALOG_DEACTIVATE,
    entity: AuditEntity.TreatmentPlanCatalog,
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
    idTreatmentPlanCatalog: updated.idTreatmentPlanCatalog,
    code: updated.code,
    nombre: updated.nombre,
    descripcion: updated.descripcion,
    isActive: updated.isActive,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    steps: updated.steps.map((step) => ({
      idTreatmentPlanCatalogStep: step.idTreatmentPlanCatalogStep,
      catalogPlanId: step.catalogPlanId,
      order: step.order,
      procedureId: step.procedureId,
      serviceType: step.serviceType,
      toothNumber: step.toothNumber,
      toothSurface: step.toothSurface,
      estimatedDurationMin: step.estimatedDurationMin,
      estimatedCostCents: step.estimatedCostCents,
      priority: step.priority,
      notes: step.notes,
      requiresMultipleSessions: step.requiresMultipleSessions,
      totalSessions: step.totalSessions,
      currentSession: step.currentSession,
      createdAt: step.createdAt,
      updatedAt: step.updatedAt,
    })),
    referenceCount: updated._count.treatmentPlans,
  }
}

/**
 * Elimina un treatment plan catalog (hard delete)
 * Solo permite eliminar si no tiene referencias en TreatmentPlan
 */
export async function deleteTreatmentPlanCatalog(
  id: number,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<void> {
  const catalog = await prisma.treatmentPlanCatalog.findUnique({
    where: { idTreatmentPlanCatalog: id },
    include: {
      _count: {
        select: {
          treatmentPlans: true,
        },
      },
    },
  })

  if (!catalog) {
    throw new Error("Treatment plan catalog no encontrado")
  }

  // Check if there are TreatmentPlan references
  if (catalog._count.treatmentPlans > 0) {
    throw new Error(
      `No se puede eliminar porque está siendo utilizado en ${catalog._count.treatmentPlans} plan(es) de tratamiento. Use 'Desactivar' en su lugar.`
    )
  }

  // Store metadata before deletion
  const metadata = {
    code: catalog.code,
    nombre: catalog.nombre,
    descripcion: catalog.descripcion,
    referenceCount: catalog._count.treatmentPlans,
  }

  await prisma.treatmentPlanCatalog.delete({
    where: { idTreatmentPlanCatalog: id },
  })

  // Audit log
  await safeAuditWrite({
    actorId,
    action: AuditAction.TREATMENT_PLAN_CATALOG_DELETE,
    entity: AuditEntity.TreatmentPlanCatalog,
    entityId: id,
    metadata,
    headers,
    path,
  })
}

