// src/app/(dashboard)/pacientes/[id]/_components/anamnesis/utils/payload-helpers.ts
// Helper functions for extracting and validating anamnesis payload data

import type {
  ExtractedPayloadData,
  WomenSpecificPayload,
  PediatricSpecificPayload,
  AnamnesisMetadata,
  ExtractPayloadDataParams,
} from "../types/anamnesis-display.types"

/**
 * Type guard to check if value is a valid object
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Type guard for WomenSpecificPayload
 */
function isWomenSpecificPayload(value: unknown): value is WomenSpecificPayload {
  if (!isRecord(value)) return false
  return (
    (value.embarazada === null || typeof value.embarazada === "boolean") &&
    (value.semanasEmbarazo === null || (typeof value.semanasEmbarazo === "number" && value.semanasEmbarazo >= 1 && value.semanasEmbarazo <= 42)) &&
    (value.ultimaMenstruacion === null || typeof value.ultimaMenstruacion === "string") &&
    (value.planificacionFamiliar === null || typeof value.planificacionFamiliar === "string")
  )
}

/**
 * Type guard for PediatricSpecificPayload
 */
function isPediatricSpecificPayload(value: unknown): value is PediatricSpecificPayload {
  if (!isRecord(value)) return false
  return (
    (value.tieneHabitosSuccion === null || typeof value.tieneHabitosSuccion === "boolean") &&
    (value.lactanciaRegistrada === null ||
      typeof value.lactanciaRegistrada === "boolean" ||
      (typeof value.lactanciaRegistrada === "string" &&
        ["EXCLUSIVA", "MIXTA", "FORMULA", "NO_APLICA"].includes(value.lactanciaRegistrada)))
  )
}

/**
 * Type guard for AnamnesisMetadata
 */
function isAnamnesisMetadata(value: unknown): value is AnamnesisMetadata {
  if (!isRecord(value)) return false
  return (
    typeof value.patientAge === "number" &&
    typeof value.patientGender === "string" &&
    ["MASCULINO", "FEMENINO", "OTRO", "NO_ESPECIFICADO"].includes(value.patientGender) &&
    typeof value.formVersion === "string" &&
    typeof value.completedAt === "string"
  )
}

/**
 * Extracts and validates payload data from anamnesis response
 * @param params - Parameters including payload, tipo, and patientGender
 * @returns Extracted payload data with type safety
 */
export function extractPayloadData(params: ExtractPayloadDataParams): ExtractedPayloadData {
  const { payload, tipo, patientGender } = params

  if (!isRecord(payload)) {
    return {
      womenSpecific: null,
      pediatricSpecific: null,
      customNotes: null,
      metadata: null,
    }
  }

  // Extract women-specific data (only for FEMENINO gender)
  let womenSpecific: WomenSpecificPayload | null = null
  if (patientGender === "FEMENINO" && payload.womenSpecific) {
    if (isWomenSpecificPayload(payload.womenSpecific)) {
      womenSpecific = payload.womenSpecific
    }
  }

  // Extract pediatric-specific data (only for PEDIATRICO tipo)
  let pediatricSpecific: PediatricSpecificPayload | null = null
  if (tipo === "PEDIATRICO" && payload.pediatricSpecific) {
    if (isPediatricSpecificPayload(payload.pediatricSpecific)) {
      pediatricSpecific = payload.pediatricSpecific
    }
  }

  // Extract custom notes
  const customNotes =
    typeof payload.customNotes === "string" && payload.customNotes.trim().length > 0
      ? payload.customNotes.trim()
      : null

  // Extract metadata
  let metadata: AnamnesisMetadata | null = null
  if (payload._metadata && isAnamnesisMetadata(payload._metadata)) {
    metadata = payload._metadata
  }

  return {
    womenSpecific,
    pediatricSpecific,
    customNotes,
    metadata,
  }
}

/**
 * Gets the display label for lactanciaRegistrada enum value
 */
export function getLactanciaLabel(
  value: "EXCLUSIVA" | "MIXTA" | "FORMULA" | "NO_APLICA" | boolean | null | undefined
): string {
  if (value === null || value === undefined) return "No especificado"
  if (typeof value === "boolean") {
    return value ? "Sí" : "No"
  }
  const labels: Record<string, string> = {
    EXCLUSIVA: "Lactancia Exclusiva",
    MIXTA: "Lactancia Mixta",
    FORMULA: "Fórmula",
    NO_APLICA: "No Aplica",
  }
  return labels[value] || value
}

/**
 * Gets the badge variant for lactanciaRegistrada enum value
 */
export function getLactanciaBadgeVariant(
  value: "EXCLUSIVA" | "MIXTA" | "FORMULA" | "NO_APLICA" | boolean | null | undefined
): "default" | "secondary" | "outline" {
  if (value === null || value === undefined) return "outline"
  if (typeof value === "boolean") return value ? "default" : "outline"
  if (value === "EXCLUSIVA") return "default"
  if (value === "MIXTA") return "secondary"
  return "outline"
}

/**
 * Formats weeks of pregnancy for display
 */
export function formatPregnancyWeeks(weeks: number | null | undefined): string {
  if (weeks === null || weeks === undefined) return "No especificado"
  if (weeks === 1) return "1 semana"
  return `${weeks} semanas`
}

/**
 * Formats last menstrual period (FUM) for display
 */
export function formatLastMenstruation(dateString: string | null | undefined): string {
  if (!dateString) return "No especificado"
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  } catch {
    return "Fecha inválida"
  }
}

