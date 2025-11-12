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
export type PacienteCreateDTOForm = z.infer<typeof PacienteCreateSchema>

/** Variante para formularios (si quisieras diferenciar a futuro).
 *  Por ahora es igual: ya incluye transforms "relajados".
 */
export const PacienteCreateFormSchema = PacienteCreateSchema
export type PacienteCreateFormDTO = PacienteCreateDTOForm

export const LinkResponsablePagoSchema = ResponsablePagoSchema
export type LinkResponsablePagoDTO = z.infer<typeof LinkResponsablePagoSchema>

/** Esquemas para server actions */
const DocumentoSchema = z.object({
  tipo: TipoDocumentoEnum,
  numero: z.string().min(1, "Número de documento requerido").transform(trim),
  paisEmision: z.string().max(2).optional().nullable(),
  fechaEmision: z.coerce.date().optional().nullable(),
  fechaVencimiento: z.coerce.date().optional().nullable(),
  ruc: z.string().max(20).optional().nullable(),
})

const ContactoSchema = z.object({
  tipo: z.enum(["PHONE", "EMAIL"]),
  valor: z.string().min(1, "Valor de contacto requerido"),
  label: z.string().optional().nullable(),
})

const DatosClinicosSchema = z.record(z.unknown()).optional().nullable()

const ResponsablePagoCreateSchema = z.object({
  personaId: z.number().int().positive().optional(),
  nombres: z.string().optional(),
  apellidos: z.string().optional(),
  genero: GeneroEnum.optional(),
  documento: DocumentoSchema.optional(),
  relacion: RelacionPacienteEnum.optional(),
  esPrincipal: z.boolean().optional(),
  autoridadLegal: z.boolean().optional(),
})

/** Esquema de creación para server actions */
export const pacienteCreateSchema = z.object({
  nombres: z.string().min(1, "Nombres requeridos").transform(trim),
  apellidos: z.string().min(1, "Apellidos requeridos").transform(trim),
  genero: GeneroEnum.optional().nullable(),
  fechaNacimiento: FechaNacimientoSchema.optional().nullable(),
  direccion: relaxedString.optional().nullable(),
  documento: DocumentoSchema,
  contactos: z.array(ContactoSchema).optional().default([]),
  datosClinicos: DatosClinicosSchema,
  responsablePago: ResponsablePagoCreateSchema.optional(),
})

export type PacienteCreateDTO = z.infer<typeof pacienteCreateSchema>

/** Esquema de actualización para server actions */
export const pacienteUpdateSchema = z.object({
  idPaciente: z.number().int().positive(),
  updatedAt: z.string().optional(),
  nombres: z.string().min(1).transform(trim).optional(),
  apellidos: z.string().min(1).transform(trim).optional(),
  genero: GeneroEnum.optional(),
  fechaNacimiento: FechaNacimientoSchema.optional(),
  direccion: relaxedString.optional(),
  documento: DocumentoSchema.optional(),
  contactos: z.array(ContactoSchema).optional(),
  datosClinicos: DatosClinicosSchema,
  estaActivo: z.boolean().optional(),
})

export type PacienteUpdateDTO = z.infer<typeof pacienteUpdateSchema>

/** Esquema de eliminación para server actions */
export const pacienteDeleteSchema = z.object({
  idPaciente: z.number().int().positive(),
})

export type PacienteDeleteDTO = z.infer<typeof pacienteDeleteSchema>