// src/app/api/pacientes/quick/_schemas.ts
import { z } from "zod"
import { GeneroEnum, TipoDocumentoEnum } from "@/lib/schema/paciente"

/** 'YYYY-MM-DD' o vacío → undefined */
const FechaYYYYMMDD = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined))
  .refine((v) => v === undefined || /^\d{4}-\d{2}-\d{2}$/.test(v), {
    message: "Fecha inválida (formato esperado YYYY-MM-DD)",
  })

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

export const pacienteQuickCreateSchema = z.object({
  nombreCompleto: z.string().trim().min(2).max(160),
  genero: GeneroEnum.optional(),
  tipoDocumento: TipoDocumentoEnum,
  dni: z.string().trim().min(3).max(32),
  telefono: TelefonoMin,
  email: EmailOpcional,
  fechaNacimiento: FechaYYYYMMDD,
})
export type PacienteQuickCreateDTO = z.infer<typeof pacienteQuickCreateSchema>

/** Idempotencia opcional vía header */
export const idempotencyHeaderSchema = z.object({
  "idempotency-key": z.string().uuid().optional(),
})
export type IdempotencyHeaders = z.infer<typeof idempotencyHeaderSchema>
