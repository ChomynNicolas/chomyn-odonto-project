// src/lib/audit/actions.ts

export const AuditAction = {
  PATIENT_PRINT: "PATIENT_PRINT",
  PATIENT_PDF_EXPORT: "PATIENT_PDF_EXPORT",
  ODONTOGRAM_CREATE: "ODONTOGRAM_CREATE",
  ODONTOGRAM_UPDATE: "ODONTOGRAM_UPDATE",
  // — futuras acciones comunes —
  // PATIENT_VIEW: "PATIENT_VIEW",
  // APPOINTMENT_CREATE: "APPOINTMENT_CREATE",
  // USER_LOGIN: "USER_LOGIN",
} as const
export type AuditAction = typeof AuditAction[keyof typeof AuditAction]

// Mantener las entidades "de negocio" coherentes
export const AuditEntity = {
  Patient: "Patient",
  Appointment: "Appointment",
  User: "User",
  OdontogramSnapshot: "OdontogramSnapshot",
  // agrega las que necesites
} as const
export type AuditEntity = typeof AuditEntity[keyof typeof AuditEntity]
