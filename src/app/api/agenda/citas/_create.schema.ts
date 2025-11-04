// ============================================================================
// SCHEMA ZOD - Crear Cita
// ============================================================================

import { z } from "zod"

export const createCitaBodySchema = z.object({
  pacienteId: z.number().int().positive(),
  profesionalId: z.number().int().positive(),
  consultorioId: z.number().int().positive().optional(),
  inicio: z.string().datetime(),
  duracionMinutos: z.number().int().min(5).max(480).default(30),
  tipo: z
    .enum(["CONSULTA", "LIMPIEZA", "ENDODONCIA", "EXTRACCION", "URGENCIA", "ORTODONCIA", "CONTROL", "OTRO"])
    .default("CONSULTA"),
  motivo: z.string().min(1).max(500).default("Cita"),
  notas: z.string().max(2000).optional(),
})

export type CreateCitaBody = z.infer<typeof createCitaBodySchema>
