// src/app/api/allergies/_service.ts
/**
 * Servicio para gestión de allergy catalog
 */

import { prisma } from "@/lib/prisma"
import type {
  AllergyCatalogListQuery,
  AllergyCatalogCreateBody,
  AllergyCatalogUpdateBody,
  AllergyCatalogItem,
} from "./_schemas"
import { safeAuditWrite } from "@/lib/audit/log"
import { AuditAction, AuditEntity } from "@/lib/audit/actions"
import type { Headers } from "next/headers"

/**
 * Lista allergy catalogs con filtros, paginación y búsqueda
 */
export async function listAllergyCatalogs(filters: AllergyCatalogListQuery) {
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
    prisma.allergyCatalog.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        _count: {
          select: {
            patientAllergies: true,
          },
        },
      },
    }),
    prisma.allergyCatalog.count({ where }),
  ])

  const items: AllergyCatalogItem[] = data.map((ac) => ({
    idAllergyCatalog: ac.idAllergyCatalog,
    name: ac.name,
    description: ac.description,
    isActive: ac.isActive,
    createdAt: ac.createdAt,
    updatedAt: ac.updatedAt,
    referenceCount: ac._count.patientAllergies,
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
 * Obtiene un allergy catalog por ID
 */
export async function getAllergyCatalogById(id: number): Promise<AllergyCatalogItem> {
  const allergyCatalog = await prisma.allergyCatalog.findUnique({
    where: { idAllergyCatalog: id },
    include: {
      _count: {
        select: {
          patientAllergies: true,
        },
      },
    },
  })

  if (!allergyCatalog) {
    throw new Error("Allergy catalog no encontrado")
  }

  return {
    idAllergyCatalog: allergyCatalog.idAllergyCatalog,
    name: allergyCatalog.name,
    description: allergyCatalog.description,
    isActive: allergyCatalog.isActive,
    createdAt: allergyCatalog.createdAt,
    updatedAt: allergyCatalog.updatedAt,
    referenceCount: allergyCatalog._count.patientAllergies,
  }
}

/**
 * Crea un nuevo allergy catalog
 */
export async function createAllergyCatalog(
  data: AllergyCatalogCreateBody,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<AllergyCatalogItem> {
  // Check uniqueness before insert
  const existing = await prisma.allergyCatalog.findUnique({
    where: { name: data.name },
  })

  if (existing) {
    throw new Error("Ya existe una alergia con ese nombre")
  }

  try {
    const allergyCatalog = await prisma.allergyCatalog.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        isActive: data.isActive ?? true,
      },
      include: {
        _count: {
          select: {
            patientAllergies: true,
          },
        },
      },
    })

    // Audit log
    await safeAuditWrite({
      actorId,
      action: AuditAction.ALLERGY_CATALOG_CREATE,
      entity: AuditEntity.AllergyCatalog,
      entityId: allergyCatalog.idAllergyCatalog,
      metadata: {
        name: allergyCatalog.name,
        description: allergyCatalog.description,
        isActive: allergyCatalog.isActive,
      },
      headers,
      path,
    })

    return {
      idAllergyCatalog: allergyCatalog.idAllergyCatalog,
      name: allergyCatalog.name,
      description: allergyCatalog.description,
      isActive: allergyCatalog.isActive,
      createdAt: allergyCatalog.createdAt,
      updatedAt: allergyCatalog.updatedAt,
      referenceCount: allergyCatalog._count.patientAllergies,
    }
  } catch (error: unknown) {
    const prismaError = error as { code?: string; meta?: { target?: string[] } }
    if (prismaError.code === "P2002" && prismaError.meta?.target?.includes("name")) {
      throw new Error("Ya existe una alergia con ese nombre")
    }
    throw error
  }
}

/**
 * Actualiza un allergy catalog existente
 */
export async function updateAllergyCatalog(
  id: number,
  data: AllergyCatalogUpdateBody,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<AllergyCatalogItem> {
  // Load existing record
  const existing = await prisma.allergyCatalog.findUnique({
    where: { idAllergyCatalog: id },
    include: {
      _count: {
        select: {
          patientAllergies: true,
        },
      },
    },
  })

  if (!existing) {
    throw new Error("Allergy catalog no encontrado")
  }

  // Check uniqueness if name is being changed
  if (data.name && data.name !== existing.name) {
    const duplicate = await prisma.allergyCatalog.findUnique({
      where: { name: data.name },
    })
    if (duplicate) {
      throw new Error("Ya existe una alergia con ese nombre")
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
    const updated = await prisma.allergyCatalog.update({
      where: { idAllergyCatalog: id },
      data: {
        name: data.name,
        description: data.description ?? undefined,
        isActive: data.isActive,
      },
      include: {
        _count: {
          select: {
            patientAllergies: true,
          },
        },
      },
    })

    // Determine audit action based on isActive change
    let auditAction = AuditAction.ALLERGY_CATALOG_UPDATE
    if (changes.isActive) {
      auditAction =
        changes.isActive.new === true
          ? AuditAction.ALLERGY_CATALOG_REACTIVATE
          : AuditAction.ALLERGY_CATALOG_DEACTIVATE
    }

    // Audit log
    await safeAuditWrite({
      actorId,
      action: auditAction,
      entity: AuditEntity.AllergyCatalog,
      entityId: id,
      metadata: {
        changes: Object.keys(changes).length > 0 ? changes : undefined,
      },
      headers,
      path,
    })

    return {
      idAllergyCatalog: updated.idAllergyCatalog,
      name: updated.name,
      description: updated.description,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      referenceCount: updated._count.patientAllergies,
    }
  } catch (error: unknown) {
    const prismaError = error as { code?: string; meta?: { target?: string[] } }
    if (prismaError.code === "P2002" && prismaError.meta?.target?.includes("name")) {
      throw new Error("Ya existe una alergia con ese nombre")
    }
    throw error
  }
}

/**
 * Alterna el estado activo/inactivo de un allergy catalog
 */
export async function toggleAllergyCatalogActive(
  id: number,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<AllergyCatalogItem> {
  const existing = await prisma.allergyCatalog.findUnique({
    where: { idAllergyCatalog: id },
    include: {
      _count: {
        select: {
          patientAllergies: true,
        },
      },
    },
  })

  if (!existing) {
    throw new Error("Allergy catalog no encontrado")
  }

  const newIsActive = !existing.isActive

  const updated = await prisma.allergyCatalog.update({
    where: { idAllergyCatalog: id },
    data: { isActive: newIsActive },
    include: {
      _count: {
        select: {
          patientAllergies: true,
        },
      },
    },
  })

  // Audit log
  await safeAuditWrite({
    actorId,
    action: newIsActive
      ? AuditAction.ALLERGY_CATALOG_REACTIVATE
      : AuditAction.ALLERGY_CATALOG_DEACTIVATE,
    entity: AuditEntity.AllergyCatalog,
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
    idAllergyCatalog: updated.idAllergyCatalog,
    name: updated.name,
    description: updated.description,
    isActive: updated.isActive,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    referenceCount: updated._count.patientAllergies,
  }
}

/**
 * Elimina un allergy catalog (hard delete)
 * Solo permite eliminar si no tiene referencias en PatientAllergy
 */
export async function deleteAllergyCatalog(
  id: number,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<void> {
  const allergyCatalog = await prisma.allergyCatalog.findUnique({
    where: { idAllergyCatalog: id },
    include: {
      _count: {
        select: {
          patientAllergies: true,
        },
      },
    },
  })

  if (!allergyCatalog) {
    throw new Error("Allergy catalog no encontrado")
  }

  // Check if there are PatientAllergy references
  if (allergyCatalog._count.patientAllergies > 0) {
    throw new Error(
      `No se puede eliminar porque está siendo utilizado en ${allergyCatalog._count.patientAllergies} alergia(s) de paciente(s). Use 'Desactivar' en su lugar.`
    )
  }

  // Store metadata before deletion
  const metadata = {
    name: allergyCatalog.name,
    description: allergyCatalog.description,
    referenceCount: allergyCatalog._count.patientAllergies,
  }

  await prisma.allergyCatalog.delete({
    where: { idAllergyCatalog: id },
  })

  // Audit log
  await safeAuditWrite({
    actorId,
    action: AuditAction.ALLERGY_CATALOG_DELETE,
    entity: AuditEntity.AllergyCatalog,
    entityId: id,
    metadata,
    headers,
    path,
  })
}

