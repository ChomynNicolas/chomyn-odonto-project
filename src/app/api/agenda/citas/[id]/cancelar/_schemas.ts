// app/api/agenda/citas/[id]/cancelar/_schemas.ts
import { z } from "zod";

export const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const cancelarBodySchema = z.object({
  motivoCancelacion: z.enum(["PACIENTE","PROFESIONAL","CLINICA","EMERGENCIA","OTRO"]),
  notas: z.string().trim().max(2000).optional(),
  // cancelledByUserId: se ignora por seguridad; lo tomamos de la sesión
});

export type CancelarBody = z.infer<typeof cancelarBodySchema>;
