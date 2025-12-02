// src/app/api/medication-catalog/_service.ts
/**
 * Servicio para gestión de medication catalog
 */

import { prisma } from "@/lib/prisma"
import type {
  MedicationCatalogListQuery,
  MedicationCatalogCreateBody,
  MedicationCatalogUpdateBody,
  MedicationCatalogItem,
} from "./_schemas"
import { safeAuditWrite } from "@/lib/audit/log"
import { AuditAction, AuditEntity } from "@/lib/audit/actions"

/**
 * Lista medication catalogs con filtros, paginación y búsqueda
 */
export async function listMedicationCatalogs(filters: MedicationCatalogListQuery) {
  const { page, limit, search, isActive, sortBy, sortOrder } = filters
  const skip = (page - 1) * limit

  const where: {
    isActive?: boolean
    OR?: Array<{ name?: { contains: string; mode: "insensitive" } }>
  } = {}

  // Filter by isActive
  if (isActive === "true") {
    where.isActive = true
  } else if (isActive === "false") {
    where.isActive = false
  }
  // "all" means no filter

  // Search filter (name)
  if (search) {
    where.OR = [{ name: { contains: search, mode: "insensitive" } }]
  }

  const [data, total] = await Promise.all([
    prisma.medicationCatalog.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        _count: {
          select: {
            patientMedications: true,
          },
        },
      },
    }),
    prisma.medicationCatalog.count({ where }),
  ])

  const items: MedicationCatalogItem[] = data.map((mc) => ({
    idMedicationCatalog: mc.idMedicationCatalog,
    name: mc.name,
    description: mc.description,
    isActive: mc.isActive,
    createdAt: mc.createdAt,
    updatedAt: mc.updatedAt,
    patientMedicationCount: mc._count.patientMedications,
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
 * Obtiene un medication catalog por ID
 */
export async function getMedicationCatalogById(id: number): Promise<MedicationCatalogItem> {
  const medicationCatalog = await prisma.medicationCatalog.findUnique({
    where: { idMedicationCatalog: id },
    include: {
      _count: {
        select: {
          patientMedications: true,
        },
      },
    },
  })

  if (!medicationCatalog) {
    throw new Error("Medication catalog no encontrado")
  }

  return {
    idMedicationCatalog: medicationCatalog.idMedicationCatalog,
    name: medicationCatalog.name,
    description: medicationCatalog.description,
    isActive: medicationCatalog.isActive,
    createdAt: medicationCatalog.createdAt,
    updatedAt: medicationCatalog.updatedAt,
    patientMedicationCount: medicationCatalog._count.patientMedications,
  }
}

/**
 * Crea un nuevo medication catalog
 */
export async function createMedicationCatalog(
  data: MedicationCatalogCreateBody,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<MedicationCatalogItem> {
  // Check uniqueness before insert
  const existing = await prisma.medicationCatalog.findUnique({
    where: { name: data.name },
  })

  if (existing) {
    throw new Error("Ya existe un medicamento con ese nombre")
  }

  try {
    const medicationCatalog = await prisma.medicationCatalog.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        isActive: data.isActive ?? true,
      },
      include: {
        _count: {
          select: {
            patientMedications: true,
          },
        },
      },
    })

    // Audit log
    await safeAuditWrite({
      actorId,
      action: AuditAction.MEDICATION_CATALOG_CREATE,
      entity: AuditEntity.MedicationCatalog,
      entityId: medicationCatalog.idMedicationCatalog,
      metadata: {
        name: medicationCatalog.name,
        description: medicationCatalog.description,
        isActive: medicationCatalog.isActive,
      },
      headers,
      path,
    })

    return {
      idMedicationCatalog: medicationCatalog.idMedicationCatalog,
      name: medicationCatalog.name,
      description: medicationCatalog.description,
      isActive: medicationCatalog.isActive,
      createdAt: medicationCatalog.createdAt,
      updatedAt: medicationCatalog.updatedAt,
      patientMedicationCount: medicationCatalog._count.patientMedications,
    }
  } catch (error: unknown) {
    const prismaError = error as { code?: string; meta?: { target?: string[] } }
    if (prismaError.code === "P2002" && prismaError.meta?.target?.includes("name")) {
      throw new Error("Ya existe un medicamento con ese nombre")
    }
    throw error
  }
}

/**
 * Actualiza un medication catalog existente
 */
export async function updateMedicationCatalog(
  id: number,
  data: MedicationCatalogUpdateBody,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<MedicationCatalogItem> {
  // Load existing record
  const existing = await prisma.medicationCatalog.findUnique({
    where: { idMedicationCatalog: id },
    include: {
      _count: {
        select: {
          patientMedications: true,
        },
      },
    },
  })

  if (!existing) {
    throw new Error("Medication catalog no encontrado")
  }

  // Check uniqueness if name is being changed
  if (data.name && data.name !== existing.name) {
    const duplicate = await prisma.medicationCatalog.findUnique({
      where: { name: data.name },
    })
    if (duplicate) {
      throw new Error("Ya existe un medicamento con ese nombre")
    }
  }

  // Track changes for audit
  const changes: Record<string, { old: unknown; new: unknown }> = {}

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
    const updated = await prisma.medicationCatalog.update({
      where: { idMedicationCatalog: id },
      data: {
        name: data.name,
        description: data.description ?? undefined,
        isActive: data.isActive,
      },
      include: {
        _count: {
          select: {
            patientMedications: true,
          },
        },
      },
    })

    // Determine audit action based on isActive change
    let auditAction: typeof AuditAction[keyof typeof AuditAction] = AuditAction.MEDICATION_CATALOG_UPDATE
    if (changes.isActive) {
      auditAction =
        changes.isActive.new === true
          ? AuditAction.MEDICATION_CATALOG_REACTIVATE
          : AuditAction.MEDICATION_CATALOG_DEACTIVATE
    }

    // Audit log
    await safeAuditWrite({
      actorId,
      action: auditAction,
      entity: AuditEntity.MedicationCatalog,
      entityId: id,
      metadata: {
        changes: Object.keys(changes).length > 0 ? changes : undefined,
      },
      headers,
      path,
    })

    return {
      idMedicationCatalog: updated.idMedicationCatalog,
      name: updated.name,
      description: updated.description,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      patientMedicationCount: updated._count.patientMedications,
    }
  } catch (error: unknown) {
    const prismaError = error as { code?: string; meta?: { target?: string[] } }
    if (prismaError.code === "P2002" && prismaError.meta?.target?.includes("name")) {
      throw new Error("Ya existe un medicamento con ese nombre")
    }
    throw error
  }
}

/**
 * Desactiva un medication catalog (set isActive to false)
 */
export async function deactivateMedicationCatalog(
  id: number,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<MedicationCatalogItem> {
  const existing = await prisma.medicationCatalog.findUnique({
    where: { idMedicationCatalog: id },
    include: {
      _count: {
        select: {
          patientMedications: true,
        },
      },
    },
  })

  if (!existing) {
    throw new Error("Medication catalog no encontrado")
  }

  if (!existing.isActive) {
    throw new Error("El medicamento ya está desactivado")
  }

  const updated = await prisma.medicationCatalog.update({
    where: { idMedicationCatalog: id },
    data: { isActive: false },
    include: {
      _count: {
        select: {
          patientMedications: true,
        },
      },
    },
  })

  // Audit log
  await safeAuditWrite({
    actorId,
    action: AuditAction.MEDICATION_CATALOG_DEACTIVATE,
    entity: AuditEntity.MedicationCatalog,
    entityId: id,
    metadata: {
      changes: {
        isActive: { old: existing.isActive, new: false },
      },
    },
    headers,
    path,
  })

  return {
    idMedicationCatalog: updated.idMedicationCatalog,
    name: updated.name,
    description: updated.description,
    isActive: updated.isActive,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    patientMedicationCount: updated._count.patientMedications,
  }
}

/**
 * Elimina un medication catalog (hard delete)
 * Solo permite eliminar si no tiene referencias en PatientMedication
 */
export async function deleteMedicationCatalog(
  id: number,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<void> {
  const medicationCatalog = await prisma.medicationCatalog.findUnique({
    where: { idMedicationCatalog: id },
    include: {
      _count: {
        select: {
          patientMedications: true,
        },
      },
    },
  })

  if (!medicationCatalog) {
    throw new Error("Medication catalog no encontrado")
  }

  // Check if there are PatientMedication references
  if (medicationCatalog._count.patientMedications > 0) {
    throw new Error(
      `No se puede eliminar porque está siendo utilizado en ${medicationCatalog._count.patientMedications} medicación(es) de paciente(s). Use 'Desactivar' en su lugar.`
    )
  }

  // Store metadata before deletion
  const metadata = {
    name: medicationCatalog.name,
    description: medicationCatalog.description,
    patientMedicationCount: medicationCatalog._count.patientMedications,
  }

  await prisma.medicationCatalog.delete({
    where: { idMedicationCatalog: id },
  })

  // Audit log
  await safeAuditWrite({
    actorId,
    action: AuditAction.MEDICATION_CATALOG_DELETE,
    entity: AuditEntity.MedicationCatalog,
    entityId: id,
    metadata,
    headers,
    path,
  })
}

