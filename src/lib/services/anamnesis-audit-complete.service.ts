// src/lib/services/anamnesis-audit-complete.service.ts
// Servicio completo de auditoría para anamnesis con diffs, versionado y cumplimiento

import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import { createHash } from "crypto"

export type AnamnesisAuditAction = "CREATE" | "UPDATE" | "DELETE" | "VIEW" | "RESTORE" | "EXPORT" | "PRINT"
export type AnamnesisChangeSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
export type FieldChangeType = "ADDED" | "REMOVED" | "MODIFIED"
export type SanitizeLevel = "FULL" | "PARTIAL" | "NONE"

export interface FieldDiff {
  fieldPath: string
  fieldLabel: string
  fieldType: string
  oldValue: unknown
  newValue: unknown
  oldValueDisplay?: string
  newValueDisplay?: string
  isCritical: boolean
  changeType: FieldChangeType
}

export interface AnamnesisState {
  idPatientAnamnesis: number
  pacienteId: number
  tipo: string
  motivoConsulta?: string | null
  tieneDolorActual: boolean
  dolorIntensidad?: number | null
  urgenciaPercibida?: string | null
  tieneEnfermedadesCronicas: boolean
  tieneAlergias: boolean
  tieneMedicacionActual: boolean
  embarazada?: boolean | null
  expuestoHumoTabaco?: boolean | null
  bruxismo?: boolean | null
  higieneCepilladosDia?: number | null
  usaHiloDental?: boolean | null
  ultimaVisitaDental?: string | null
  tieneHabitosSuccion?: boolean | null
  lactanciaRegistrada?: boolean | string | null
  payload?: Record<string, unknown> | null
  antecedents?: unknown[]
  medications?: unknown[]
  allergies?: unknown[]
  [key: string]: unknown
}

export interface CreateAnamnesisAuditLogParams {
  action: AnamnesisAuditAction
  anamnesisId: number
  pacienteId: number
  actorId: number
  actorRole: "ADMIN" | "ODONT" | "RECEP"
  previousState?: AnamnesisState | null
  newState?: AnamnesisState | null
  reason?: string | null
  consultaId?: number | null
  headers?: Headers
  path?: string
  previousVersionNumber?: number | null
  newVersionNumber?: number | null
}

type PrismaTransaction = Omit<
  Prisma.TransactionClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use"
>

/**
 * Extrae contexto de la petición desde headers
 */
function extractRequestContext(headers?: Headers): {
  ipAddress?: string
  userAgent?: string
  sessionId?: string
} {
  try {
    if (!headers) return {}
    
    const ip =
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headers.get("x-real-ip") ||
      undefined

    const userAgent = headers.get("user-agent") || undefined
    const sessionId = headers.get("x-session-id") || undefined // Si NextAuth expone session ID

    return {
      ipAddress: ip,
      userAgent,
      sessionId,
    }
  } catch {
    return {}
  }
}

/**
 * Calcula hash SHA-256 de un objeto para integridad
 */
function calculateIntegrityHash(data: Record<string, unknown>): string {
  const str = JSON.stringify(data, Object.keys(data).sort())
  return createHash("sha256").update(str).digest("hex")
}

/**
 * Calcula diff campo por campo entre dos estados de anamnesis
 */
export function calculateAnamnesisDiff(
  previousState: AnamnesisState | null,
  newState: AnamnesisState | null
): FieldDiff[] {
  if (!previousState && !newState) return []
  if (!previousState) {
    // Todo es nuevo
    return Object.keys(newState || {}).map((key) => ({
      fieldPath: key,
      fieldLabel: getFieldLabel(key),
      fieldType: typeof newState?.[key] ?? "unknown",
      oldValue: null,
      newValue: newState?.[key],
      oldValueDisplay: null,
      newValueDisplay: formatDisplayValue(newState?.[key]),
      isCritical: isCriticalField(key),
      changeType: "ADDED" as FieldChangeType,
    }))
  }
  if (!newState) {
    // Todo fue eliminado
    return Object.keys(previousState).map((key) => ({
      fieldPath: key,
      fieldLabel: getFieldLabel(key),
      fieldType: typeof previousState[key] ?? "unknown",
      oldValue: previousState[key],
      newValue: null,
      oldValueDisplay: formatDisplayValue(previousState[key]),
      newValueDisplay: null,
      isCritical: isCriticalField(key),
      changeType: "REMOVED" as FieldChangeType,
    }))
  }

  const diffs: FieldDiff[] = []
  const allKeys = new Set([...Object.keys(previousState), ...Object.keys(newState)])

  for (const key of allKeys) {
    const oldVal = previousState[key]
    const newVal = newState[key]

    // Comparar valores (considerando null/undefined como iguales)
    const oldValNormalized = oldVal === undefined ? null : oldVal
    const newValNormalized = newVal === undefined ? null : newVal

    if (JSON.stringify(oldValNormalized) !== JSON.stringify(newValNormalized)) {
      // Manejar estructuras anidadas (payload, arrays)
      if (key === "payload" && typeof oldVal === "object" && typeof newVal === "object") {
        const payloadDiffs = compareNestedObject(
          oldVal as Record<string, unknown>,
          newVal as Record<string, unknown>,
          "payload"
        )
        diffs.push(...payloadDiffs)
      } else if (key === "antecedents" || key === "medications" || key === "allergies") {
        // Comparar arrays normalizados
        const arrayDiffs = compareArrays(oldVal as unknown[], newVal as unknown[], key)
        diffs.push(...arrayDiffs)
      } else {
        // Campo simple
        diffs.push({
          fieldPath: key,
          fieldLabel: getFieldLabel(key),
          fieldType: typeof newVal ?? typeof oldVal ?? "unknown",
          oldValue: oldVal,
          newValue: newVal,
          oldValueDisplay: formatDisplayValue(oldVal),
          newValueDisplay: formatDisplayValue(newVal),
          isCritical: isCriticalField(key),
          changeType: "MODIFIED" as FieldChangeType,
        })
      }
    }
  }

  return diffs
}

/**
 * Compara objetos anidados recursivamente
 */
function compareNestedObject(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  basePath: string
): FieldDiff[] {
  const diffs: FieldDiff[] = []
  const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})])

  for (const key of allKeys) {
    const fieldPath = `${basePath}.${key}`
    const oldVal = oldObj?.[key]
    const newVal = newObj?.[key]

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      if (typeof oldVal === "object" && typeof newVal === "object" && !Array.isArray(oldVal) && !Array.isArray(newVal)) {
        // Recursión para objetos anidados más profundos
        const nestedDiffs = compareNestedObject(
          (oldVal as Record<string, unknown>) || {},
          (newVal as Record<string, unknown>) || {},
          fieldPath
        )
        diffs.push(...nestedDiffs)
      } else {
        diffs.push({
          fieldPath,
          fieldLabel: getFieldLabel(key),
          fieldType: typeof newVal ?? typeof oldVal ?? "unknown",
          oldValue: oldVal,
          newValue: newVal,
          oldValueDisplay: formatDisplayValue(oldVal),
          newValueDisplay: formatDisplayValue(newVal),
          isCritical: isCriticalField(key),
          changeType: oldVal === undefined ? ("ADDED" as FieldChangeType) : newVal === undefined ? ("REMOVED" as FieldChangeType) : ("MODIFIED" as FieldChangeType),
        })
      }
    }
  }

  return diffs
}

/**
 * Compara arrays (simplificado - compara por longitud y primeros elementos)
 */
function compareArrays(oldArr: unknown[] | null | undefined, newArr: unknown[] | null | undefined, fieldName: string): FieldDiff[] {
  const diffs: FieldDiff[] = []
  const oldLength = oldArr?.length ?? 0
  const newLength = newArr?.length ?? 0

  if (oldLength !== newLength) {
    diffs.push({
      fieldPath: fieldName,
      fieldLabel: getFieldLabel(fieldName),
      fieldType: "array",
      oldValue: oldArr,
      newValue: newArr,
      oldValueDisplay: `${oldLength} ${oldLength === 1 ? "elemento" : "elementos"}`,
      newValueDisplay: `${newLength} ${newLength === 1 ? "elemento" : "elementos"}`,
      isCritical: isCriticalField(fieldName),
      changeType: newLength > oldLength ? ("ADDED" as FieldChangeType) : ("REMOVED" as FieldChangeType),
    })
  }

  return diffs
}

/**
 * Obtiene etiqueta legible para un campo
 */
function getFieldLabel(fieldPath: string): string {
  const labels: Record<string, string> = {
    motivoConsulta: "Motivo de consulta",
    tieneDolorActual: "Tiene dolor actual",
    dolorIntensidad: "Intensidad del dolor",
    urgenciaPercibida: "Urgencia percibida",
    tieneEnfermedadesCronicas: "Tiene enfermedades crónicas",
    tieneAlergias: "Tiene alergias",
    tieneMedicacionActual: "Tiene medicación actual",
    embarazada: "Embarazada",
    expuestoHumoTabaco: "Expuesto a humo de tabaco",
    bruxismo: "Bruxismo",
    higieneCepilladosDia: "Cepillados por día",
    usaHiloDental: "Usa hilo dental",
    ultimaVisitaDental: "Última visita dental",
    tieneHabitosSuccion: "Tiene hábitos de succión",
    lactanciaRegistrada: "Lactancia registrada",
    payload: "Datos adicionales",
    "payload.womenSpecific": "Información específica para mujeres",
    "payload.womenSpecific.embarazada": "Embarazada",
    "payload.womenSpecific.semanasEmbarazo": "Semanas de embarazo",
    "payload.womenSpecific.ultimaMenstruacion": "Última menstruación",
    "payload.womenSpecific.planificacionFamiliar": "Planificación familiar",
    "payload.pediatricSpecific": "Información pediátrica",
    "payload.pediatricSpecific.tieneHabitosSuccion": "Hábitos de succión",
    "payload.pediatricSpecific.lactanciaRegistrada": "Lactancia registrada",
    antecedents: "Antecedentes médicos",
    medications: "Medicaciones",
    allergies: "Alergias",
  }

  return labels[fieldPath] || fieldPath
}

/**
 * Formatea un valor para visualización
 */
function formatDisplayValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "boolean") return value ? "Sí" : "No"
  if (typeof value === "number") return String(value)
  if (typeof value === "string") return value
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return `${value.length} elemento${value.length !== 1 ? "s" : ""}`
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

/**
 * Determina si un campo es crítico para seguridad
 */
function isCriticalField(fieldPath: string): boolean {
  const criticalFields = [
    "tieneAlergias",
    "allergies",
    "embarazada",
    "payload.womenSpecific.embarazada",
    "tieneMedicacionActual",
    "medications",
    "motivoConsulta",
    "dolorIntensidad",
    "urgenciaPercibida",
  ]
  return criticalFields.some((field) => fieldPath.includes(field))
}

/**
 * Determina la severidad de un cambio basado en los diffs
 */
export function determineChangeSeverity(fieldDiffs: FieldDiff[], action: AnamnesisAuditAction): AnamnesisChangeSeverity {
  if (action === "CREATE" || action === "VIEW") return "LOW"

  const hasCriticalChanges = fieldDiffs.some((diff) => diff.isCritical)
  const hasHighPriorityChanges = fieldDiffs.some(
    (diff) =>
      diff.fieldPath === "motivoConsulta" ||
      diff.fieldPath === "dolorIntensidad" ||
      diff.fieldPath === "urgenciaPercibida"
  )

  // Verificar cambios en alergias severas o embarazo
  const hasSevereAllergyChanges = fieldDiffs.some(
    (diff) => diff.fieldPath.includes("allergies") && diff.newValue && typeof diff.newValue === "object" && (diff.newValue as { severity?: string })?.severity === "SEVERE"
  )
  const hasPregnancyChanges = fieldDiffs.some(
    (diff) => diff.fieldPath.includes("embarazada") && diff.newValue === true
  )

  if (hasSevereAllergyChanges || hasPregnancyChanges) return "CRITICAL"
  if (hasCriticalChanges) return "HIGH"
  if (hasHighPriorityChanges) return "HIGH"

  // Verificar cambios en hábitos o higiene
  const hasHabitChanges = fieldDiffs.some(
    (diff) =>
      diff.fieldPath.includes("bruxismo") ||
      diff.fieldPath.includes("higieneCepilladosDia") ||
      diff.fieldPath.includes("usaHiloDental")
  )
  if (hasHabitChanges) return "MEDIUM"

  return "LOW"
}

/**
 * Sanitiza datos sensibles de anamnesis según nivel
 */
export function sanitizeAnamnesisData(
  data: AnamnesisState | null,
  sanitizeLevel: SanitizeLevel = "PARTIAL"
): AnamnesisState | null {
  if (!data || sanitizeLevel === "NONE") return data

  const sanitized = { ...data }

  if (sanitizeLevel === "FULL") {
    // Solo metadatos, sin datos clínicos
    return {
      idPatientAnamnesis: sanitized.idPatientAnamnesis,
      pacienteId: sanitized.pacienteId,
      tipo: sanitized.tipo,
    } as AnamnesisState
  }

  // PARTIAL: Mantener datos clínicos genéricos, enmascarar PII
  if (sanitized.payload && typeof sanitized.payload === "object") {
    const payload = sanitized.payload as Record<string, unknown>
    // Enmascarar información sensible en payload si existe
    if (payload.customNotes && typeof payload.customNotes === "string") {
      payload.customNotes = maskSensitiveText(payload.customNotes)
    }
  }

  return sanitized
}

/**
 * Enmascara texto sensible (últimos caracteres)
 */
function maskSensitiveText(text: string, visibleChars: number = 4): string {
  if (text.length <= visibleChars) return "***"
  return "***" + text.slice(-visibleChars)
}

/**
 * Crea un registro de auditoría completo para anamnesis
 */
export async function createAnamnesisAuditLog(
  params: CreateAnamnesisAuditLogParams,
  tx?: PrismaTransaction
): Promise<number> {
  const client = (tx as any) || prisma

  // Extraer contexto de la petición
  const context = extractRequestContext(params.headers)

  // Calcular diffs si hay estados previos y nuevos
  let fieldDiffs: FieldDiff[] = []
  if (params.previousState && params.newState) {
    fieldDiffs = calculateAnamnesisDiff(params.previousState, params.newState)
  } else if (params.action === "CREATE" && params.newState) {
    // Para CREATE, todos los campos son nuevos
    fieldDiffs = calculateAnamnesisDiff(null, params.newState)
  }

  // Determinar severidad
  const severity = determineChangeSeverity(fieldDiffs, params.action)

  // Sanitizar estados según necesidad (por defecto PARTIAL)
  const sanitizedPreviousState = sanitizeAnamnesisData(params.previousState || null, "PARTIAL")
  const sanitizedNewState = sanitizeAnamnesisData(params.newState || null, "PARTIAL")

  // Crear resumen de cambios
  const changesSummary = {
    totalChanges: fieldDiffs.length,
    criticalChanges: fieldDiffs.filter((d) => d.isCritical).length,
    added: fieldDiffs.filter((d) => d.changeType === "ADDED").length,
    removed: fieldDiffs.filter((d) => d.changeType === "REMOVED").length,
    modified: fieldDiffs.filter((d) => d.changeType === "MODIFIED").length,
    fieldsChanged: fieldDiffs.map((d) => d.fieldPath),
  }

  // Preparar datos para hash de integridad
  const integrityData = {
    anamnesisId: params.anamnesisId,
    action: params.action,
    actorId: params.actorId,
    performedAt: new Date().toISOString(),
    fieldDiffsCount: fieldDiffs.length,
  }
  const integrityHash = calculateIntegrityHash(integrityData)

  // Crear registro de auditoría
  const auditLog = await client.anamnesisAuditLog.create({
    data: {
      anamnesisId: params.anamnesisId,
      pacienteId: params.pacienteId,
      action: params.action,
      actorId: params.actorId,
      actorRole: params.actorRole,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      requestPath: params.path,
      previousState: sanitizedPreviousState ? (sanitizedPreviousState as Prisma.JsonValue) : null,
      newState: sanitizedNewState ? (sanitizedNewState as Prisma.JsonValue) : null,
      fieldDiffs: fieldDiffs.length > 0 ? (fieldDiffs as Prisma.JsonValue) : null,
      changesSummary: changesSummary as Prisma.JsonValue,
      reason: params.reason,
      severity,
      consultaId: params.consultaId,
      previousVersionNumber: params.previousVersionNumber,
      newVersionNumber: params.newVersionNumber,
      integrityHash,
    },
  })

  // Crear registros de field diffs normalizados (opcional, para consultas avanzadas)
  if (fieldDiffs.length > 0) {
    await client.anamnesisFieldDiff.createMany({
      data: fieldDiffs.map((diff) => ({
        auditLogId: auditLog.idAnamnesisAuditLog,
        fieldPath: diff.fieldPath,
        fieldLabel: diff.fieldLabel,
        fieldType: diff.fieldType,
        oldValue: diff.oldValue !== undefined ? (diff.oldValue as Prisma.JsonValue) : null,
        newValue: diff.newValue !== undefined ? (diff.newValue as Prisma.JsonValue) : null,
        oldValueDisplay: diff.oldValueDisplay,
        newValueDisplay: diff.newValueDisplay,
        isCritical: diff.isCritical,
        changeType: diff.changeType,
      })),
    })
  }

  return auditLog.idAnamnesisAuditLog
}

/**
 * Crea un snapshot de anamnesis en PatientAnamnesisVersion
 */
export async function createAnamnesisSnapshot(
  anamnesisId: number,
  versionNumber: number,
  reason?: string | null,
  consultaId?: number | null,
  headers?: Headers,
  tx?: PrismaTransaction
): Promise<number> {
  const client = (tx as any) || prisma

  // Obtener anamnesis completa con relaciones
  const anamnesis = await client.patientAnamnesis.findUnique({
    where: { idPatientAnamnesis: anamnesisId },
    include: {
      antecedents: {
        include: { antecedentCatalog: true },
      },
      medications: {
        include: {
          medication: {
            include: { medicationCatalog: true },
          },
        },
      },
      allergies: {
        include: {
          allergy: {
            include: { allergyCatalog: true },
          },
        },
      },
    },
  })

  if (!anamnesis) {
    throw new Error(`Anamnesis ${anamnesisId} no encontrada`)
  }

  const context = extractRequestContext(headers)

  // Crear snapshot
  const snapshot = await client.patientAnamnesisVersion.create({
    data: {
      pacienteId: anamnesis.pacienteId,
      anamnesisId: anamnesis.idPatientAnamnesis,
      consultaId: consultaId || null,
      tipo: anamnesis.tipo,
      motivoConsulta: anamnesis.motivoConsulta,
      tieneDolorActual: anamnesis.tieneDolorActual,
      dolorIntensidad: anamnesis.dolorIntensidad,
      urgenciaPercibida: anamnesis.urgenciaPercibida,
      tieneEnfermedadesCronicas: anamnesis.tieneEnfermedadesCronicas,
      tieneAlergias: anamnesis.tieneAlergias,
      tieneMedicacionActual: anamnesis.tieneMedicacionActual,
      embarazada: anamnesis.embarazada,
      expuestoHumoTabaco: anamnesis.expuestoHumoTabaco,
      bruxismo: anamnesis.bruxismo,
      higieneCepilladosDia: anamnesis.higieneCepilladosDia,
      usaHiloDental: anamnesis.usaHiloDental,
      ultimaVisitaDental: anamnesis.ultimaVisitaDental,
      tieneHabitosSuccion: anamnesis.tieneHabitosSuccion,
      lactanciaRegistrada: anamnesis.lactanciaRegistrada,
      payload: (anamnesis.payload as Prisma.JsonValue) || {},
      motivoCambio: reason || null,
      versionNumber,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      reason: reason || null,
      creadoPorUserId: anamnesis.actualizadoPorUserId || anamnesis.creadoPorUserId,
    },
  })

  return snapshot.idPatientAnamnesisVersion
}

/**
 * Restaura una versión anterior de anamnesis
 */
export async function restoreAnamnesisVersion(
  anamnesisId: number,
  versionId: number,
  actorId: number,
  actorRole: "ADMIN" | "ODONT" | "RECEP",
  reason?: string | null,
  headers?: Headers,
  tx?: PrismaTransaction
): Promise<AnamnesisState> {
  const client = (tx as any) || prisma

  // Obtener snapshot a restaurar
  const snapshot = await client.patientAnamnesisVersion.findUnique({
    where: { idPatientAnamnesisVersion: versionId },
    include: {
      anamnesis: true,
    },
  })

  if (!snapshot) {
    throw new Error(`Versión ${versionId} no encontrada`)
  }

  if (snapshot.anamnesisId !== anamnesisId) {
    throw new Error("La versión no pertenece a esta anamnesis")
  }

  // Obtener estado actual antes de restaurar
  const currentAnamnesis = await client.patientAnamnesis.findUnique({
    where: { idPatientAnamnesis: anamnesisId },
  })

  if (!currentAnamnesis) {
    throw new Error(`Anamnesis ${anamnesisId} no encontrada`)
  }

  const previousState: AnamnesisState = {
    idPatientAnamnesis: currentAnamnesis.idPatientAnamnesis,
    pacienteId: currentAnamnesis.pacienteId,
    tipo: currentAnamnesis.tipo,
    motivoConsulta: currentAnamnesis.motivoConsulta,
    tieneDolorActual: currentAnamnesis.tieneDolorActual,
    dolorIntensidad: currentAnamnesis.dolorIntensidad,
    urgenciaPercibida: currentAnamnesis.urgenciaPercibida,
    tieneEnfermedadesCronicas: currentAnamnesis.tieneEnfermedadesCronicas,
    tieneAlergias: currentAnamnesis.tieneAlergias,
    tieneMedicacionActual: currentAnamnesis.tieneMedicacionActual,
    embarazada: currentAnamnesis.embarazada,
    expuestoHumoTabaco: currentAnamnesis.expuestoHumoTabaco,
    bruxismo: currentAnamnesis.bruxismo,
    higieneCepilladosDia: currentAnamnesis.higieneCepilladosDia,
    usaHiloDental: currentAnamnesis.usaHiloDental,
    ultimaVisitaDental: currentAnamnesis.ultimaVisitaDental?.toISOString() || null,
    tieneHabitosSuccion: currentAnamnesis.tieneHabitosSuccion,
    lactanciaRegistrada: currentAnamnesis.lactanciaRegistrada,
    payload: currentAnamnesis.payload as Record<string, unknown> | null,
  }

  // Restaurar desde snapshot
  const newVersionNumber = currentAnamnesis.versionNumber + 1

  await client.patientAnamnesis.update({
    where: { idPatientAnamnesis: anamnesisId },
    data: {
      motivoConsulta: snapshot.motivoConsulta,
      tieneDolorActual: snapshot.tieneDolorActual,
      dolorIntensidad: snapshot.dolorIntensidad,
      urgenciaPercibida: snapshot.urgenciaPercibida,
      tieneEnfermedadesCronicas: snapshot.tieneEnfermedadesCronicas,
      tieneAlergias: snapshot.tieneAlergias,
      tieneMedicacionActual: snapshot.tieneMedicacionActual,
      embarazada: snapshot.embarazada,
      expuestoHumoTabaco: snapshot.expuestoHumoTabaco,
      bruxismo: snapshot.bruxismo,
      higieneCepilladosDia: snapshot.higieneCepilladosDia,
      usaHiloDental: snapshot.usaHiloDental,
      ultimaVisitaDental: snapshot.ultimaVisitaDental,
      tieneHabitosSuccion: snapshot.tieneHabitosSuccion,
      lactanciaRegistrada: snapshot.lactanciaRegistrada,
      payload: snapshot.payload as Prisma.JsonValue,
      versionNumber: newVersionNumber,
      actualizadoPorUserId: actorId,
    },
  })

  // Crear nuevo snapshot de la restauración
  const context = extractRequestContext(headers)
  await client.patientAnamnesisVersion.create({
    data: {
      pacienteId: snapshot.pacienteId,
      anamnesisId: snapshot.anamnesisId,
      consultaId: null,
      tipo: snapshot.tipo,
      motivoConsulta: snapshot.motivoConsulta,
      tieneDolorActual: snapshot.tieneDolorActual,
      dolorIntensidad: snapshot.dolorIntensidad,
      urgenciaPercibida: snapshot.urgenciaPercibida,
      tieneEnfermedadesCronicas: snapshot.tieneEnfermedadesCronicas,
      tieneAlergias: snapshot.tieneAlergias,
      tieneMedicacionActual: snapshot.tieneMedicacionActual,
      embarazada: snapshot.embarazada,
      expuestoHumoTabaco: snapshot.expuestoHumoTabaco,
      bruxismo: snapshot.bruxismo,
      higieneCepilladosDia: snapshot.higieneCepilladosDia,
      usaHiloDental: snapshot.usaHiloDental,
      ultimaVisitaDental: snapshot.ultimaVisitaDental,
      tieneHabitosSuccion: snapshot.tieneHabitosSuccion,
      lactanciaRegistrada: snapshot.lactanciaRegistrada,
      payload: snapshot.payload as Prisma.JsonValue,
      motivoCambio: reason || "Restauración de versión anterior",
      versionNumber: newVersionNumber,
      restoredFromVersionId: versionId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      reason: reason || "Restauración de versión anterior",
      creadoPorUserId: actorId,
    },
  })

  // Registrar RESTORE en auditoría
  const newState: AnamnesisState = {
    idPatientAnamnesis: anamnesisId,
    pacienteId: snapshot.pacienteId,
    tipo: snapshot.tipo,
    motivoConsulta: snapshot.motivoConsulta,
    tieneDolorActual: snapshot.tieneDolorActual,
    dolorIntensidad: snapshot.dolorIntensidad,
    urgenciaPercibida: snapshot.urgenciaPercibida,
    tieneEnfermedadesCronicas: snapshot.tieneEnfermedadesCronicas,
    tieneAlergias: snapshot.tieneAlergias,
    tieneMedicacionActual: snapshot.tieneMedicacionActual,
    embarazada: snapshot.embarazada,
    expuestoHumoTabaco: snapshot.expuestoHumoTabaco,
    bruxismo: snapshot.bruxismo,
    higieneCepilladosDia: snapshot.higieneCepilladosDia,
    usaHiloDental: snapshot.usaHiloDental,
    ultimaVisitaDental: snapshot.ultimaVisitaDental?.toISOString() || null,
    tieneHabitosSuccion: snapshot.tieneHabitosSuccion,
    lactanciaRegistrada: snapshot.lactanciaRegistrada,
    payload: snapshot.payload as Record<string, unknown> | null,
  }

  await createAnamnesisAuditLog(
    {
      action: "RESTORE",
      anamnesisId,
      pacienteId: snapshot.pacienteId,
      actorId,
      actorRole,
      previousState,
      newState,
      reason: reason || "Restauración de versión anterior",
      previousVersionNumber: currentAnamnesis.versionNumber,
      newVersionNumber,
      headers,
    },
    tx
  )

  return newState
}

