// src/app/api/procedimientos/[id]/_schemas.ts
import { z } from "zod";

export const ParamIdSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number), // idConsultaProcedimiento
});

export const DienteSuperficieSchema = z.enum([
  "O","M","D","V","L","MO","DO","VO","LO","MOD","MV","DL"
]);

// Acciones permitidas
export const AccionSchema = z.enum(["ACTUALIZAR", "ANULAR", "ELIMINAR"]);

export const PatchProcedimientoSchema = z.object({
  accion: AccionSchema.default("ACTUALIZAR"),

  // Optimistic locking opcional
  updatedAt: z.string().datetime().optional(),

  // Campos actualizables (todos opcionales; se usa subset)
  procedureId: z.number().int().positive().nullable().optional(), // permitir null para quitar catálogo
  serviceType: z.string().trim().min(2).max(120).nullable().optional(),

  toothNumber: z.number().int().min(1).max(85).nullable().optional(),
  toothSurface: DienteSuperficieSchema.nullable().optional(),

  quantity: z.number().int().min(0).max(20).optional(), // permitir 0 en ANULAR
  unitPriceCents: z.number().int().min(0).nullable().optional(),
  totalCents: z.number().int().min(0).nullable().optional(),

  treatmentStepId: z.number().int().positive().nullable().optional(),

  resultNotes: z.string().trim().max(4000).nullable().optional(),
})
.refine(v => {
  // Si es ACTUALIZAR debe venir al menos un campo significativo
  if (v.accion !== "ACTUALIZAR") return true;
  const keys = ["procedureId","serviceType","toothNumber","toothSurface","quantity","unitPriceCents","totalCents","treatmentStepId","resultNotes","updatedAt"];
  return keys.some(k => (v as any)[k] !== undefined);
}, { message: "No hay cambios para aplicar", path: ["accion"] });
