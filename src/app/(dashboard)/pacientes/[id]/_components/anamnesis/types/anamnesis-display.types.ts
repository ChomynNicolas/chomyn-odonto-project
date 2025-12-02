// src/app/(dashboard)/pacientes/[id]/_components/anamnesis/types/anamnesis-display.types.ts
// Type definitions for anamnesis display components



/**
 * Women-specific data from payload
 */
export interface WomenSpecificPayload {
  embarazada: boolean | null
  semanasEmbarazo: number | null
  ultimaMenstruacion: string | null
  planificacionFamiliar: string | null
}

/**
 * Pediatric-specific data from payload
 */
export interface PediatricSpecificPayload {
  tieneHabitosSuccion: boolean | null
  lactanciaRegistrada: "EXCLUSIVA" | "MIXTA" | "FORMULA" | "NO_APLICA" | boolean | null
}

/**
 * Metadata from payload
 */
export interface AnamnesisMetadata {
  patientAge: number
  patientGender: "MASCULINO" | "FEMENINO" | "OTRO" | "NO_ESPECIFICADO"
  formVersion: string
  completedAt: string
}

/**
 * Complete anamnesis payload structure
 */
export interface AnamnesisPayload {
  womenSpecific?: WomenSpecificPayload
  pediatricSpecific?: PediatricSpecificPayload
  customNotes?: string
  _metadata?: AnamnesisMetadata
}

/**
 * Extracted payload data with type safety
 */
export interface ExtractedPayloadData {
  womenSpecific: WomenSpecificPayload | null
  pediatricSpecific: PediatricSpecificPayload | null
  customNotes: string | null
  metadata: AnamnesisMetadata | null
}

/**
 * Props for payload extraction helper
 */
export interface ExtractPayloadDataParams {
  payload: unknown
  tipo: "ADULTO" | "PEDIATRICO"
  patientGender?: "MASCULINO" | "FEMENINO" | "OTRO" | "NO_ESPECIFICADO"
}

