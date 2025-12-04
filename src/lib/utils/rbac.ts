// src/lib/utils/rbac.ts
import type { UserRole } from "@/lib/types/patient"

export interface RBACPermissions {
  canViewPatient: boolean
  canEditDemographics: boolean
  canEditContacts: boolean
  canActivateDeactivate: boolean
  canViewClinicalData: boolean
  canEditClinicalData: boolean
  canViewAttachments: boolean
  canUploadAttachments: boolean
  canDeleteAttachments: boolean
  canScheduleAppointments: boolean
  canViewAudit: boolean
  canExport: boolean
  canPrint: boolean
  canUploadConsentimientos: boolean
  canViewConsentDetails: boolean
  canDownloadConsentimientos: boolean
  canViewRiskFlags: boolean
}

// Bandera para permitir exportar PDF a RECEP (configurable por env)
const RECEP_EXPORT_PDF =
  process.env.RECEP_EXPORT_PDF === "true" ||
  process.env.NEXT_PUBLIC_RECEP_EXPORT_PDF === "true" ||
  false;

/** Mapa de permisos por rol (usar banderas donde aplique) */
export function getPermissions(role: UserRole): RBACPermissions {
  switch (role) {
    case "ADMIN":
      return {
        canViewPatient: true,
        canEditDemographics: true,
        canEditContacts: true,
        canActivateDeactivate: true,
        canViewClinicalData: true,
        canEditClinicalData: true,
        canViewAttachments: true,
        canUploadAttachments: true,
        canDeleteAttachments: true,
        canScheduleAppointments: true,
        canViewAudit: true,
        canExport: true,
        canPrint: true,
        canUploadConsentimientos: true,
        canViewConsentDetails: true,
        canDownloadConsentimientos: true,
        canViewRiskFlags: true,
      }
    case "ODONT":
      return {
        canViewPatient: true,
        canEditDemographics: false,
        canEditContacts: false,
        canActivateDeactivate: false,
        canViewClinicalData: true,
        canEditClinicalData: true,
        canViewAttachments: true,
        canUploadAttachments: true,
        canDeleteAttachments: true,
        canScheduleAppointments: true,
        canViewAudit: false,
        canExport: true,
        canPrint: true,
        canUploadConsentimientos: true,
        canViewConsentDetails: true,
        canDownloadConsentimientos: true,
        canViewRiskFlags: true,
      }
    case "RECEP":
      return {
        canViewPatient: true,
        canEditDemographics: true,
        canEditContacts: true,
        canActivateDeactivate: false,
        canViewClinicalData: false, // Verás cómo usar esto para filtrar secciones clínicas
        canEditClinicalData: false,
        canViewAttachments: true,
        canUploadAttachments: false,
        canDeleteAttachments: false,
        canScheduleAppointments: true,
        canViewAudit: false,
        canExport: RECEP_EXPORT_PDF, // <- bandera
        canPrint: true,
        canUploadConsentimientos: false,
        canViewConsentDetails: true,
        canDownloadConsentimientos: true,
        canViewRiskFlags: false, // RECEP no ve detalles clínicos de riesgo
      }
    default:
      return {
        canViewPatient: false,
        canEditDemographics: false,
        canEditContacts: false,
        canActivateDeactivate: false,
        canViewClinicalData: false,
        canEditClinicalData: false,
        canViewAttachments: false,
        canUploadAttachments: false,
        canDeleteAttachments: false,
        canScheduleAppointments: false,
        canViewAudit: false,
        canExport: false,
        canPrint: false,
        canUploadConsentimientos: false,
        canViewConsentDetails: false,
        canDownloadConsentimientos: false,
        canViewRiskFlags: false,
      }
  }
}

/** Chequea un permiso específico */
export function hasPermission(role: UserRole, permission: keyof RBACPermissions): boolean {
  const permissions = getPermissions(role)
  return permissions[permission]
}

/** Error de autorización estándar (útil en server actions y routes) */
export class ForbiddenError extends Error {
  status = 403 as const
  constructor(message = "No autorizado") {
    super(message)
    this.name = "ForbiddenError"
  }
}

/** Asegura un permiso, lanza ForbiddenError si no cumple */
export function requirePermission(role: UserRole, permission: keyof RBACPermissions) {
  if (!hasPermission(role, permission)) {
    throw new ForbiddenError(`Requiere permiso: ${permission}`)
  }
}
