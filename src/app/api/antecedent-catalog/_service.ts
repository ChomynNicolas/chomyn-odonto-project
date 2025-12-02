// src/app/api/antecedent-catalog/_service.ts
/**
 * Servicio para gestión de antecedent catalog
 */

import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import type {
  AntecedentCatalogListQuery,
  AntecedentCatalogCreateBody,
  AntecedentCatalogUpdateBody,
  AntecedentCatalogItem,
} from "./_schemas"
import { safeAuditWrite } from "@/lib/audit/log"
import { AuditAction, AuditEntity } from "@/lib/audit/actions"

/**
 * Lista antecedent catalogs con filtros, paginación y búsqueda
 */
export async function listAntecedentCatalogs(filters: AntecedentCatalogListQuery) {
  const { page, limit, search, category, isActive, sortBy, sortOrder } = filters
  const skip = (page - 1) * limit

  const where: Prisma.AntecedentCatalogWhereInput = {}

  // Filter by isActive
  if (isActive === "true") {
    where.isActive = true
  } else if (isActive === "false") {
    where.isActive = false
  }
  // "all" means no filter

  // Filter by category
  if (category) {
    where.category = category
  }

  // Search filter (code or name)
  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ]
  }

  const [data, total] = await Promise.all([
    prisma.antecedentCatalog.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        _count: {
          select: {
            antecedents: true,
          },
        },
      },
    }),
    prisma.antecedentCatalog.count({ where }),
  ])

  const items: AntecedentCatalogItem[] = data.map((ac) => ({
    idAntecedentCatalog: ac.idAntecedentCatalog,
    code: ac.code,
    name: ac.name,
    category: ac.category,
    description: ac.description,
    isActive: ac.isActive,
    createdAt: ac.createdAt,
    updatedAt: ac.updatedAt,
    referenceCount: ac._count.antecedents,
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
 * Obtiene un antecedent catalog por ID
 */
export async function getAntecedentCatalogById(id: number): Promise<AntecedentCatalogItem> {
  const antecedentCatalog = await prisma.antecedentCatalog.findUnique({
    where: { idAntecedentCatalog: id },
    include: {
      _count: {
        select: {
          antecedents: true,
        },
      },
    },
  })

  if (!antecedentCatalog) {
    throw new Error("Antecedent catalog no encontrado")
  }

  return {
    idAntecedentCatalog: antecedentCatalog.idAntecedentCatalog,
    code: antecedentCatalog.code,
    name: antecedentCatalog.name,
    category: antecedentCatalog.category,
    description: antecedentCatalog.description,
    isActive: antecedentCatalog.isActive,
    createdAt: antecedentCatalog.createdAt,
    updatedAt: antecedentCatalog.updatedAt,
    referenceCount: antecedentCatalog._count.antecedents,
  }
}

/**
 * Crea un nuevo antecedent catalog
 */
export async function createAntecedentCatalog(
  data: AntecedentCatalogCreateBody,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<AntecedentCatalogItem> {
  // Check uniqueness before insert
  const existing = await prisma.antecedentCatalog.findUnique({
    where: { code: data.code },
  })

  if (existing) {
    throw new Error("Ya existe un antecedente con ese código")
  }

  try {
    const antecedentCatalog = await prisma.antecedentCatalog.create({
      data: {
        code: data.code,
        name: data.name,
        category: data.category,
        description: data.description ?? null,
        isActive: data.isActive ?? true,
      },
      include: {
        _count: {
          select: {
            antecedents: true,
          },
        },
      },
    })

    // Audit log
    await safeAuditWrite({
      actorId,
      action: AuditAction.ANTECEDENT_CATALOG_CREATE,
      entity: AuditEntity.AntecedentCatalog,
      entityId: antecedentCatalog.idAntecedentCatalog,
      metadata: {
        code: antecedentCatalog.code,
        name: antecedentCatalog.name,
        category: antecedentCatalog.category,
        description: antecedentCatalog.description,
        isActive: antecedentCatalog.isActive,
      },
      headers,
      path,
    })

    return {
      idAntecedentCatalog: antecedentCatalog.idAntecedentCatalog,
      code: antecedentCatalog.code,
      name: antecedentCatalog.name,
      category: antecedentCatalog.category,
      description: antecedentCatalog.description,
      isActive: antecedentCatalog.isActive,
      createdAt: antecedentCatalog.createdAt,
      updatedAt: antecedentCatalog.updatedAt,
      referenceCount: antecedentCatalog._count.antecedents,
    }
  } catch (error: unknown) {
    const prismaError = error as { code?: string; meta?: { target?: string[] } }
    if (prismaError.code === "P2002" && prismaError.meta?.target?.includes("code")) {
      throw new Error("Ya existe un antecedente con ese código")
    }
    throw error
  }
}

/**
 * Actualiza un antecedent catalog existente
 */
export async function updateAntecedentCatalog(
  id: number,
  data: AntecedentCatalogUpdateBody,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<AntecedentCatalogItem> {
  // Load existing record
  const existing = await prisma.antecedentCatalog.findUnique({
    where: { idAntecedentCatalog: id },
    include: {
      _count: {
        select: {
          antecedents: true,
        },
      },
    },
  })

  if (!existing) {
    throw new Error("Antecedent catalog no encontrado")
  }

  // Check uniqueness if code is being changed
  if (data.code && data.code !== existing.code) {
    const duplicate = await prisma.antecedentCatalog.findUnique({
      where: { code: data.code },
    })
    if (duplicate) {
      throw new Error("Ya existe un antecedente con ese código")
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

  if (data.category !== undefined && data.category !== existing.category) {
    changes.category = { old: existing.category, new: data.category }
  }

  if (data.description !== undefined && data.description !== existing.description) {
    changes.description = { old: existing.description, new: data.description }
  }

  if (data.isActive !== undefined && data.isActive !== existing.isActive) {
    changes.isActive = { old: existing.isActive, new: data.isActive }
  }

  try {
    const updated = await prisma.antecedentCatalog.update({
      where: { idAntecedentCatalog: id },
      data: {
        code: data.code,
        name: data.name,
        category: data.category,
        description: data.description ?? undefined,
        isActive: data.isActive,
      },
      include: {
        _count: {
          select: {
            antecedents: true,
          },
        },
      },
    })

    // Determine audit action based on isActive change
    let auditAction: typeof AuditAction[keyof typeof AuditAction] = AuditAction.ANTECEDENT_CATALOG_UPDATE
    if (changes.isActive) {
      auditAction = changes.isActive.new === true
        ? AuditAction.ANTECEDENT_CATALOG_REACTIVATE
        : AuditAction.ANTECEDENT_CATALOG_DEACTIVATE
    }

    // Audit log
    await safeAuditWrite({
      actorId,
      action: auditAction,
      entity: AuditEntity.AntecedentCatalog,
      entityId: id,
      metadata: {
        previousValue: existing,
        newValue: updated,
        changes: Object.keys(changes).length > 0 ? changes : undefined,
      },
      headers,
      path,
    })

    return {
      idAntecedentCatalog: updated.idAntecedentCatalog,
      code: updated.code,
      name: updated.name,
      category: updated.category,
      description: updated.description,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      referenceCount: updated._count.antecedents,
    }
  } catch (error: unknown) {
    const prismaError = error as { code?: string; meta?: { target?: string[] } }
    if (prismaError.code === "P2002" && prismaError.meta?.target?.includes("code")) {
      throw new Error("Ya existe un antecedente con ese código")
    }
    throw error
  }
}

/**
 * Alterna el estado activo/inactivo de un antecedent catalog
 */
export async function toggleAntecedentCatalogActive(
  id: number,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<AntecedentCatalogItem> {
  const existing = await prisma.antecedentCatalog.findUnique({
    where: { idAntecedentCatalog: id },
    include: {
      _count: {
        select: {
          antecedents: true,
        },
      },
    },
  })

  if (!existing) {
    throw new Error("Antecedent catalog no encontrado")
  }

  const newIsActive = !existing.isActive

  const updated = await prisma.antecedentCatalog.update({
    where: { idAntecedentCatalog: id },
    data: { isActive: newIsActive },
    include: {
      _count: {
        select: {
          antecedents: true,
        },
      },
    },
  })

  // Audit log
  await safeAuditWrite({
    actorId,
    action: newIsActive ? AuditAction.ANTECEDENT_CATALOG_REACTIVATE : AuditAction.ANTECEDENT_CATALOG_DEACTIVATE,
    entity: AuditEntity.AntecedentCatalog,
    entityId: id,
    metadata: {
      previousValue: existing,
      newValue: updated,
      changes: {
        isActive: { old: existing.isActive, new: newIsActive },
      },
    },
    headers,
    path,
  })

  return {
    idAntecedentCatalog: updated.idAntecedentCatalog,
    code: updated.code,
    name: updated.name,
    category: updated.category,
    description: updated.description,
    isActive: updated.isActive,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    referenceCount: updated._count.antecedents,
  }
}

/**
 * Elimina un antecedent catalog (hard delete)
 * Solo permite eliminar si no tiene referencias en AnamnesisAntecedent
 */
export async function deleteAntecedentCatalog(
  id: number,
  actorId: number,
  headers?: Headers,
  path?: string
): Promise<void> {
  const antecedentCatalog = await prisma.antecedentCatalog.findUnique({
    where: { idAntecedentCatalog: id },
    include: {
      _count: {
        select: {
          antecedents: true,
        },
      },
    },
  })

  if (!antecedentCatalog) {
    throw new Error("Antecedent catalog no encontrado")
  }

  // Check if there are AnamnesisAntecedent references
  if (antecedentCatalog._count.antecedents > 0) {
    throw new Error(
      `No se puede eliminar. Este antecedente está siendo utilizado en ${antecedentCatalog._count.antecedents} anamnesis`
    )
  }

  // Store metadata before deletion
  const metadata = {
    code: antecedentCatalog.code,
    name: antecedentCatalog.name,
    category: antecedentCatalog.category,
    description: antecedentCatalog.description,
    referenceCount: antecedentCatalog._count.antecedents,
  }

  await prisma.antecedentCatalog.delete({
    where: { idAntecedentCatalog: id },
  })

  // Audit log
  await safeAuditWrite({
    actorId,
    action: AuditAction.ANTECEDENT_CATALOG_DELETE,
    entity: AuditEntity.AntecedentCatalog,
    entityId: id,
    metadata,
    headers,
    path,
  })
}

