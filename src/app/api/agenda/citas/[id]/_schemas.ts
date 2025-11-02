// ============================================================================
// SCHEMAS ZOD - Detalle de Cita
// ============================================================================

import { z } from "zod"

export const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type ParamsSchema = z.infer<typeof paramsSchema>
