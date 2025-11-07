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

export const PacienteCreateBodySchema = z.object({
  nombreCompleto: z.string().min(1).max(200),
  // El cliente envía "M" | "F" | "X", se mapea en el servicio a enum DB
  genero: z.enum(["M", "F", "X"]).optional(),
  fechaNacimiento: z.string().optional(), // ISO
  tipoDocumento: TipoDocumentoEnum.default("CI"),
  numeroDocumento: z.string().min(1).max(50),
  ruc: z.string().max(50).optional(),
  paisEmision: z.string().length(2).default("PY"),
  direccion: z.string().max(300).optional(),
  ciudad: z.string().max(100).optional(),
  pais: z.string().length(2).default("PY"),
  telefono: z.string().min(1).max(50),
  email: z.string().email().optional(),
  preferenciasContacto: PreferenciasContactoSchema.optional(),
  preferenciasRecordatorio: PreferenciasContactoSchema.optional(),
  preferenciasCobranza: PreferenciasContactoSchema.optional(),
  // compatibles con tu UI actual (texto libre, separado por coma/; o salto de línea)
  alergias: z.string().max(1000).optional(),
  medicacion: z.string().max(1000).optional(),
  antecedentes: z.string().max(2000).optional(),
  observaciones: z.string().max(2000).optional(),
  responsablePago: ResponsablePagoSchema.optional(),
  adjuntos: z.array(z.any()).optional(),
  // ✅ Nuevo: vitales opcionales
  vitals: VitalsSchema.optional(),
})

export type PacienteCreateBody = z.infer<typeof PacienteCreateBodySchema>
