// src/app/api/admin/procedimientos/_dto.ts
/**
 * DTOs para respuestas de la API de procedimientos catalog
 */

import type {
  ProcedimientoItem,
  ProcedimientoDetail,
  ProcedimientoListResponse,
  ProcedimientoCreateBody,
  ProcedimientoUpdateBody,
} from "./_schemas"

export type ProcedimientoItemDTO = ProcedimientoItem
export type ProcedimientoDetailDTO = ProcedimientoDetail
export type ProcedimientoListResponseDTO = ProcedimientoListResponse
export type ProcedimientoCreateInputDTO = ProcedimientoCreateBody
export type ProcedimientoUpdateInputDTO = ProcedimientoUpdateBody

