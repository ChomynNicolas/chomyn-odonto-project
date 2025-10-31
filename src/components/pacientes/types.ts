// src/components/pacientes/types.ts
import { z } from "zod"

export const generoEnum = z.enum(["MASCULINO", "FEMENINO", "OTRO", "NO_ESPECIFICADO"])
export const tipoDocumentoEnum = z.enum(["CI", "DNI", "PASAPORTE", "RUC", "OTRO"])

export const pacienteSchema = z.object({
  nombreCompleto: z.string().min(2),
  genero: generoEnum,
  tipoDocumento: tipoDocumentoEnum.default("CI"),
  fechaNacimiento: z.union([z.date(), z.string(), z.literal(""), z.undefined()]).optional(),
  dni: z.string().min(3),
  ruc: z.string().optional(),
  telefono: z.string().min(6),
  email: z.string().email().optional().or(z.literal("")).optional(),
  domicilio: z.string().optional(),
  obraSocial: z.string().optional(),
  antecedentesMedicos: z.string().optional(),
  alergias: z.string().optional(),
  medicacion: z.string().optional(),
  // ⚠️ responsablePago se elimina en fase 0 para evitar mismatch front/back
  preferenciasContacto: z
    .object({
      whatsapp: z.boolean().optional(),
      llamada: z.boolean().optional(),
      sms: z.boolean().optional(),
      email: z.boolean().optional(),
    })
    .partial()
    .optional(),
  adjuntos: z.array(z.any()).optional(),
})

export type PacienteInput = z.infer<typeof pacienteSchema>
