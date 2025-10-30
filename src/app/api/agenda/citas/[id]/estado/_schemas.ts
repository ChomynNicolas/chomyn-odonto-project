// app/api/agenda/citas/[id]/estado/_schemas.ts
import { z } from "zod";

export const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const estadoBodySchema = z.object({
  nuevoEstado: z.enum(["CONFIRMED","CHECKED_IN","IN_PROGRESS","COMPLETED","NO_SHOW"]),
  nota: z.string().trim().max(2000).optional(),
  // changedByUserId: se ignora por seguridad; se usa el id de la sesión
});

export type EstadoBody = z.infer<typeof estadoBodySchema>;
