// src/lib/access/patients.ts
"use server"

import { prisma as db } from "@/lib/prisma"
import { ForbiddenError, getPermissions } from "@/lib/utils/rbac"
import type { UserRole } from "@/lib/types/patient"

/** Usuario mínimo esperado en server (derivado de la sesión) */
export type SessionUserMin = {
  id: number
  role: UserRole // "ADMIN" | "ODONT" | "RECEP"
}

/** Alcance de acceso: controla qué secciones podrás mostrar en la impresión */
export type AccessScope = "FULL" | "LIMITED"

export type PatientAccessDecision = {
  ok: true
  scope: AccessScope
  patient: { idPaciente: number; estaActivo: boolean }
  permissions: ReturnType<typeof getPermissions>
} | {
  ok: false
  reason: "NOT_FOUND" | "FORBIDDEN"
}

/**
 * Verifica:
 *  - que el paciente exista
 *  - permisos del rol
 *  - define el alcance (FULL/LIMITED) para la vista imprimible
 * Política actual: all-clinic (todos los pacientes pertenecen a la misma clínica).
 */
export async function checkPatientAccess(
  user: SessionUserMin,
  patientId: number
): Promise<PatientAccessDecision> {
  const patient = await db.paciente.findUnique({
    where: { idPaciente: patientId },
    select: { idPaciente: true, estaActivo: true },
  })

  if (!patient) {
    return { ok: false, reason: "NOT_FOUND" }
  }

  const permissions = getPermissions(user.role)

  // Si no puede ver al paciente (permiso base), bloquea
  if (!permissions.canViewPatient) {
    return { ok: false, reason: "FORBIDDEN" }
  }

  // Define alcance por rol (podrás usar scope para filtrar secciones clínicas)
  const scope: AccessScope = (user.role === "ADMIN" || user.role === "ODONT") ? "FULL" : "LIMITED"

  return { ok: true, scope, patient, permissions }
}

/** Asegura permiso para imprimir y acceso al paciente */
export async function assertCanPrintPatient(user: SessionUserMin, patientId: number) {
  const decision = await checkPatientAccess(user, patientId)
  if (!decision.ok) {
    if (decision.reason === "NOT_FOUND") throw Object.assign(new Error("Paciente no encontrado"), { status: 404 })
    throw new ForbiddenError("No posee permisos para imprimir la ficha del paciente")
  }
  if (!decision.permissions.canPrint) {
    throw new ForbiddenError("No posee permisos de impresión")
  }
  return decision // devuelve scope y permissions para que la página filtre secciones si quiere
}

/** Asegura permiso para exportar PDF y acceso al paciente */
export async function assertCanExportPatient(user: SessionUserMin, patientId: number) {
  const decision = await checkPatientAccess(user, patientId)
  if (!decision.ok) {
    if (decision.reason === "NOT_FOUND") throw Object.assign(new Error("Paciente no encontrado"), { status: 404 })
    throw new ForbiddenError("No posee permisos para exportar PDF")
  }
  if (!decision.permissions.canExport) {
    throw new ForbiddenError("No posee permisos de exportación PDF")
  }
  return decision
}
