// RBAC Permission System

import type { RolNombre } from '@/types/patient';

export const PERMISSIONS = {
  PATIENT_VIEW_CLINICAL: ['ADMIN', 'ODONT'],
  PATIENT_EDIT_CLINICAL: ['ADMIN', 'ODONT'],
  PATIENT_VIEW_ADMIN: ['ADMIN', 'RECEP'],
  PATIENT_EDIT_ADMIN: ['ADMIN', 'RECEP'],
  PATIENT_VIEW_AUDIT: ['ADMIN'],
  CONSULTATION_CREATE: ['ADMIN', 'ODONT'],
  ATTACHMENT_UPLOAD_CLINICAL: ['ADMIN', 'ODONT'],
  ATTACHMENT_UPLOAD_ADMIN: ['ADMIN', 'RECEP'],
  CONSENT_MANAGE: ['ADMIN', 'RECEP'],
} as const;

export function hasPermission(
  role: RolNombre,
  permission: keyof typeof PERMISSIONS
): boolean {
  return PERMISSIONS[permission].includes(role);
}

export function canViewClinical(role: RolNombre): boolean {
  return hasPermission(role, 'PATIENT_VIEW_CLINICAL');
}

export function canViewAdmin(role: RolNombre): boolean {
  return hasPermission(role, 'PATIENT_VIEW_ADMIN');
}

export function canViewAudit(role: RolNombre): boolean {
  return hasPermission(role, 'PATIENT_VIEW_AUDIT');
}
