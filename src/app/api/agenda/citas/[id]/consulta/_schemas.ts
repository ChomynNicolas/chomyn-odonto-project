// src/app/api/agenda/citas/[id]/consulta/_schemas.ts
import { z } from "zod"
import {
  ConsultaEstado,
  DiagnosisStatus,
  ToothCondition,
  DienteSuperficie,
  PerioSite,
  PerioBleeding,
  AdjuntoTipo,
} from "@prisma/client"

// ============================================================================
// PARAMS
// ============================================================================
export const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type ParamsSchema = z.infer<typeof paramsSchema>

// ============================================================================
// ANAMNESIS / NOTAS CLÍNICAS
// ============================================================================
/**
 * Schema para crear una nueva anamnesis clínica
 * - title: Opcional, 1-200 caracteres si se proporciona, puede ser null o string vacío
 * - notes: Obligatorio, 1-5000 caracteres
 */
export const createAnamnesisSchema = z.object({
  title: z
    .string()
    .max(200, "El título no puede exceder 200 caracteres")
    .optional()
    .nullable()
    .transform((val) => (val === "" || val === null || val === undefined ? null : val.trim() || null)),
  notes: z
    .string()
    .min(1, "Las notas son obligatorias")
    .max(5000, "Las notas no pueden exceder 5000 caracteres")
    .trim(),
})

/**
 * Schema para actualizar una anamnesis existente
 * Todos los campos son opcionales para permitir actualizaciones parciales
 */
export const updateAnamnesisSchema = z
  .object({
    title: z
      .string()
      .max(200, "El título no puede exceder 200 caracteres")
      .optional()
      .nullable()
      .transform((val) => (val === "" || val === null || val === undefined ? null : val.trim() || null)),
    notes: z
      .string()
      .min(1, "Las notas no pueden estar vacías")
      .max(5000, "Las notas no pueden exceder 5000 caracteres")
      .trim()
      .optional(),
  })
  .partial()

export type CreateAnamnesisInput = z.infer<typeof createAnamnesisSchema>
export type UpdateAnamnesisInput = z.infer<typeof updateAnamnesisSchema>

// ============================================================================
// DIAGNÓSTICOS
// ============================================================================
export const createDiagnosisSchema = z.object({
  diagnosisId: z.number().int().positive().optional().nullable(),
  code: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .transform((val) => (val === "" || val === null || val === undefined ? null : val.trim() || null)),
  label: z.string().min(1).max(200).trim(),
  status: z.nativeEnum(DiagnosisStatus).default(DiagnosisStatus.ACTIVE),
  notes: z
    .string()
    .max(1000)
    .optional()
    .nullable()
    .transform((val) => (val === "" || val === null || val === undefined ? null : val.trim() || null)),
})

export const updateDiagnosisSchema = z
  .object({
    status: z.nativeEnum(DiagnosisStatus).optional(),
    reason: z
      .string()
      .max(500)
      .optional()
      .nullable()
      .transform((val) => (val === "" || val === null || val === undefined ? null : val.trim() || null)),
    notes: z
      .string()
      .max(1000)
      .optional()
      .nullable()
      .transform((val) => (val === "" || val === null || val === undefined ? null : val.trim() || null)),
  })
  .superRefine((data, ctx) => {
    // If status is DISCARDED, reason is required
    if (data.status === DiagnosisStatus.DISCARDED && (!data.reason || data.reason.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La razón es obligatoria cuando se descarta un diagnóstico",
        path: ["reason"],
      })
    }
  })

export type CreateDiagnosisInput = z.infer<typeof createDiagnosisSchema>
export type UpdateDiagnosisInput = z.infer<typeof updateDiagnosisSchema>

// ============================================================================
// PROCEDIMIENTOS
// ============================================================================
export const createProcedureSchema = z
  .object({
    procedureId: z.number().int().positive().optional().nullable(),
    serviceType: z
      .string()
      .max(200)
      .optional()
      .nullable()
      .transform((val) => (val === "" || val === null || val === undefined ? null : val.trim() || null)),
    toothNumber: z.number().int().min(1).max(85).optional().nullable(),
    toothSurface: z.nativeEnum(DienteSuperficie).optional().nullable(),
    quantity: z.number().int().positive().default(1),
    unitPriceCents: z.number().int().nonnegative().optional().nullable(),
    totalCents: z.number().int().nonnegative().optional().nullable(),
    resultNotes: z
      .string()
      .max(2000)
      .optional()
      .nullable()
      .transform((val) => (val === "" || val === null || val === undefined ? null : val.trim() || null)),
    treatmentStepId: z.number().int().positive().optional().nullable(),
    diagnosisId: z.number().int().positive().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // Validación condicional: debe haber procedureId O serviceType no vacío
    const hasProcedureId = data.procedureId !== undefined && data.procedureId !== null
    const hasServiceType = data.serviceType !== undefined && data.serviceType !== null && data.serviceType.trim() !== ""

    if (!hasProcedureId && !hasServiceType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe seleccionar un procedimiento del catálogo o ingresar un nombre manual",
        path: ["procedureId"], // Asociar el error al campo procedureId
      })
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe seleccionar un procedimiento del catálogo o ingresar un nombre manual",
        path: ["serviceType"], // También al campo serviceType
      })
    }
  })

export const updateProcedureSchema = z.object({
  quantity: z.number().int().positive().optional(),
  unitPriceCents: z.number().int().nonnegative().optional().nullable(),
  totalCents: z.number().int().nonnegative().optional().nullable(),
  resultNotes: z
    .string()
    .max(2000)
    .optional()
    .nullable()
    .transform((val) => (val === "" || val === null || val === undefined ? null : val.trim() || null)),
})

export type CreateProcedureInput = z.infer<typeof createProcedureSchema>
export type UpdateProcedureInput = z.infer<typeof updateProcedureSchema>

// ============================================================================
// INDICACIONES / RECETAS (usando PatientMedication)
// ============================================================================
export const createMedicationSchema = z
  .object({
    medicationId: z.number().int().positive().optional().nullable(),
    label: z
      .string()
      .max(200)
      .optional()
      .nullable()
      .transform((val) => (val === "" || val === null || val === undefined ? null : val.trim() || null)),
    description: z
      .string()
      .max(1000)
      .optional()
      .nullable()
      .transform((val) => (val === "" || val === null || val === undefined ? null : val.trim() || null)),
    dose: z.string().max(100).optional().nullable(),
    freq: z.string().max(100).optional().nullable(),
    route: z.string().max(100).optional().nullable(),
    startAt: z
      .string()
      .optional()
      .nullable()
      .transform((val) => {
        if (!val || val === "" || val === null) return null
        // If it's already a datetime string (ISO format), return as is
        if (val.includes("T") || val.includes(" ")) {
          // Validate it's a valid datetime
          const date = new Date(val)
          if (isNaN(date.getTime())) return null
          return date.toISOString()
        }
        // If it's a date string (YYYY-MM-DD), convert to datetime ISO at midnight UTC
        // This preserves the date without timezone issues
        try {
          const [year, month, day] = val.split("-").map(Number)
          if (isNaN(year) || isNaN(month) || isNaN(day)) return null
          const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
          if (isNaN(date.getTime())) return null
          return date.toISOString()
        } catch {
          return null
        }
      }),
    endAt: z
      .string()
      .optional()
      .nullable()
      .transform((val) => {
        if (!val || val === "" || val === null) return null
        // If it's already a datetime string (ISO format), return as is
        if (val.includes("T") || val.includes(" ")) {
          // Validate it's a valid datetime
          const date = new Date(val)
          if (isNaN(date.getTime())) return null
          return date.toISOString()
        }
        // If it's a date string (YYYY-MM-DD), convert to datetime ISO at midnight UTC
        // This preserves the date without timezone issues
        try {
          const [year, month, day] = val.split("-").map(Number)
          if (isNaN(year) || isNaN(month) || isNaN(day)) return null
          const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
          if (isNaN(date.getTime())) return null
          return date.toISOString()
        } catch {
          return null
        }
      }),
  })
  .superRefine((data, ctx) => {
    // Require at least one of medicationId or label (non-empty)
    const hasMedicationId = data.medicationId !== undefined && data.medicationId !== null
    const hasLabel = data.label !== undefined && data.label !== null && typeof data.label === "string" && data.label.trim().length > 0

    if (!hasMedicationId && !hasLabel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe proporcionar un medicamento del catálogo o un nombre de medicamento",
        path: ["medicationId"],
      })
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe proporcionar un medicamento del catálogo o un nombre de medicamento",
        path: ["label"],
      })
    }
  })

export const updateMedicationSchema = createMedicationSchema.partial().extend({
  isActive: z.boolean().optional(),
})

export type CreateMedicationInput = z.infer<typeof createMedicationSchema>
export type UpdateMedicationInput = z.infer<typeof updateMedicationSchema>

// ============================================================================
// ADJUNTOS
// ============================================================================
export const createAttachmentSchema = z.object({
  publicId: z.string().min(1),
  folder: z.string().min(1),
  resourceType: z.string(),
  format: z.string().nullable().optional(),
  bytes: z.number().int().positive(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  duration: z.number().nullable().optional(),
  originalFilename: z.string().nullable().optional(),
  secureUrl: z.string().url(),
  tipo: z.nativeEnum(AdjuntoTipo),
  descripcion: z.string().max(500).nullable().optional(),
})

export type CreateAttachmentInput = z.infer<typeof createAttachmentSchema>

// ============================================================================
// ODONTOGRAMA
// ============================================================================
export const odontogramEntrySchema = z.object({
  toothNumber: z.number().int().min(1).max(85),
  surface: z.nativeEnum(DienteSuperficie).nullable().optional(),
  condition: z.nativeEnum(ToothCondition),
  notes: z.string().max(500).nullable().optional(),
})

export const createOdontogramSchema = z.object({
  notes: z.string().max(1000).optional(),
  entries: z.array(odontogramEntrySchema).min(1),
})

export type CreateOdontogramInput = z.infer<typeof createOdontogramSchema>
export type OdontogramEntryInput = z.infer<typeof odontogramEntrySchema>

// ============================================================================
// PERIODONTOGRAMA
// ============================================================================
export const periodontogramMeasureSchema = z.object({
  toothNumber: z.number().int().min(1).max(85),
  site: z.nativeEnum(PerioSite),
  probingDepthMm: z.number().int().min(0).max(20).optional(),
  bleeding: z.nativeEnum(PerioBleeding).optional(),
  plaque: z.boolean().optional(),
  mobility: z.number().int().min(0).max(3).optional(),
  furcation: z.number().int().min(0).max(3).optional(),
})

export const createPeriodontogramSchema = z.object({
  notes: z.string().max(1000).optional(),
  measures: z.array(periodontogramMeasureSchema).min(1),
})

export type CreatePeriodontogramInput = z.infer<typeof createPeriodontogramSchema>
export type PeriodontogramMeasureInput = z.infer<typeof periodontogramMeasureSchema>

// ============================================================================
// SIGNOS VITALES
// ============================================================================
/**
 * Schema para crear nuevos signos vitales
 * Todos los campos son opcionales y nullable para permitir registros parciales
 */
export const createVitalesSchema = z.object({
  heightCm: z.number().int().min(0).max(300).nullable().optional(),
  weightKg: z.number().int().min(0).max(500).nullable().optional(),
  bpSyst: z.number().int().min(0).max(300).nullable().optional(),
  bpDiast: z.number().int().min(0).max(200).nullable().optional(),
  heartRate: z.number().int().min(0).max(300).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  measuredAt: z.string().datetime().optional(),
})

/**
 * Schema para actualizar signos vitales existentes
 * Todos los campos son opcionales para permitir actualizaciones parciales
 */
export const updateVitalesSchema = createVitalesSchema.partial()

export type CreateVitalesInput = z.infer<typeof createVitalesSchema>
export type UpdateVitalesInput = z.infer<typeof updateVitalesSchema>

// ============================================================================
// RESUMEN DE CONSULTA (diagnosis, clinicalNotes)
// ============================================================================
// ⚠️ DEPRECATED: reason field removed. Motivo de consulta debe obtenerse de PatientAnamnesis.motivoConsulta
export const updateConsultaResumenSchema = z.object({
  // reason field removed - use PatientAnamnesis.motivoConsulta instead
  diagnosis: z
    .string()
    .max(2000, "El diagnóstico no puede exceder 2000 caracteres")
    .optional()
    .nullable()
    .transform((val) => (val === "" || val === null || val === undefined ? null : val.trim() || null)),
  clinicalNotes: z
    .string()
    .max(5000, "Las notas clínicas no pueden exceder 5000 caracteres")
    .optional()
    .nullable()
    .transform((val) => (val === "" || val === null || val === undefined ? null : val.trim() || null)),
})

export type UpdateConsultaResumenInput = z.infer<typeof updateConsultaResumenSchema>

// ============================================================================
// ESTADO DE CONSULTA
// ============================================================================
export const updateConsultaStatusSchema = z.object({
  status: z.nativeEnum(ConsultaEstado),
  startedAt: z.string().datetime().optional(),
  finishedAt: z.string().datetime().optional(),
})

export type UpdateConsultaStatusInput = z.infer<typeof updateConsultaStatusSchema>

