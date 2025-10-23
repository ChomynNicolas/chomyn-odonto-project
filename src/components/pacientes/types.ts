// src/components/pacientes/types.ts
import { z } from "zod"

export const generoEnum = z.enum(["MASCULINO", "FEMENINO", "OTRO", "NO_DECLARA"])
export type Genero = z.infer<typeof generoEnum>

export const tipoDocumentoEnum = z.enum(["CI", "DNI", "PASAPORTE", "RUC", "OTRO"])
export type TipoDocumento = z.infer<typeof tipoDocumentoEnum>

export const preferenciasContactoSchema = z.object({
  whatsapp: z.boolean().default(true),
  llamada: z.boolean().default(false),
  email: z.boolean().default(false),
  sms: z.boolean().default(false),
})

const MIN_DOB = new Date("1900-01-01")
const TODAY = new Date()

export const pacienteSchema = z.object({
  id: z.string().uuid().optional(),
  nombreCompleto: z.string().min(3, "Mín. 3 caracteres"),
  genero: generoEnum,

  // ⬇️ nuevo
  tipoDocumento: tipoDocumentoEnum.default("CI"),

  dni: z.string().min(5, "Documento requerido"),
  ruc: z.string().optional().nullable(),
  telefono: z.string().min(6, "Teléfono requerido"),
  email: z.union([z.string().email("Email inválido"), z.literal(""), z.undefined()]).optional(),

  fechaNacimiento: z
    .union([
      z.coerce.date().refine((d) => d >= MIN_DOB && d <= TODAY, { message: "Fecha inválida" }),
      z.literal(""),
      z.undefined(),
    ])
    .optional(),

  domicilio: z.string().min(3, "Domicilio requerido"),
  obraSocial: z.string().optional().nullable(),
  antecedentesMedicos: z.string().optional().nullable(),
  alergias: z.string().optional().nullable(),
  medicacion: z.string().optional().nullable(),
  responsablePago: z.string().optional().nullable(),

  preferenciasContacto: preferenciasContactoSchema,
  adjuntos: z
    .array(
      z.object({
        id: z.string(),
        nombre: z.string(),
        tipo: z.enum(["CEDULA", "RADIOGRAFIA", "OTRO"]),
        url: z.string().url(),
      }),
    )
    .optional()
    .default([]),

  creadoEl: z.date().optional(),
  actualizadoEl: z.date().optional(),
  estaActivo: z.boolean().default(true),
})

export type PacienteInput = z.infer<typeof pacienteSchema>
export type Paciente = PacienteInput & { id: string }
