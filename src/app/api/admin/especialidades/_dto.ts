// src/app/api/admin/especialidades/_dto.ts
/**
 * DTOs para respuestas de la API de especialidades
 */

import type {
  EspecialidadItem,
  EspecialidadListResponse,
  EspecialidadCreateBody,
  EspecialidadUpdateBody,
} from "./_schemas"

export type EspecialidadItemDTO = EspecialidadItem
export type EspecialidadListResponseDTO = EspecialidadListResponse
export type EspecialidadCreateInputDTO = EspecialidadCreateBody
export type EspecialidadUpdateInputDTO = EspecialidadUpdateBody

