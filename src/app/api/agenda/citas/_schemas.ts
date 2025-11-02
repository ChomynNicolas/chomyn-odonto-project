// ============================================================================
// SCHEMAS ZOD - Citas (Query, Params)
// ============================================================================

import { z } from "zod"

export const getCitasQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  profesionalId: z.coerce.number().int().positive().optional(),
  consultorioId: z.coerce.number().int().positive().optional(),
  pacienteId: z.coerce.number().int().positive().optional(),
  estado: z.string().optional(), // comma-separated
  tipo: z.string().optional(), // comma-separated
  desde: z.string().datetime().optional(),
  hasta: z.string().datetime().optional(),
})

export type GetCitasQuery = z.infer<typeof getCitasQuerySchema>
