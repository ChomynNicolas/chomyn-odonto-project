// app/api/agenda/disponibilidad/_schemas.ts
import { z } from "zod";

export const getDisponibilidadQuerySchema = z.object({
  profesionalId: z.coerce.number().int().positive().optional(),
  consultorioId: z.coerce.number().int().positive().optional(),
  // Acepta "2025-10-22" o ISO; normalizamos a Date (00:00 local/UTC según envío)
  fecha: z
    .string()
    .trim()
    .min(8, "fecha requerida (YYYY-MM-DD)")
    .optional(),
  duracionMinutos: z.coerce.number().int().positive().max(24 * 60).default(30),
  intervalo: z.coerce.number().int().positive().max(240).default(15),
});

export type GetDisponibilidadQuery = z.infer<typeof getDisponibilidadQuerySchema>;
