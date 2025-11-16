// src/app/api/pacientes/_schemas.ts
import { z } from "zod"

export const GeneroEnum = z.enum(["MALE", "FEMALE", "OTHER", "NO_ESPECIFICADO"])

// ✅ Alineado con Prisma enum: CI | DNI | PASAPORTE | RUC | OTRO
export const TipoDocumentoEnum = z.enum(["CI", "DNI", "PASAPORTE", "RUC", "OTRO"])

export const RelacionPacienteEnum = z.enum([
  "PADRE",
  "MADRE",
  "TUTOR",
  "CONYUGE",
  "HIJO",
  "FAMILIAR",
  "EMPRESA",
  "OTRO",
])

export const PreferenciasContactoSchema = z.object({
  whatsapp: z.boolean().optional(),
  sms: z.boolean().optional(),
  llamada: z.boolean().optional(),
  email: z.boolean().optional(),
})

export const ResponsablePagoSchema = z.object({
  personaId: z.number().int().positive(),
  relacion: RelacionPacienteEnum,
  esPrincipal: z.boolean().default(true),
})

// ✅ Nuevo: esquema de vitales (todo opcional)
export const VitalsSchema = z.object({
  measuredAt: z.string().datetime().optional(),
  heightCm: z.number().int().min(50).max(250).optional(),
  weightKg: z.number().min(10).max(300).optional(),
  bmi: z.number().min(5).max(80).optional(),
  bpSyst: z.number().int().min(60).max(250).optional(),
  bpDiast: z.number().int().min(30).max(160).optional(),
  heartRate: z.number().int().min(30).max(220).optional(),
  notes: z.string().max(200).optional(),
})

// === Nuevos tipos de entrada normalizados ===
export const AllergyInputSchema = z.object({
  id: z.number().int().optional(),             // id de AllergyCatalog (opcional)
  label: z.string().max(120).optional(),       // libre si no hay catálogo
  severity: z.enum(["MILD","MODERATE","SEVERE"]).default("MODERATE").optional(),
  reaction: z.string().max(255).optional(),
  notedAt: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
})

export const MedicationInputSchema = z.object({
  id: z.number().int().optional(),             // id de MedicationCatalog (opcional)
  label: z.string().max(255).optional(),       // libre si no hay catálogo
  dose: z.string().max(120).optional(),
  freq: z.string().max(120).optional(),
  route: z.string().max(120).optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
})

export const PacienteCreateBodySchema = z.object({
  nombreCompleto: z.string().min(1).max(200),
  genero: z.enum(["M","F","X"]).optional(),
  fechaNacimiento: z.string().optional(),
  tipoDocumento: TipoDocumentoEnum.default("CI"),
  numeroDocumento: z.string().min(1).max(50),
  ruc: z.string().max(50).optional(),
  paisEmision: z.string().length(2).default("PY"),
  direccion: z.string().max(300).optional(),
  ciudad: z.string().max(100).optional(),
  pais: z.string().length(2).default("PY"),
  telefono: z.string().min(1).max(50),
  email: z.string().email().optional(),

  preferenciasContacto: z.object({
    whatsapp: z.boolean().optional(),
    sms: z.boolean().optional(),
    llamada: z.boolean().optional(),
    email: z.boolean().optional(),
  }).optional(),
  preferenciasRecordatorio: z.object({
    whatsapp: z.boolean().optional(),
    sms: z.boolean().optional(),
    llamada: z.boolean().optional(),
    email: z.boolean().optional(),
  }).optional(),
  preferenciasCobranza: z.object({
    whatsapp: z.boolean().optional(),
    sms: z.boolean().optional(),
    llamada: z.boolean().optional(),
    email: z.boolean().optional(),
  }).optional(),

  // --- Retro-compatibilidad: string o array ---
  alergias: z.union([z.string().max(1000), z.array(AllergyInputSchema)]).optional(),
  medicacion: z.union([z.string().max(1000), z.array(MedicationInputSchema)]).optional(),

  antecedentes: z.string().max(2000).optional(),
  observaciones: z.string().max(2000).optional(),
  responsablePago: z.object({
    personaId: z.number().int().positive(),
    relacion: z.enum(["PADRE","MADRE","TUTOR","CONYUGE","HIJO","FAMILIAR","EMPRESA","OTRO"]),
    esPrincipal: z.boolean().default(true),
  }).optional(),
  adjuntos: z.array(z.any()).optional(),

  vitals: VitalsSchema.optional(),
})

export type PacienteCreateBody = z.infer<typeof PacienteCreateBodySchema>

// ============= List Query Schema =============
// ⚠️ Query params from URLSearchParams are always strings
// Use z.coerce to automatically convert strings to the expected types
export const pacientesListQuerySchema = z.object({
  q: z.string().optional(),
  // Coerce "true"/"false" strings to boolean (z.coerce.boolean() handles this automatically)
  soloActivos: z.coerce.boolean().optional(),
  genero: z.enum(["MASCULINO", "FEMENINO", "OTRO", "NO_ESPECIFICADO"]).optional(),
  hasEmail: z.coerce.boolean().optional(),
  hasPhone: z.coerce.boolean().optional(),
  createdFrom: z.string().optional(),
  createdTo: z.string().optional(),
  sort: z.enum(["createdAt asc", "createdAt desc", "nombre asc", "nombre desc"]).default("createdAt desc"),
  // Cursor remains as string (service converts it to number when needed)
  cursor: z.string().optional(),
  // Coerce limit string to number with validation
  limit: z.coerce
    .number("limit debe ser un número")
    .int("limit debe ser un número entero")
    .min(1, "limit debe ser al menos 1")
    .max(100, "limit no puede ser mayor a 100")
    .default(20),
})

export type PacientesListQuery = z.infer<typeof pacientesListQuerySchema>