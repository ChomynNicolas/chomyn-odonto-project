// src/app/api/anamnesis-config/_service.ts
/**
 * Servicio para gestión de AnamnesisConfig
 */

import { prisma } from "@/lib/prisma"
import type {
  AnamnesisConfigListQuery,
  AnamnesisConfigCreateBody,
  AnamnesisConfigUpdateBody,
  AnamnesisConfigItem,
} from "./_schemas"
import { validateConfigValue } from "./_schemas"
import { mapAnamnesisConfigToDTO } from "./_dto"
import { safeAuditWrite } from "@/lib/audit/log"
import { AuditAction, AuditEntity } from "@/lib/audit/actions"
import type { Prisma } from "@prisma/client"

/**
 * Lista configuraciones con filtros, paginación y búsqueda
 */
export async function listAnamnesisConfigs(
  query: AnamnesisConfigListQuery,
  page: number,
  limit: number,
  skip: number
) {
  const { search, sortBy, sortOrder } = query

  const where: {
    key?: { contains: string; mode: "insensitive" }
    description?: { contains: string; mode: "insensitive" }
    OR?: Array<{
      key?: { contains: string; mode: "insensitive" }
      description?: { contains: string; mode: "insensitive" }
    }>
  } = {}

  // Search filter (searches in both key and description)
  if (search) {
    where.OR = [
      { key: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ]
  }

  const [data, total] = await Promise.all([
    prisma.anamnesisConfig.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        updatedBy: {
          select: {
            idUsuario: true,
            nombreApellido: true,
            usuario: true,
          },
        },
      },
    }),
    prisma.anamnesisConfig.count({ where }),
  ])

  const items: AnamnesisConfigItem[] = data.map(mapAnamnesisConfigToDTO)

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
 * Obtiene una configuración por ID
 */
export async function getAnamnesisConfigById(id: number): Promise<AnamnesisConfigItem> {
  const config = await prisma.anamnesisConfig.findUnique({
    where: { idAnamnesisConfig: id },
    include: {
      updatedBy: {
        select: {
          idUsuario: true,
          nombreApellido: true,
          usuario: true,
        },
      },
    },
  })

  if (!config) {
    throw new Error("Configuración no encontrada")
  }

  return mapAnamnesisConfigToDTO(config)
}

/**
 * Crea una nueva configuración
 */
export async function createAnamnesisConfig(
  body: AnamnesisConfigCreateBody,
  userId: number,
  headers?: Headers,
  path?: string
): Promise<AnamnesisConfigItem> {
  // Validate value based on key
  const validatedValue = validateConfigValue(body.key, body.value)

  // Check uniqueness before insert
  const existing = await prisma.anamnesisConfig.findUnique({
    where: { key: body.key },
  })

  if (existing) {
    throw new Error("Ya existe una configuración con esa clave")
  }

  // Create the config
  const config = await prisma.anamnesisConfig.create({
    data: {
      key: body.key,
      value: validatedValue as Prisma.InputJsonValue,
      description: body.description ?? null,
      updatedByUserId: userId,
    },
    include: {
      updatedBy: {
        select: {
          idUsuario: true,
          nombreApellido: true,
          usuario: true,
        },
      },
    },
  })

  // Audit log
  await safeAuditWrite({
    actorId: userId,
    action: AuditAction.CONFIG_CREATE,
    entity: AuditEntity.AnamnesisConfig,
    entityId: config.idAnamnesisConfig,
    metadata: {
      key: config.key,
      newValue: config.value,
      updatedByUserId: userId,
      updatedAt: config.updatedAt.toISOString(),
    },
    headers,
    path,
  })

  return mapAnamnesisConfigToDTO(config)
}

/**
 * Actualiza una configuración existente
 * Enforces key immutability: key cannot be changed after creation
 */
export async function updateAnamnesisConfig(
  id: number,
  body: AnamnesisConfigUpdateBody,
  userId: number,
  headers?: Headers,
  path?: string
): Promise<AnamnesisConfigItem> {
  // Get existing config to validate key immutability and get key for value validation
  const existing = await prisma.anamnesisConfig.findUnique({
    where: { idAnamnesisConfig: id },
    include: {
      updatedBy: {
        select: {
          idUsuario: true,
          nombreApellido: true,
          usuario: true,
        },
      },
    },
  })

  if (!existing) {
    throw new Error("Configuración no encontrada")
  }

  // Validate value based on existing key
  const previousValue = existing.value
  const validatedValue = validateConfigValue(existing.key, body.value)

  // Update the config
  const config = await prisma.anamnesisConfig.update({
    where: { idAnamnesisConfig: id },
    data: {
      value: validatedValue as Prisma.InputJsonValue,
      description: body.description !== undefined ? body.description : existing.description,
      updatedByUserId: userId,
    },
    include: {
      updatedBy: {
        select: {
          idUsuario: true,
          nombreApellido: true,
          usuario: true,
        },
      },
    },
  })

  // Audit log
  await safeAuditWrite({
    actorId: userId,
    action: AuditAction.CONFIG_UPDATE,
    entity: AuditEntity.AnamnesisConfig,
    entityId: config.idAnamnesisConfig,
    metadata: {
      key: config.key,
      previousValue,
      newValue: config.value,
      updatedByUserId: userId,
      updatedAt: config.updatedAt.toISOString(),
    },
    headers,
    path,
  })

  return mapAnamnesisConfigToDTO(config)
}

