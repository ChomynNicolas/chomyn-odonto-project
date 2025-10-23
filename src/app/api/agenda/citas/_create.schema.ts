// app/api/agenda/citas/_create.schema.ts
import { z } from "zod";

const isoDate = z.preprocess((v) => (typeof v === "string" ? new Date(v) : v), z.date());

export const createCitaBodySchema = z.object({
  pacienteId: z.coerce.number().int().positive(),
  profesionalId: z.coerce.number().int().positive(),
  consultorioId: z.coerce.number().int().positive().optional(), // puede omitirse
  inicio: isoDate,
  duracionMinutos: z.coerce.number().int().positive().max(24 * 60),
  tipo: z.enum([
    "CONSULTA",
    "LIMPIEZA",
    "ENDODONCIA",
    "EXTRACCION",
    "URGENCIA",
    "ORTODONCIA",
    "CONTROL",
    "OTRO",
  ]),
  motivo: z.string().trim().min(1).max(300).optional(),
  notas: z.string().trim().max(2000).optional(),
  // createdByUserId: lo ignoramos por seguridad; lo tomamos de la sesión
});

export type CreateCitaBody = z.infer<typeof createCitaBodySchema>;
