import { z } from "zod"

export const CitaActionSchema = z.enum([
  "CONFIRM",   // SCHEDULED -> CONFIRMED
  "CHECKIN",   // SCHEDULED/CONFIRMED -> CHECKED_IN
  "START",     // CHECKED_IN -> IN_PROGRESS
  "COMPLETE",  // IN_PROGRESS -> COMPLETED
  "CANCEL",    // * -> CANCELLED
  "NO_SHOW",   // SCHEDULED/CONFIRMED -> NO_SHOW
])

export const TransitionRequestSchema = z.object({
  action: CitaActionSchema,
  notas: z.string().max(2000).optional(),
  motivoCancelacion: z.enum(["PACIENTE","PROFESIONAL","CLINICA","EMERGENCIA","OTRO"]).optional(),
})

export type CitaAction = z.infer<typeof CitaActionSchema>
export type TransitionRequest = z.infer<typeof TransitionRequestSchema>
