import { z } from "zod";

export const ParamIdSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number), // id de la Cita
});

export const DienteSuperficieSchema = z.enum([
  "O","M","D","V","L","MO","DO","VO","LO","MOD","MV","DL"
]);

export const CrearProcedimientoSchema = z.object({
  // Uno de los dos es obligatorio
  procedureId: z.number().int().positive().optional(),
  serviceType: z.string().trim().min(2).max(120).optional(),

  // Contexto odontológico
  toothNumber: z.number().int().min(1).max(85).optional(),      // 1–32 / 51–85
  toothSurface: DienteSuperficieSchema.optional(),

  // Cantidades / montos (MVP)
  quantity: z.number().int().min(1).max(20).default(1),
  unitPriceCents: z.number().int().min(0).optional(),
  totalCents: z.number().int().min(0).optional(),

  // Vínculos opcionales
  treatmentStepId: z.number().int().positive().optional(),

  // Resultado/observaciones
  resultNotes: z.string().trim().max(2000).optional(),
}).refine(v => v.procedureId || v.serviceType, {
  message: "Debes proporcionar procedureId o serviceType.",
  path: ["procedureId"]
});


export const ListQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Math.min(Math.max(parseInt(v, 10) || 20, 1), 100) : 20)),
  cursor: z
    .string()
    .optional()
    .transform((v) => (v && /^\d+$/.test(v) ? Number(v) : undefined)),
  // Filtros opcionales
  toothNumber: z
    .string()
    .optional()
    .transform((v) => (v && /^\d+$/.test(v) ? Number(v) : undefined)),
  hasCatalog: z
    .string()
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
  q: z.string().optional(), // busca en serviceType/resultNotes (simple)
});