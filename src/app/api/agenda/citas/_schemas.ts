// app/api/agenda/citas/_schemas.ts
import { z } from "zod";

const asDate = z.preprocess((v) => (typeof v === "string" ? new Date(v) : v), z.date());

export const estadoEnum = z.enum([
  "SCHEDULED",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);

export const getCitasQuerySchema = z.object({
  fechaInicio: asDate.optional(),
  fechaFin: asDate.optional(),
  profesionalId: z.coerce.number().int().positive().optional(),
  pacienteId: z.coerce.number().int().positive().optional(),
  consultorioId: z.coerce.number().int().positive().optional(),
  estado: z
    .union([estadoEnum, z.string().transform((s) => s.split(",").filter(Boolean))])
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z
    .string()
    .optional()
    .default("inicio:asc"), // formato campo:dir
});

export type GetCitasQuery = z.infer<typeof getCitasQuerySchema>;
