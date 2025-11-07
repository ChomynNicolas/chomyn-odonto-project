// src/app/api/pacientes/_schemas.ts
import { z } from "zod"

export const GeneroEnum = z.enum(["MALE", "FEMALE", "OTHER", "NO_ESPECIFICADO"])
export const TipoDocumentoEnum = z.enum(["CI", "PASSPORT", "RUC", "DNI", "OTHER"])
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

export const PacienteCreateBodySchema = z.object({
  nombreCompleto: z.string().min(1).max(200),
  genero: z.enum(["M", "F", "X"]).optional(), // Accept M/F/X from client
  fechaNacimiento: z.string().optional(), // ISO date string
  tipoDocumento: TipoDocumentoEnum.default("CI"),
  numeroDocumento: z.string().min(1).max(50), // Renamed from dni
  ruc: z.string().max(50).optional(),
  paisEmision: z.string().length(2).default("PY"),
  direccion: z.string().max(300).optional(), // Renamed from domicilio
  ciudad: z.string().max(100).optional(),
  pais: z.string().length(2).default("PY"),
  telefono: z.string().min(1).max(50),
  email: z.string().email().optional(),
  preferenciasContacto: PreferenciasContactoSchema.optional(),
  preferenciasRecordatorio: PreferenciasContactoSchema.optional(),
  preferenciasCobranza: PreferenciasContactoSchema.optional(),
  alergias: z.string().max(1000).optional(),
  medicacion: z.string().max(1000).optional(),
  antecedentes: z.string().max(2000).optional(), // Renamed from antecedentesMedicos
  observaciones: z.string().max(2000).optional(),
  responsablePago: ResponsablePagoSchema.optional(),
  adjuntos: z.array(z.any()).optional(), // Added adjuntos support
})

export type PacienteCreateBody = z.infer<typeof PacienteCreateBodySchema>

export const pacientesListQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  cursor: z.string().optional(),
  soloActivos: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v !== "false"),
  genero: GeneroEnum.optional(),
  hasEmail: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  hasPhone: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  createdFrom: z.string().optional(),
  createdTo: z.string().optional(),
  sort: z.enum(["createdAt desc", "createdAt asc", "nombre asc", "nombre desc"]).default("createdAt desc"),
  obraSocial: z.string().trim().min(1).max(120).optional(),
})

export type PacientesListQuery = z.infer<typeof pacientesListQuerySchema>
