// src/app/api/agenda/citas/[id]/consulta/_rbac.ts
import type { Role } from "@/app/api/_lib/auth"

export type RolConsulta = "ADMIN" | "ODONT" | "RECEP"

/**
 * RBAC específico para módulos de consulta clínica
 * ODONT y ADMIN: acceso completo (lectura/escritura)
 * RECEP: solo lectura de datos administrativos mínimos
 */
export const CONSULTA_RBAC = {
  /**
   * Ver datos clínicos completos (anamnesis, diagnósticos, procedimientos, etc.)
   */
  canViewClinicalData(rol?: string): boolean {
    return rol === "ADMIN" || rol === "ODONT"
  },

  /**
   * Editar datos clínicos (crear/actualizar anamnesis, diagnósticos, procedimientos, etc.)
   */
  canEditClinicalData(rol?: string): boolean {
    return rol === "ADMIN" || rol === "ODONT"
  },

  /**
   * Ver solo datos administrativos mínimos (fecha, profesional, motivo básico)
   */
  canViewAdminData(rol?: string): boolean {
    return rol === "ADMIN" || rol === "ODONT" || rol === "RECEP"
  },

  /**
   * Subir adjuntos clínicos (RX, fotos)
   */
  canUploadAttachments(rol?: string): boolean {
    return rol === "ADMIN" || rol === "ODONT"
  },

  /**
   * Eliminar adjuntos clínicos
   */
  canDeleteAttachments(rol?: string): boolean {
    return rol === "ADMIN" || rol === "ODONT"
  },

  /**
   * Ver odontograma y periodontograma
   */
  canViewOdontogram(rol?: string): boolean {
    return rol === "ADMIN" || rol === "ODONT"
  },

  /**
   * Editar odontograma y periodontograma
   */
  canEditOdontogram(rol?: string): boolean {
    return rol === "ADMIN" || rol === "ODONT"
  },
} as const

/**
 * Verifica que el rol tenga permisos para editar datos clínicos
 * Lanza error si no cumple
 */
export function requireClinicalEdit(rol?: string): asserts rol is "ADMIN" | "ODONT" {
  if (!CONSULTA_RBAC.canEditClinicalData(rol)) {
    throw new Error("FORBIDDEN: Solo ODONT y ADMIN pueden editar datos clínicos")
  }
}

/**
 * Verifica que el rol tenga permisos para ver datos clínicos
 * Lanza error si no cumple
 */
export function requireClinicalView(rol?: string): asserts rol is "ADMIN" | "ODONT" {
  if (!CONSULTA_RBAC.canViewClinicalData(rol)) {
    throw new Error("FORBIDDEN: Solo ODONT y ADMIN pueden ver datos clínicos")
  }
}

