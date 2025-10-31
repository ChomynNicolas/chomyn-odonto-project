import { z } from "zod"
export { LinkResponsablePagoSchema } from "@/lib/schema/paciente" // fuente única

/** Idempotencia opcional: aceptamos ambos headers por compatibilidad */
export const IdempotencyHeaderSchema = z.object({
  "x-idempotency-key": z.string().uuid().optional(),
  "idempotency-key": z.string().uuid().optional(),
})
export type IdempotencyHeaders = z.infer<typeof IdempotencyHeaderSchema>
