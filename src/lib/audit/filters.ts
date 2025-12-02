// src/lib/audit/filters.ts
/**
 * Helpers para filtrar y ofuscar datos de auditoría según el rol del usuario
 */

import type { AuditLogEntry } from "@/lib/types/audit"
import { getAuditPermissions } from "./rbac"

/**
 * Ofusca una dirección IP según el rol
 */
export function maskIP(ip: string | null, role: "ADMIN" | "ODONT" | "RECEP"): string | null {
  if (!ip) return null
  
  const permissions = getAuditPermissions(role)
  if (permissions.canViewIPAddress) {
    return ip
  }
  
  // Ofuscar últimos dos octetos
  const parts = ip.split(".")
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`
  }
  return "***.***.***.***"
}

/**
 * Ofusca un email según el rol
 */
export function maskEmail(email: string | null | undefined, role: "ADMIN" | "ODONT" | "RECEP"): string | null {
  if (!email) return null
  
  const permissions = getAuditPermissions(role)
  if (permissions.canViewEmailAddresses) {
    return email
  }
  
  // Ofuscar dominio
  const [localPart, domain] = email.split("@")
  if (domain) {
    return `${localPart}@***.${domain.split(".").pop()}`
  }
  return "***@***.***"
}

/**
 * Ofusca información de usuario según el rol
 */
export function maskUserInfo(
  user: { id: number; nombre: string; email?: string | null; role?: "ADMIN" | "ODONT" | "RECEP" },
  role: "ADMIN" | "ODONT" | "RECEP"
): { id: number; nombre: string; email: string | null; role: "ADMIN" | "ODONT" | "RECEP" } {
  const permissions = getAuditPermissions(role)
  
  return {
    id: user.id,
    nombre: permissions.canViewOtherUsers ? user.nombre : `Usuario #${user.id}`,
    email: permissions.canViewEmailAddresses ? (user.email || null) : maskEmail(user.email, role),
    role: user.role || role,
  }
}

/**
 * Filtra metadata según el rol, removiendo campos sensibles
 */
export function filterMetadata(
  metadata: Record<string, unknown> | null,
  role: "ADMIN" | "ODONT" | "RECEP"
): Record<string, unknown> | null {
  if (!metadata) return null
  
  const permissions = getAuditPermissions(role)
  
  // Si tiene acceso completo, devolver todo
  if (permissions.canViewTechnicalDetails) {
    return metadata
  }
  
  // Filtrar campos técnicos sensibles
  const filtered: Record<string, unknown> = {}
  
  // Campos siempre permitidos
  const allowedFields = ["summary", "changes", "diff", "entriesCount", "entriesAdded", "entriesRemoved", "entriesModified"]
  
  Object.keys(metadata).forEach((key) => {
    if (allowedFields.includes(key)) {
      filtered[key] = metadata[key]
    }
  })
  
  return Object.keys(filtered).length > 0 ? filtered : null
}

/**
 * Filtra un entry de auditoría según el rol
 */
export function filterAuditEntry(
  entry: AuditLogEntry,
  role: "ADMIN" | "ODONT" | "RECEP"
): AuditLogEntry {
  
  
  return {
    ...entry,
    actor: maskUserInfo(entry.actor, role),
    ip: maskIP(entry.ip, role),
    metadata: filterMetadata(entry.metadata, role),
  }
}

/**
 * Filtra un array de entries según el rol
 */
export function filterAuditEntries(
  entries: AuditLogEntry[],
  role: "ADMIN" | "ODONT" | "RECEP"
): AuditLogEntry[] {
  return entries.map((entry) => filterAuditEntry(entry, role))
}

/**
 * Verifica si un entry debe ser visible para un rol específico
 */
export function shouldShowEntry(
  entry: AuditLogEntry,
  role: "ADMIN" | "ODONT" | "RECEP",
  context?: {
    pacienteId?: number
    consultaId?: number
    citaId?: number
    userId?: number
  }
): boolean {
  const permissions = getAuditPermissions(role)
  
  // ADMIN ve todo
  if (permissions.accessLevel === "FULL") {
    return true
  }
  
  // Para roles contextuales, verificar contexto
  if (permissions.accessLevel === "CONTEXTUAL" && context) {
    // ODONT: solo ve eventos de pacientes que está viendo o sus propias consultas
    if (role === "ODONT") {
      // Ver eventos del paciente actual
      if (context.pacienteId && entry.entity === "Patient" && entry.entityId === context.pacienteId) {
        return true
      }
      // Ver eventos de consultas propias
      if (context.consultaId && entry.entity === "Consulta" && entry.entityId === context.consultaId) {
        // Verificar que la consulta pertenezca al usuario
        return true // TODO: Verificar ownership
      }
      // Ver eventos de odontograma del paciente
      if (context.pacienteId && entry.entity === "OdontogramSnapshot") {
        return true // TODO: Verificar que el odontograma pertenezca al paciente
      }
    }
    
    // RECEP: solo ve eventos de citas asignadas o facturas propias
    if (role === "RECEP") {
      // Ver eventos de citas asignadas
      if (context.citaId && entry.entity === "Appointment" && entry.entityId === context.citaId) {
        return true // TODO: Verificar asignación
      }
      // Ver eventos de facturas propias
      if (entry.entity === "Invoice" && entry.actor.id === context.userId) {
        return true
      }
    }
  }
  
  return false
}

