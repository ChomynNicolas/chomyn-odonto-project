// src/lib/types/audit.ts
/**
 * Tipos TypeScript para el sistema de auditoría
 */

export interface AuditLogEntry {
  id: number
  createdAt: string
  actor: {
    id: number
    nombre: string
    email?: string | null
    role: "ADMIN" | "ODONT" | "RECEP"
  }
  action: string
  entity: string
  entityId: number
  ip: string | null
  metadata: AuditMetadata | null
}

export interface AuditMetadata {
  // Información de contexto
  path?: string
  userAgent?: string
  timestamp?: string
  
  // Para cambios (UPDATE)
  changes?: {
    added?: number
    removed?: number
    modified?: number
  }
  summary?: string
  
  // Para diffs detallados
  diff?: {
    added: Array<Record<string, unknown>>
    removed: Array<Record<string, unknown>>
    modified: Array<{
      field: string
      oldValue: unknown
      newValue: unknown
    }>
  }
  
  // Metadata específica por acción
  [key: string]: unknown
}

export interface AuditLogFilters {
  // Rango de fechas
  dateFrom?: string
  dateTo?: string
  
  // Usuario
  actorId?: number
  
  // Tipo de acción
  action?: string
  actions?: string[] // Múltiples acciones
  
  // Entidad/Recurso
  entity?: string
  entities?: string[] // Múltiples entidades
  
  // ID del recurso
  entityId?: number
  
  // Búsqueda en metadata
  search?: string
  
  // IP
  ip?: string
  
  // Paginación
  page?: number
  limit?: number
  
  // Ordenamiento
  sortBy?: "createdAt" | "action" | "entity" | "actor"
  sortOrder?: "asc" | "desc"
}

export interface AuditLogResponse {
  data: AuditLogEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  filters: AuditLogFilters
}

export interface AuditLogDetail extends AuditLogEntry {
  // Información adicional para el detalle
  previousValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  fullDiff?: Record<string, { old: unknown; new: unknown }>
}

// Labels para acciones comunes
export const ACTION_LABELS: Record<string, string> = {
  PATIENT_CREATE: "Crear Paciente",
  PATIENT_UPDATE: "Actualizar Paciente",
  PATIENT_DELETE: "Eliminar Paciente",
  PATIENT_PRINT: "Imprimir Paciente",
  PATIENT_PDF_EXPORT: "Exportar PDF de Paciente",
  ODONTOGRAM_CREATE: "Crear Odontograma",
  ODONTOGRAM_UPDATE: "Actualizar Odontograma",
  APPOINTMENT_CREATE: "Crear Cita",
  APPOINTMENT_UPDATE: "Actualizar Cita",
  APPOINTMENT_CANCEL: "Cancelar Cita",
  USER_CREATE: "Crear Usuario",
  USER_UPDATE: "Actualizar Usuario",
  USER_DELETE: "Eliminar Usuario",
  LOGIN: "Inicio de Sesión",
  LOGOUT: "Cierre de Sesión",
  PERMISSION_CHANGE: "Cambio de Permisos",
  EXPORT: "Exportar Datos",
}

// Labels para entidades
export const ENTITY_LABELS: Record<string, string> = {
  Patient: "Paciente",
  Appointment: "Cita",
  User: "Usuario",
  OdontogramSnapshot: "Odontograma",
  Consulta: "Consulta",
  TreatmentPlan: "Plan de Tratamiento",
  Diagnosis: "Diagnóstico",
  Medication: "Medicación",
  Allergy: "Alergia",
}

// Colores por tipo de acción
export const ACTION_COLORS: Record<string, string> = {
  CREATE: "text-green-600 dark:text-green-400",
  UPDATE: "text-blue-600 dark:text-blue-400",
  DELETE: "text-red-600 dark:text-red-400",
  PRINT: "text-purple-600 dark:text-purple-400",
  EXPORT: "text-orange-600 dark:text-orange-400",
  LOGIN: "text-emerald-600 dark:text-emerald-400",
  LOGOUT: "text-gray-600 dark:text-gray-400",
}

