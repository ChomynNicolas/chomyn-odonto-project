// src/app/api/medication-catalog/_dto.ts
/**
 * DTOs para respuestas de la API de medication catalog
 */

import type {
  MedicationCatalogItem,
  MedicationCatalogListResponse,
  MedicationCatalogCreateBody,
  MedicationCatalogUpdateBody,
} from "./_schemas"

export type MedicationCatalogItemDTO = MedicationCatalogItem
export type MedicationCatalogListResponseDTO = MedicationCatalogListResponse
export type MedicationCatalogCreateInputDTO = MedicationCatalogCreateBody
export type MedicationCatalogUpdateInputDTO = MedicationCatalogUpdateBody

