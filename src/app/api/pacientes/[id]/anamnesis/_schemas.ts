// src/app/api/pacientes/[id]/anamnesis/_schemas.ts
import { z } from "zod"

// ============================================================================
// ENUMS
// ============================================================================

export const AnamnesisTipoEnum = z.enum(["ADULTO", "PEDIATRICO"])
export type AnamnesisTipo = z.infer<typeof AnamnesisTipoEnum>

export const AnamnesisUrgenciaEnum = z.enum(["RUTINA", "PRIORITARIO", "URGENCIA"])
export type AnamnesisUrgencia = z.infer<typeof AnamnesisUrgenciaEnum>

export const AntecedentCategoryEnum = z.enum([
  "CARDIOVASCULAR",
  "ENDOCRINE",
  "RESPIRATORY",
  "GASTROINTESTINAL",
  "NEUROLOGICAL",
  "SURGICAL_HISTORY",
  "SMOKING",
  "ALCOHOL",
  "OTHER",
])
export type AntecedentCategory = z.infer<typeof AntecedentCategoryEnum>

// ============================================================================
// SCHEMAS FOR NORMALIZED STRUCTURE
// ============================================================================

// Antecedent input schema (for creating/updating antecedents)
export const AnamnesisAntecedentInputSchema = z.object({
  antecedentId: z.number().int().positive().optional(), // If using catalog
  customName: z.string().min(1).max(200).optional(), // If custom antecedent
  customCategory: AntecedentCategoryEnum.optional(), // Required if customName provided
  notes: z.string().max(1000).optional(),
  diagnosedAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().default(true),
  resolvedAt: z.string().datetime().optional().nullable(),
}).refine(
  (data) => {
    // Either antecedentId OR (customName + customCategory) must be provided
    return data.antecedentId !== undefined || (data.customName !== undefined && data.customCategory !== undefined)
  },
  {
    message: "Either antecedentId or both customName and customCategory must be provided",
  }
)

export type AnamnesisAntecedentInput = z.infer<typeof AnamnesisAntecedentInputSchema>

// Medication link schema (enhanced with catalog and custom support)
export const AnamnesisMedicationLinkSchema = z.object({
  id: z.number().int().positive().optional(), // For existing AnamnesisMedication updates
  medicationId: z.number().int().positive().optional(), // For existing PatientMedication
  catalogId: z.number().int().positive().optional(), // For MedicationCatalog
  customLabel: z.string().min(1).max(255).optional(), // For custom entry
  customDose: z.string().max(100).optional(),
  customFreq: z.string().max(100).optional(),
  customRoute: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
  // Display fields (from medication relation - for UI only, not sent to server)
  label: z.string().nullable().optional(), // From PatientMedication.label or MedicationCatalog.name
  dose: z.string().nullable().optional(), // From PatientMedication.dose
  freq: z.string().nullable().optional(), // From PatientMedication.freq
  route: z.string().nullable().optional(), // From PatientMedication.route
}).refine(
  (data) => data.medicationId || data.catalogId || data.customLabel,
  { message: "Must provide medicationId, catalogId, or customLabel" }
)

export type AnamnesisMedicationLink = z.infer<typeof AnamnesisMedicationLinkSchema>

// Allergy link schema (enhanced with catalog and custom support)
export const AnamnesisAllergyLinkSchema = z.object({
  id: z.number().int().positive().optional(), // For existing AnamnesisAllergy updates
  allergyId: z.number().int().positive().optional(), // For existing PatientAllergy
  catalogId: z.number().int().positive().optional(), // For AllergyCatalog
  customLabel: z.string().min(1).max(255).optional(), // For custom entry
  severity: z.enum(["MILD", "MODERATE", "SEVERE"]).optional(),
  reaction: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
  // Display field (from allergy relation - for UI only, not sent to server)
  label: z.string().nullable().optional(), // From PatientAllergy.label or AllergyCatalog.name
}).refine(
  (data) => data.allergyId || data.catalogId || data.customLabel,
  { message: "Must provide allergyId, catalogId, or customLabel" }
)

export type AnamnesisAllergyLink = z.infer<typeof AnamnesisAllergyLinkSchema>

// Women-specific fields schema (conditional, only for ADULTO + FEMENINO)
export const AnamnesisWomenSpecificSchema = z.object({
  embarazada: z.boolean().optional().nullable(),
  semanasEmbarazo: z.number().int().min(1).max(42).optional().nullable(),
  ultimaMenstruacion: z.string().datetime().optional().nullable(),
  planificacionFamiliar: z.string().max(500).optional(),
})

export type AnamnesisWomenSpecific = z.infer<typeof AnamnesisWomenSpecificSchema>

// Main anamnesis create/update body schema
export const AnamnesisCreateUpdateBodySchema = z.object({
  // General information
  motivoConsulta: z.string().min(1).max(200),
  tieneDolorActual: z.boolean().default(false),
  dolorIntensidad: z.number().int().min(1).max(10).optional().nullable(),
  urgenciaPercibida: AnamnesisUrgenciaEnum.optional().nullable(),
  
  // Medical history flags
  tieneEnfermedadesCronicas: z.boolean().default(false),
  tieneAlergias: z.boolean().default(false),
  tieneMedicacionActual: z.boolean().default(false),
  
  // Hygiene and habits
  expuestoHumoTabaco: z.boolean().optional().nullable(),
  bruxismo: z.boolean().optional().nullable(),
  higieneCepilladosDia: z.number().int().min(0).max(10).optional().nullable(),
  usaHiloDental: z.boolean().optional().nullable(),
  ultimaVisitaDental: z.string().datetime().optional().nullable(),
  
  // Pediatric-specific fields
  tieneHabitosSuccion: z.boolean().optional().nullable(),
  lactanciaRegistrada: z
    .union([
      z.enum(["EXCLUSIVA", "MIXTA", "FORMULA", "NO_APLICA"]),
      z.boolean(),
    ])
    .optional()
    .nullable(), // Allow enum string or boolean for backward compatibility
  
  // Normalized data arrays
  antecedents: z.array(AnamnesisAntecedentInputSchema).default([]),
  medications: z.array(AnamnesisMedicationLinkSchema).default([]), // Enhanced medication entries
  allergies: z.array(AnamnesisAllergyLinkSchema).default([]), // Enhanced allergy entries
  
  // Women-specific fields (conditional)
  womenSpecific: AnamnesisWomenSpecificSchema.optional(),
  
  // Custom notes (stored in payload JSON for backward compatibility)
  customNotes: z.string().max(5000).optional().default(""),
  
  // Consultation link
  consultaId: z.number().int().positive().optional(),
  
  // Outside consultation context (optional, for edits outside active consultation)
  editContext: z.object({
    isOutsideConsultation: z.boolean().default(false),
    informationSource: z.enum(["IN_PERSON", "PHONE", "EMAIL", "DOCUMENT", "PATIENT_PORTAL", "OTHER"]).optional(),
    verifiedWithPatient: z.boolean().optional(),
    reason: z.string().max(1000).optional(),
  }).optional(),
})

export type AnamnesisCreateUpdateBody = z.infer<typeof AnamnesisCreateUpdateBodySchema>

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

// Antecedent response schema
export const AnamnesisAntecedentResponseSchema = z.object({
  idAnamnesisAntecedent: z.number().int().positive(),
  anamnesisId: z.number().int().positive(),
  antecedentId: z.number().int().positive().nullable(),
  antecedentCatalog: z.object({
    idAntecedentCatalog: z.number().int().positive(),
    code: z.string(),
    name: z.string(),
    category: AntecedentCategoryEnum,
    description: z.string().nullable(),
  }).nullable(),
  customName: z.string().nullable(),
  customCategory: AntecedentCategoryEnum.nullable(),
  notes: z.string().nullable(),
  diagnosedAt: z.string().datetime().nullable(),
  isActive: z.boolean(),
  resolvedAt: z.string().datetime().nullable(),
})

export type AnamnesisAntecedentResponse = z.infer<typeof AnamnesisAntecedentResponseSchema>

// Medication link response
export const AnamnesisMedicationResponseSchema = z.object({
  idAnamnesisMedication: z.number().int().positive(),
  medicationId: z.number().int().positive(),
  medication: z.object({
    idPatientMedication: z.number().int().positive(),
    label: z.string().nullable(),
    medicationCatalog: z.object({
      name: z.string(),
    }).nullable(),
    dose: z.string().nullable(),
    freq: z.string().nullable(),
    route: z.string().nullable(),
    isActive: z.boolean(),
  }),
})

export type AnamnesisMedicationResponse = z.infer<typeof AnamnesisMedicationResponseSchema>

// Allergy link response
export const AnamnesisAllergyResponseSchema = z.object({
  idAnamnesisAllergy: z.number().int().positive(),
  allergyId: z.number().int().positive(),
  allergy: z.object({
    idPatientAllergy: z.number().int().positive(),
    label: z.string().nullable(),
    allergyCatalog: z.object({
      name: z.string(),
    }).nullable(),
    severity: z.enum(["MILD", "MODERATE", "SEVERE"]),
    reaction: z.string().nullable(),
    isActive: z.boolean(),
  }),
})

export type AnamnesisAllergyResponse = z.infer<typeof AnamnesisAllergyResponseSchema>

// Main anamnesis response schema
export const AnamnesisResponseSchema = z.object({
  idPatientAnamnesis: z.number().int().positive(),
  pacienteId: z.number().int().positive(),
  tipo: AnamnesisTipoEnum,
  motivoConsulta: z.string().nullable(),
  tieneDolorActual: z.boolean(),
  dolorIntensidad: z.number().int().nullable(),
  urgenciaPercibida: AnamnesisUrgenciaEnum.nullable(),
  tieneEnfermedadesCronicas: z.boolean(),
  tieneAlergias: z.boolean(),
  tieneMedicacionActual: z.boolean(),
  embarazada: z.boolean().nullable(),
  expuestoHumoTabaco: z.boolean().nullable(),
  bruxismo: z.boolean().nullable(),
  higieneCepilladosDia: z.number().int().nullable(),
  usaHiloDental: z.boolean().nullable(),
  ultimaVisitaDental: z.string().datetime().nullable(),
  tieneHabitosSuccion: z.boolean().nullable(),
  lactanciaRegistrada: z.boolean().nullable(),
  payload: z.any().nullable(), // JSON for custom notes
  antecedents: z.array(AnamnesisAntecedentResponseSchema),
  medications: z.array(AnamnesisMedicationResponseSchema),
  allergies: z.array(AnamnesisAllergyResponseSchema),
  creadoPor: z.object({
    idUsuario: z.number().int().positive(),
    nombreApellido: z.string(),
  }),
  actualizadoPor: z.object({
    idUsuario: z.number().int().positive(),
    nombreApellido: z.string(),
  }).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type AnamnesisResponse = z.infer<typeof AnamnesisResponseSchema>

// ============================================================================
// CATALOG SCHEMAS
// ============================================================================

export const AntecedentCatalogItemSchema = z.object({
  idAntecedentCatalog: z.number().int().positive(),
  code: z.string(),
  name: z.string(),
  category: AntecedentCategoryEnum,
  description: z.string().nullable(),
  isActive: z.boolean(),
})

export type AntecedentCatalogItem = z.infer<typeof AntecedentCatalogItemSchema>

export const AntecedentCatalogResponseSchema = z.object({
  items: z.array(AntecedentCatalogItemSchema),
  total: z.number().int().min(0),
})

export type AntecedentCatalogResponse = z.infer<typeof AntecedentCatalogResponseSchema>

// ============================================================================
// CONFIG SCHEMAS
// ============================================================================

export const AnamnesisConfigValueSchema = z.object({
  MANDATORY_FIRST_CONSULTATION: z.boolean(),
  ALLOW_EDIT_SUBSEQUENT: z.enum(["FULL", "PARTIAL", "LOCKED"]),
  EDITABLE_SECTIONS: z.array(z.string()).optional(), // Only if PARTIAL
})

export type AnamnesisConfigValue = z.infer<typeof AnamnesisConfigValueSchema>

export const AnamnesisConfigResponseSchema = z.object({
  key: z.string(),
  value: AnamnesisConfigValueSchema,
  description: z.string().nullable(),
  updatedAt: z.string().datetime(),
  updatedBy: z.object({
    idUsuario: z.number().int().positive(),
    nombreApellido: z.string(),
  }),
})

export type AnamnesisConfigResponse = z.infer<typeof AnamnesisConfigResponseSchema>
