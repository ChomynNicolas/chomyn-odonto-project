// src/app/api/pacientes/quick/_schemas.ts
import { z } from "zod"
import { GeneroEnum, TipoDocumentoEnum } from "@/lib/schema/paciente"

/** Email opcional ("" → undefined) */
const EmailOpcional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined))
  .refine((v) => v === undefined || z.string().email().safeParse(v).success, {
    message: "Email inválido",
  })

/** Teléfono (mínima validación) */
const TelefonoMin = z
  .string()
  .min(6, "El teléfono debe tener al menos 6 dígitos")
  .max(40, "El teléfono no debe exceder 40 caracteres")
  .transform((v) => v.trim())

const FechaYYYYMMDDRequerida = z
  .string()
  .min(1, "La fecha de nacimiento es requerida")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (formato esperado YYYY-MM-DD)")
  .refine(
    (v) => {
      const date = new Date(v)
      const now = new Date()
      const minDate = new Date(now.getFullYear() - 120, 0, 1) // Máximo 120 años atrás
      return date >= minDate && date <= now
    },
    {
      message: "La fecha debe estar entre hace 120 años y hoy",
    },
  )

export const pacienteQuickCreateSchema = z.object({
  nombreCompleto: z.string().trim().min(2).max(160),
  genero: GeneroEnum,
  tipoDocumento: TipoDocumentoEnum,
  dni: z.string().trim().min(3).max(32),
  telefono: TelefonoMin,
  email: EmailOpcional,
  fechaNacimiento: FechaYYYYMMDDRequerida,
})
export type PacienteQuickCreateDTO = z.infer<typeof pacienteQuickCreateSchema>

/** Idempotencia opcional vía header */
export const idempotencyHeaderSchema = z.object({
  "idempotency-key": z.string().uuid().optional(),
})
export type IdempotencyHeaders = z.infer<typeof idempotencyHeaderSchema>
