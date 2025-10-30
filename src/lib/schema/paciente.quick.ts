import { z } from "zod"

/**
 * Zod schema for quick patient creation
 * Validates minimal required fields for rapid patient registration
 */
export const pacienteQuickCreateSchema = z.object({
  nombreCompleto: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  genero: z.enum(["MASCULINO", "FEMENINO", "OTRO", "NO_ESPECIFICADO"]).optional(),
  tipoDocumento: z.enum(["CI", "DNI", "PASAPORTE", "RUC", "OTRO"], {
    required_error: "El tipo de documento es requerido",
  }),
  dni: z.string().min(3, "El número de documento debe tener al menos 3 caracteres"),
  telefono: z.string().min(6, "El teléfono debe tener al menos 6 dígitos"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  fechaNacimiento: z.string().optional(), // ISO date string YYYY-MM-DD
})

export type PacienteQuickCreateDTO = z.infer<typeof pacienteQuickCreateSchema>
