// src/lib/audit/anamnesis-rbac.ts
// RBAC específico para auditoría de anamnesis

export type UserRole = "ADMIN" | "ODONT" | "RECEP"

/**
 * Verifica si un usuario puede ver logs de auditoría de una anamnesis
 */
export function canViewAnamnesisAudit(
  role: UserRole,
): boolean {
  if (role === "ADMIN") return true
  if (role === "RECEP") return false
  
  // ODONT solo puede ver logs de sus propios pacientes
  // Si se proporciona actorId y currentUserId, ODONT solo ve sus propias acciones
  if (role === "ODONT") {
    // Por ahora, permitir ver todos los logs del paciente
    // En el futuro, se puede restringir más según necesidad
    return true
  }
  
  return false
}

/**
 * Verifica si un usuario puede restaurar versiones de anamnesis
 */
export function canRestoreAnamnesisVersion(role: UserRole): boolean {
  if (role === "ADMIN") return true
  if (role === "ODONT") return true // ODONT puede restaurar versiones de sus pacientes
  return false
}

/**
 * Verifica si un usuario puede exportar logs de auditoría
 */
export function canExportAnamnesisAudit(role: UserRole): boolean {
  return role === "ADMIN"
}

/**
 * Verifica si un usuario puede ver detalles técnicos (IP, user-agent, etc.)
 */
export function canViewTechnicalDetails(role: UserRole): boolean {
  return role === "ADMIN"
}

/**
 * Verifica si un usuario puede ver actividad de otros usuarios
 */
export function canViewOtherUsersActivity(role: UserRole): boolean {
  return role === "ADMIN"
}

/**
 * Verifica si un usuario puede ver estadísticas agregadas
 */
export function canViewAnamnesisAuditStats(role: UserRole): boolean {
  return role === "ADMIN"
}

