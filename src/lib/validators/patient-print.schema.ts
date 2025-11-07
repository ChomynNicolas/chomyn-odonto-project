// src/lib/validators/patient-print.schema.ts
import { z } from "zod"

// ===== Enums (alineados a Prisma) =====
export const GeneroEnum = z.enum(["MASCULINO", "FEMENINO", "OTRO", "NO_ESPECIFICADO"])
export const TipoDocumentoEnum = z.enum(["CI", "DNI", "PASAPORTE", "RUC", "OTRO"])
export const AllergySeverityEnum = z.enum(["MILD", "MODERATE", "SEVERE"])
export const DiagnosisStatusEnum = z.enum(["ACTIVE", "RESOLVED", "RULED_OUT"])
export const TreatmentStepStatusEnum = z.enum(["PENDING", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "DEFERRED"])
export const TipoContactoEnum = z.enum(["PHONE", "EMAIL"])
export const EstadoCitaEnum = z.enum(["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"])

// ===== Sub-esquemas =====
export const DocumentSchema = z.object({
  tipo: TipoDocumentoEnum,
  numero: z.string(),
  paisEmision: z.string().nullable().optional(),
  ruc: z.string().nullable().optional(),
})

export const ContactSchema = z.object({
  type: TipoContactoEnum,          // PHONE | EMAIL
  label: z.string().nullable().optional(),
  valueNorm: z.string(),           // normalizado (DB)
  isPrimary: z.boolean().default(false),
})

export const DemographicsSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  birthDate: z.string().nullable().optional(), // ISO
  age: z.number().int().nonnegative().nullable().optional(),
  gender: GeneroEnum.nullable().optional(),
  address: z.string().nullable().optional(),
  document: DocumentSchema.nullable().optional(),
  contacts: z.object({
    primaryPhone: ContactSchema.nullable().optional(),
    primaryEmail: ContactSchema.nullable().optional(),
  }),
  fullName: z.string(), // derivado
})

export const AllergySchema = z.object({
  id: z.number().int(),
  label: z.string().nullable().optional(),
  catalogName: z.string().nullable().optional(),
  severity: AllergySeverityEnum,
  reaction: z.string().nullable().optional(),
  notedAt: z.string(), // ISO
})

export const DiagnosisSchema = z.object({
  id: z.number().int(),
  label: z.string(),
  code: z.string().nullable().optional(),
  catalogName: z.string().nullable().optional(),
  status: DiagnosisStatusEnum, // ACTIVE sólo para impresión, pero tipamos general
  notedAt: z.string(),         // ISO
  resolvedAt: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export const MedicationSchema = z.object({
  id: z.number().int(),
  label: z.string().nullable().optional(),
  catalogName: z.string().nullable().optional(),
  dose: z.string().nullable().optional(),
  freq: z.string().nullable().optional(),
  route: z.string().nullable().optional(),
  startAt: z.string().nullable().optional(),
  endAt: z.string().nullable().optional(),
  isActive: z.boolean(),
})

export const VitalSignsSchema = z.object({
  measuredAt: z.string(), // ISO
  heightCm: z.number().int().nullable().optional(),
  weightKg: z.number().nullable().optional(),
  bmi: z.number().nullable().optional(),
  bpSyst: z.number().int().nullable().optional(),
  bpDiast: z.number().int().nullable().optional(),
  heartRate: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export const TreatmentStepSchema = z.object({
  id: z.number().int(),
  order: z.number().int(),
  procedureName: z.string().nullable().optional(), // del catálogo
  serviceType: z.string().nullable().optional(),   // texto libre alternativo
  toothNumber: z.number().int().nullable().optional(),
  toothSurface: z.string().nullable().optional(),
  status: TreatmentStepStatusEnum,
})

export const TreatmentPlanSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  description: z.string().nullable().optional(),
  isActive: z.boolean(),
  steps: z.array(TreatmentStepSchema),
})

export const AppointmentSchema = z.object({
  id: z.number().int(),
  scheduledAt: z.string(), // inicio ISO
  endAt: z.string().nullable().optional(),
  status: EstadoCitaEnum,
  reason: z.string().nullable().optional(),
  professional: z.object({
    firstName: z.string(),
    lastName: z.string(),
  }),
  consultorioName: z.string().nullable().optional(),
})

// ===== DTO raíz =====
export const PrintablePatientSchema = z.object({
  patient: z.object({
    id: z.number().int(),
    active: z.boolean(),
    demographics: DemographicsSchema,
  }),
  allergies: z.array(AllergySchema),
  diagnoses: z.array(DiagnosisSchema),
  medications: z.array(MedicationSchema),
  vitalSigns: VitalSignsSchema.nullable(),
  treatmentPlan: TreatmentPlanSchema.nullable(),
  appointments: z.array(AppointmentSchema), // últimas 5
})

export type PrintablePatientDTO = z.infer<typeof PrintablePatientSchema>

// Filtro de alcance: LIMITED oculta secciones clínicas
export function stripClinicalSectionsForLimitedScope(dto: PrintablePatientDTO): PrintablePatientDTO {
  return {
    ...dto,
    allergies: [],
    diagnoses: [],
    medications: [],
    vitalSigns: null,
    treatmentPlan: null,
    // citas se pueden mantener
  }
}
