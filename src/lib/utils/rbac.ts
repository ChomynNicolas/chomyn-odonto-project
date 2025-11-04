// Role-Based Access Control utilities

import type { UserRole } from "@/lib/types/patient"

export interface RBACPermissions {
  canViewPatient: boolean
  canEditDemographics: boolean
  canEditContacts: boolean
  canActivateDeactivate: boolean
  canViewClinicalData: boolean
  canEditClinicalData: boolean
  canUploadAttachments: boolean
  canScheduleAppointments: boolean
  canViewAudit: boolean
  canExport: boolean
  canPrint: boolean
}

/**
 * Get permissions for a given role
 */
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
        canUploadAttachments: true,
        canScheduleAppointments: true,
        canViewAudit: true,
        canExport: true,
        canPrint: true,
      }

    case "ODONT":
      return {
        canViewPatient: true,
        canEditDemographics: false,
        canEditContacts: false,
        canActivateDeactivate: false,
        canViewClinicalData: true,
        canEditClinicalData: true,
        canUploadAttachments: true,
        canScheduleAppointments: true,
        canViewAudit: false,
        canExport: true,
        canPrint: true,
      }

    case "RECEP":
      return {
        canViewPatient: true,
        canEditDemographics: true,
        canEditContacts: true,
        canActivateDeactivate: false,
        canViewClinicalData: false,
        canEditClinicalData: false,
        canUploadAttachments: false,
        canScheduleAppointments: true,
        canViewAudit: false,
        canExport: false,
        canPrint: true,
      }

    default:
      return {
        canViewPatient: false,
        canEditDemographics: false,
        canEditContacts: false,
        canActivateDeactivate: false,
        canViewClinicalData: false,
        canEditClinicalData: false,
        canUploadAttachments: false,
        canScheduleAppointments: false,
        canViewAudit: false,
        canExport: false,
        canPrint: false,
      }
  }
}

/**
 * Check if user has specific permission
 */
export function hasPermission(role: UserRole, permission: keyof RBACPermissions): boolean {
  const permissions = getPermissions(role)
  return permissions[permission]
}
