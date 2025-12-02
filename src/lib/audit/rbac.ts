// src/lib/audit/rbac.ts
/**
 * Role-Based Access Control para el sistema de auditoría
 * Define qué puede ver cada rol en los logs de auditoría
 */

export enum AuditAccessLevel {
  NONE = "NONE", // Sin acceso
  CONTEXTUAL = "CONTEXTUAL", // Solo contexto específico
  FULL = "FULL", // Acceso completo
}

export interface AuditPermission {
  canViewGlobalLog: boolean
  canViewContextualLog: boolean
  canExportLogs: boolean
  canViewTechnicalDetails: boolean
  canViewOtherUsers: boolean
  canViewSensitiveActions: boolean
  canViewIPAddress: boolean
  canViewUserAgent: boolean
  canViewEmailAddresses: boolean
  accessLevel: AuditAccessLevel
}

/**
 * Obtiene los permisos de auditoría según el rol del usuario
 */
export function getAuditPermissions(role: "ADMIN" | "ODONT" | "RECEP"): AuditPermission {
  switch (role) {
    case "ADMIN":
      return {
        canViewGlobalLog: true,
        canViewContextualLog: true,
        canExportLogs: true,
        canViewTechnicalDetails: true,
        canViewOtherUsers: true,
        canViewSensitiveActions: true,
        canViewIPAddress: true,
        canViewUserAgent: true,
        canViewEmailAddresses: true,
        accessLevel: AuditAccessLevel.FULL,
      }
    case "ODONT":
      return {
        canViewGlobalLog: false,
        canViewContextualLog: true,
        canExportLogs: false,
        canViewTechnicalDetails: false,
        canViewOtherUsers: false,
        canViewSensitiveActions: false,
        canViewIPAddress: false,
        canViewUserAgent: false,
        canViewEmailAddresses: false,
        accessLevel: AuditAccessLevel.CONTEXTUAL,
      }
    case "RECEP":
      return {
        canViewGlobalLog: false,
        canViewContextualLog: true,
        canExportLogs: false,
        canViewTechnicalDetails: false,
        canViewOtherUsers: false,
        canViewSensitiveActions: false,
        canViewIPAddress: false,
        canViewUserAgent: false,
        canViewEmailAddresses: false,
        accessLevel: AuditAccessLevel.CONTEXTUAL,
      }
    default:
      return {
        canViewGlobalLog: false,
        canViewContextualLog: false,
        canExportLogs: false,
        canViewTechnicalDetails: false,
        canViewOtherUsers: false,
        canViewSensitiveActions: false,
        canViewIPAddress: false,
        canViewUserAgent: false,
        canViewEmailAddresses: false,
        accessLevel: AuditAccessLevel.NONE,
      }
  }
}

/**
 * Verifica si un usuario puede acceder a la página global de auditoría
 */
export function canAccessGlobalAuditLog(role: "ADMIN" | "ODONT" | "RECEP"): boolean {
  return getAuditPermissions(role).canViewGlobalLog
}

/**
 * Verifica si un usuario puede ver detalles técnicos
 */
export function canViewTechnicalDetails(role: "ADMIN" | "ODONT" | "RECEP"): boolean {
  return getAuditPermissions(role).canViewTechnicalDetails
}

/**
 * Verifica si un usuario puede ver información de otros usuarios
 */
export function canViewOtherUsers(role: "ADMIN" | "ODONT" | "RECEP"): boolean {
  return getAuditPermissions(role).canViewOtherUsers
}

/**
 * Verifica si un usuario puede ver acciones sensibles
 */
export function canViewSensitiveActions(role: "ADMIN" | "ODONT" | "RECEP"): boolean {
  return getAuditPermissions(role).canViewSensitiveActions
}

/**
 * Lista de acciones consideradas sensibles
 */
export const SENSITIVE_ACTIONS = [
  "USER_ROLE_CHANGE",
  "USER_PASSWORD_CHANGE",
  "USER_DELETE",
  "PERMISSION_CHANGE",
  "SYSTEM_CONFIG_CHANGE",
] as const

/**
 * Verifica si una acción es sensible
 */
export function isSensitiveAction(action: string): boolean {
  return (SENSITIVE_ACTIONS as readonly string[]).includes(action)
}

