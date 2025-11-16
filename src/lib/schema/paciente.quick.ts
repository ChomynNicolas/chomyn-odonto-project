import { z } from "zod"
import { GeneroEnum, TipoDocumentoEnum } from "./paciente"

/**
 * Zod schema for quick patient creation
 * Validates minimal required fields for rapid patient registration
 */
export const pacienteQuickCreateSchema = z.object({
  nombreCompleto: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  genero: GeneroEnum.optional(),
  tipoDocumento: TipoDocumentoEnum, // Required by default, no custom error needed
  dni: z.string().min(3, "El número de documento debe tener al menos 3 caracteres"),
  telefono: z.string().min(6, "El teléfono debe tener al menos 6 dígitos"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  fechaNacimiento: z.string().optional(), // ISO date string YYYY-MM-DD
})

export type PacienteQuickCreateDTO = z.infer<typeof pacienteQuickCreateSchema>
