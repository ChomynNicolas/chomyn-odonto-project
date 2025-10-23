// src/lib/schema/paciente.full.ts
import { z } from "zod"

const TIPO_DOC = ["CI", "DNI", "PASAPORTE", "RUC", "OTRO"] as const
const GENERO_DTO = ["MASCULINO", "FEMENINO", "OTRO", "NO_ESPECIFICADO", "NO_DECLARA"] as const

const MIN_DOB = new Date("1900-01-01")
const TODAY = new Date()

export const pacienteFullCreateSchema = z.object({
  nombreCompleto: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),

  // Aceptamos ambas para evitar mapeos rotos y normalizamos luego
  genero: z.enum(GENERO_DTO),

  // Ahora con default "CI"
  tipoDocumento: z.enum(TIPO_DOC).optional().default("CI"),

  dni: z.string().min(3, "El número de documento es requerido"),

  // Todos los opcionales admiten string | "" | null | undefined
  ruc: z.union([z.string(), z.literal(""), z.null()]).optional(),
  telefono: z.string().min(6, "El teléfono es requerido"),
  email: z.union([z.string().email("Email inválido"), z.literal(""), z.null()]).optional(),

  domicilio: z.union([z.string(), z.literal(""), z.null()]).optional(),

  // Permite "", undefined o Date/string coercible y valida rango
  fechaNacimiento: z
    .union([
      z.literal(""),
      z.undefined(),
      z.coerce
        .date()
        .refine((d) => d >= MIN_DOB && d <= TODAY, "Fecha inválida"),
    ])
    .optional(),

  antecedentesMedicos: z.union([z.string(), z.literal(""), z.null()]).optional(),
  alergias: z.union([z.string(), z.literal(""), z.null()]).optional(),
  medicacion: z.union([z.string(), z.literal(""), z.null()]).optional(),
  responsablePago: z.union([z.string(), z.literal(""), z.null()]).optional(),
  obraSocial: z.union([z.string(), z.literal(""), z.null()]).optional(),

  preferenciasContacto: z
    .object({
      whatsapp: z.boolean().default(false),
      sms: z.boolean().default(false),
      llamada: z.boolean().default(false),
      email: z.boolean().default(false),
    })
    .optional(),

  adjuntos: z.array(z.any()).optional(),
})

// Tipo exportable
export type PacienteFullCreateDTO = z.infer<typeof pacienteFullCreateSchema>
