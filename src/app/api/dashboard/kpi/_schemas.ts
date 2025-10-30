// src/app/api/dashboard/kpi/_schemas.ts
import { z } from "zod";
const asDate = z.preprocess((v) => (typeof v === "string" ? new Date(v) : v), z.date());

export const getKpiQuerySchema = z.object({
  // filtros opcionales (scopes por rol)
  profesionalId: z.coerce.number().int().positive().optional(),
  consultorioId: z.coerce.number().int().positive().optional(),
  fecha: asDate.optional(), // por defecto hoy
  slotMin: z.coerce.number().int().positive().default(30), // tamaño de slot para ocupación
});

export type GetKpiQuery = z.infer<typeof getKpiQuerySchema>;
