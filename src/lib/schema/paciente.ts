// src/lib/schemas/pacientes.ts
import { z } from "zod"

/** Utilidades de normalización */
const trim = (s: string) => s.trim()
const relaxedString = z
  .union([z.string(), z.literal(""), z.null(), z.undefined()])
  .transform((v) => (typeof v === "string" ? trim(v) : v))
  .transform((v) => (v === "" || v === null ? undefined : v)) // => string | undefined

/** Enums compartidos */
export const GeneroEnum = z.enum(["MASCULINO", "FEMENINO", "OTRO", "NO_ESPECIFICADO"])
export const TipoDocumentoEnum = z.enum(["CI", "DNI", "PASAPORTE", "RUC", "OTRO"])
export const RelacionPacienteEnum = z.enum(["PADRE", "MADRE", "TUTOR", "CONYUGE", "FAMILIAR", "OTRO"])

/** Sub-esquemas compartidos */
export const PreferenciasContactoSchema = z
  .object({
    whatsapp: z.boolean().default(false),
    sms: z.boolean().default(false),
    llamada: z.boolean().default(false),
    email: z.boolean().default(false),
  })
  .partial()
  .default({})

export const ResponsablePagoSchema = z.object({
  personaId: z.number().int().positive(),
  relacion: RelacionPacienteEnum,
  esPrincipal: z.boolean().default(true),
})

/** Fecha (acepta "", undefined, o fecha; valida rango) */
const MIN_DOB = new Date("1900-01-01")
const TODAY = new Date()
const FechaNacimientoSchema = z
  .union([
    z.literal(""),
    z.undefined(),
    z.coerce.date().refine((d) => d >= MIN_DOB && d <= TODAY, "Fecha inválida"),
  ])
  .transform((v) => (v instanceof Date ? v : undefined)) // => Date | undefined

/** Email (acepta "", undefined; valida si existe) */
const EmailOptionalSchema = z
  .union([z.string().email("Email inválido"), z.literal(""), z.undefined(), z.null()])
  .transform((v) => (v === "" || v === null ? undefined : v)) // => string | undefined

/** Esquema principal de creación (compartido front/back) */
export const PacienteCreateSchema = z.object({
  nombreCompleto: z
    .string({ required_error: "El nombre es requerido" })
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .transform(trim),
  genero: GeneroEnum, // Unificado: usar NO_ESPECIFICADO cuando aplique
  tipoDocumento: TipoDocumentoEnum.optional().default("CI"),
  dni: z
    .string({ required_error: "El número de documento es requerido" })
    .min(3, "Documento demasiado corto")
    .max(32)
    .transform(trim),

  ruc: relaxedString,               // string | undefined
  telefono: z.string().min(6, "El teléfono es requerido").max(40).transform(trim),
  email: EmailOptionalSchema,       // string | undefined
  domicilio: relaxedString,
  obraSocial: relaxedString,

  antecedentesMedicos: relaxedString,
  alergias: relaxedString,
  medicacion: relaxedString,

  fechaNacimiento: FechaNacimientoSchema, // Date | undefined

  responsablePago: ResponsablePagoSchema.optional(),
  preferenciasContacto: PreferenciasContactoSchema.optional(),

  /** Campo de front (tolerado en back). El servicio puede ignorarlo. */
  adjuntos: z.array(z.any()).optional(),
})

/** Tipos compartidos */
export type PacienteCreateDTO = z.infer<typeof PacienteCreateSchema>

/** Variante para formularios (si quisieras diferenciar a futuro).
 *  Por ahora es igual: ya incluye transforms "relajados".
 */
export const PacienteCreateFormSchema = PacienteCreateSchema
export type PacienteCreateFormDTO = PacienteCreateDTO

export const LinkResponsablePagoSchema = ResponsablePagoSchema
export type LinkResponsablePagoDTO = z.infer<typeof LinkResponsablePagoSchema>