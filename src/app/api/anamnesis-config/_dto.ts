// src/app/api/anamnesis-config/_dto.ts
/**
 * Data Transfer Objects for AnamnesisConfig API responses
 */

import type { AnamnesisConfig } from "@prisma/client"
import type { AnamnesisConfigItem } from "./_schemas"

/**
 * Maps Prisma AnamnesisConfig model to API response format
 */
export function mapAnamnesisConfigToDTO(
  config: AnamnesisConfig & {
    updatedBy: {
      idUsuario: number
      nombreApellido: string
      usuario: string
    }
  }
): AnamnesisConfigItem {
  return {
    idAnamnesisConfig: config.idAnamnesisConfig,
    key: config.key,
    value: config.value,
    description: config.description,
    updatedAt: config.updatedAt,
    updatedBy: {
      idUsuario: config.updatedBy.idUsuario,
      nombreApellido: config.updatedBy.nombreApellido,
      usuario: config.updatedBy.usuario,
    },
  }
}

