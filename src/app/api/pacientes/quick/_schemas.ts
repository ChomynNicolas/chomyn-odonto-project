// src/app/api/pacientes/quick/_schemas.ts
import { z } from "zod"
import { GeneroEnum, TipoDocumentoEnum } from "@/lib/schema/paciente"
import { normalizePhone, validatePhone } from "@/lib/phone-utils"

/** Email opcional ("" → undefined) */
const EmailOpcional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined))
  .refine((v) => v === undefined || z.string().email().safeParse(v).success, {
    message: "Email inválido",
  })

/** Teléfono con validación robusta usando phone-utils */
const TelefonoValidado = z
  .string()
  .min(1, "El teléfono es requerido")
  .transform((v) => v.trim())
  .refine(
    (val) => {
      if (!val || val.trim() === "") return false
      const validation = validatePhone(val, "+595")
      return validation.isValid
    },
    (val) => {
      if (!val || val.trim() === "") {
        return { message: "El teléfono es requerido" }
      }
      const validation = validatePhone(val, "+595")
      return {
        message: validation.error || "Formato de teléfono inválido. Ej: 0991234567 o +595991234567",
      }
    }
  )
  .refine(
    (val) => {
      // Rechazar caracteres inválidos (solo números, +, espacios, guiones, paréntesis)
      if (!val) return false
      return !/[^\d+\s\-()]/.test(val)
    },
    {
      message: "El teléfono solo puede contener números, espacios, guiones y el símbolo +",
    }
  )
  .transform((val) => {
    // Normalizar a E.164 después de validar
    if (!val || val.trim() === "") return ""
    return normalizePhone(val, "+595")
  })

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
  nombreCompleto: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(160, "El nombre no puede exceder 160 caracteres"),
  genero: GeneroEnum,
  tipoDocumento: TipoDocumentoEnum,
  dni: z.string().trim().min(3, "El documento debe tener al menos 3 caracteres").max(32, "El documento no puede exceder 32 caracteres"),
  telefono: TelefonoValidado,
  email: EmailOpcional,
  fechaNacimiento: FechaYYYYMMDDRequerida,
})
export type PacienteQuickCreateDTO = z.infer<typeof pacienteQuickCreateSchema>

/** Idempotencia opcional vía header */
export const idempotencyHeaderSchema = z.object({
  "idempotency-key": z.string().uuid().optional(),
})
export type IdempotencyHeaders = z.infer<typeof idempotencyHeaderSchema>
