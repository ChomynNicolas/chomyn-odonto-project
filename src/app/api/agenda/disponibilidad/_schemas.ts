// ============================================================================
// SCHEMAS ZOD - Disponibilidad
// ============================================================================

import { z } from "zod"

export const getDisponibilidadQuerySchema = z.object({
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // YYYY-MM-DD
  profesionalId: z.coerce.number().int().positive().optional(),
  consultorioId: z.coerce.number().int().positive().optional(),
  duracionMinutos: z.coerce.number().int().min(5).max(480).default(30),
  intervalo: z.coerce.number().int().min(5).max(60).default(15),
})

export type GetDisponibilidadQuery = z.infer<typeof getDisponibilidadQuerySchema>
