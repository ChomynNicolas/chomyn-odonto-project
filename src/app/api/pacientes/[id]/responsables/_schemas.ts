import { z } from "zod"
export { LinkResponsablePagoSchema } from "@/lib/schema/paciente" // fuente única

/** Schema para crear responsable con persona nueva */
export const CreateResponsableWithPersonaSchema = z.object({
  nombreCompleto: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  tipoDocumento: z.enum(["DNI", "CEDULA", "RUC", "PASAPORTE"]),
  numeroDocumento: z.string().min(5, "El número de documento es requerido"),
  tipoVinculo: z.enum(["PADRE", "MADRE", "TUTOR", "AUTORIZADO"]),
  telefono: z.string().optional(),
})

export type CreateResponsableWithPersonaDTO = z.infer<typeof CreateResponsableWithPersonaSchema>

/** Idempotencia opcional: aceptamos ambos headers por compatibilidad */
export const IdempotencyHeaderSchema = z.object({
  "x-idempotency-key": z.string().uuid().optional(),
  "idempotency-key": z.string().uuid().optional(),
})
export type IdempotencyHeaders = z.infer<typeof IdempotencyHeaderSchema>
