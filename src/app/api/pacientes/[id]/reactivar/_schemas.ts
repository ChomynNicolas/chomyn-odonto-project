// src/app/api/pacientes/[id]/reactivar/_schemas.ts
import { z } from "zod";

export const reactivateQuerySchema = z.object({
  // Si se pasa persona=true, también reactivamos Persona.estaActivo
  persona: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
});

export type ReactivateQuery = z.infer<typeof reactivateQuerySchema>;

// (Opcional) body con motivo para auditoría futura
export const reactivateBodySchema = z
  .object({
    motivo: z.string().min(3).max(240).optional(),
  })
  .optional();

export type ReactivateBody = z.infer<typeof reactivateBodySchema>;
