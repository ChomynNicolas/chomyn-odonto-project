// src/app/api/pacientes/[id]/plan-tratamiento/_schemas.ts
import { z } from "zod"
import { DienteSuperficie, TreatmentStepStatus } from "@prisma/client"

const DienteSuperficieSchema = z.nativeEnum(DienteSuperficie)

const TreatmentStepStatusSchema = z.nativeEnum(TreatmentStepStatus)

const StepSchema = z.object({
  order: z.number().int().positive(),
  procedureId: z.number().int().positive().nullable().optional(),
  serviceType: z.string().max(200).nullable().optional(),
  toothNumber: z
    .number()
    .int()
    .refine((n) => (n >= 1 && n <= 32) || (n >= 51 && n <= 85), {
      message: "toothNumber debe estar entre 1-32 o 51-85",
    })
    .nullable()
    .optional(),
  toothSurface: DienteSuperficieSchema.nullable().optional(),
  estimatedDurationMin: z.number().int().positive().nullable().optional(),
  estimatedCostCents: z.number().int().nonnegative().nullable().optional(),
  priority: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

const CreateStepSchema = StepSchema

const UpdateStepSchema = StepSchema.extend({
  id: z.number().int().positive().optional(), // if updating existing step
})

export const CreatePlanSchema = z.object({
  titulo: z.string().min(1).max(200),
  descripcion: z.string().max(1000).nullable().optional(),
  steps: z.array(CreateStepSchema).min(1, "Debe haber al menos un paso en el plan"),
})

export const UpdatePlanSchema = z.object({
  titulo: z.string().min(1).max(200).optional(),
  descripcion: z.string().max(1000).nullable().optional(),
  steps: z.array(UpdateStepSchema).optional(),
})

export const UpdateStepStatusSchema = z.object({
  status: TreatmentStepStatusSchema,
})

export type CreatePlanInput = z.infer<typeof CreatePlanSchema>
export type UpdatePlanInput = z.infer<typeof UpdatePlanSchema>
export type UpdateStepStatusInput = z.infer<typeof UpdateStepStatusSchema>

