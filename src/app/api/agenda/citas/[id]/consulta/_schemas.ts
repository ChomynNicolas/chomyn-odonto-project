// src/app/api/agenda/citas/[id]/consulta/_schemas.ts
import { z } from "zod"
import {
  ConsultaEstado,
  DiagnosisStatus,
  AllergySeverity,
  TreatmentStepStatus,
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
export const createAnamnesisSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  notes: z.string().min(1).max(5000),
})

export const updateAnamnesisSchema = createAnamnesisSchema.partial()

export type CreateAnamnesisInput = z.infer<typeof createAnamnesisSchema>
export type UpdateAnamnesisInput = z.infer<typeof updateAnamnesisSchema>

// ============================================================================
// DIAGNÓSTICOS
// ============================================================================
export const createDiagnosisSchema = z.object({
  diagnosisId: z.number().int().positive().optional(),
  code: z.string().max(50).optional(),
  label: z.string().min(1).max(200),
  status: z.nativeEnum(DiagnosisStatus).default(DiagnosisStatus.ACTIVE),
  notes: z.string().max(1000).optional(),
})

export const updateDiagnosisSchema = z.object({
  status: z.nativeEnum(DiagnosisStatus).optional(),
  notes: z.string().max(1000).optional(),
})

export type CreateDiagnosisInput = z.infer<typeof createDiagnosisSchema>
export type UpdateDiagnosisInput = z.infer<typeof updateDiagnosisSchema>

// ============================================================================
// PROCEDIMIENTOS
// ============================================================================
export const createProcedureSchema = z.object({
  procedureId: z.number().int().positive().optional(),
  serviceType: z.string().max(200).optional(),
  toothNumber: z.number().int().min(1).max(85).optional(),
  toothSurface: z.nativeEnum(DienteSuperficie).optional(),
  quantity: z.number().int().positive().default(1),
  unitPriceCents: z.number().int().nonnegative().optional(),
  totalCents: z.number().int().nonnegative().optional(),
  resultNotes: z.string().max(2000).optional(),
  treatmentStepId: z.number().int().positive().optional(),
})

export const updateProcedureSchema = z.object({
  quantity: z.number().int().positive().optional(),
  unitPriceCents: z.number().int().nonnegative().optional(),
  totalCents: z.number().int().nonnegative().optional(),
  resultNotes: z.string().max(2000).optional(),
})

export type CreateProcedureInput = z.infer<typeof createProcedureSchema>
export type UpdateProcedureInput = z.infer<typeof updateProcedureSchema>

// ============================================================================
// INDICACIONES / RECETAS (usando PatientMedication)
// ============================================================================
export const createMedicationSchema = z.object({
  medicationId: z.number().int().positive().optional(),
  label: z.string().min(1).max(200).optional(),
  dose: z.string().max(100).optional(),
  freq: z.string().max(100).optional(),
  route: z.string().max(100).optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
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
  format: z.string().optional(),
  bytes: z.number().int().positive(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration: z.number().optional(),
  originalFilename: z.string().optional(),
  secureUrl: z.string().url(),
  tipo: z.nativeEnum(AdjuntoTipo),
  descripcion: z.string().max(500).optional(),
})

export type CreateAttachmentInput = z.infer<typeof createAttachmentSchema>

// ============================================================================
// ODONTOGRAMA
// ============================================================================
export const odontogramEntrySchema = z.object({
  toothNumber: z.number().int().min(1).max(85),
  surface: z.nativeEnum(DienteSuperficie).optional(),
  condition: z.nativeEnum(ToothCondition),
  notes: z.string().max(500).optional(),
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
// ESTADO DE CONSULTA
// ============================================================================
export const updateConsultaStatusSchema = z.object({
  status: z.nativeEnum(ConsultaEstado),
  startedAt: z.string().datetime().optional(),
  finishedAt: z.string().datetime().optional(),
})

export type UpdateConsultaStatusInput = z.infer<typeof updateConsultaStatusSchema>

