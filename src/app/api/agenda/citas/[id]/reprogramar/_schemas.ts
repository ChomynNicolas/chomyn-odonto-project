// app/api/agenda/citas/[id]/reprogramar/_schemas.ts
import { z } from "zod";

const isoDate = z.preprocess((v) => (typeof v === "string" ? new Date(v) : v), z.date());

export const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const reprogramarBodySchema = z.object({
  inicio: isoDate,
  duracionMinutos: z.coerce.number().int().positive().max(24 * 60),
  profesionalId: z.coerce.number().int().positive().optional(),
  consultorioId: z.coerce.number().int().positive().optional(),
  motivo: z.string().trim().min(1).max(300).optional(),
  notas: z.string().trim().max(2000).optional(),
});

export type ReprogramarBody = z.infer<typeof reprogramarBodySchema>;
