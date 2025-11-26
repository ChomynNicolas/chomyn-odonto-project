// Zod validation schemas for patient editing

import { z } from "zod"
import { patientUpdateBodySchema } from "@/app/api/pacientes/[id]/_schemas"

/**
 * Regex pattern for names allowing letters, spaces, accents, and ñ
 */
const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/

/**
 * Regex pattern for document numbers allowing alphanumeric with hyphens
 */
const documentNumberPattern = /^[a-zA-Z0-9\-]+$/

/**
 * Base schema for patient editing
 * Extends the existing patientUpdateBodySchema with enhanced validations for critical fields
 */
export const patientEditBaseSchema = patientUpdateBodySchema.extend({
  firstName: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres")
    .regex(namePattern, "El nombre solo puede contener letras, espacios y acentos")
    .optional(),

  lastName: z
    .string()
    .min(2, "El apellido debe tener al menos 2 caracteres")
    .max(100, "El apellido no puede exceder 100 caracteres")
    .regex(namePattern, "El apellido solo puede contener letras, espacios y acentos")
    .optional(),

  documentNumber: z
    .string()
    .min(6, "El número de documento debe tener al menos 6 caracteres")
    .max(20, "El número de documento no puede exceder 20 caracteres")
    .regex(documentNumberPattern, "El número de documento solo puede contener letras, números y guiones")
    .optional(),

  dateOfBirth: z
    .string()
    .datetime()
    .refine(
      (val) => {
        if (!val) return true // null/empty is allowed
        const birthDate = new Date(val)
        const today = new Date()
        const age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        const adjustedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age
        return adjustedAge >= 0 && adjustedAge <= 120
      },
      {
        message: "La fecha de nacimiento debe resultar en una edad entre 0 y 120 años",
      }
    )
    .optional()
    .nullable(),

  phone: z
    .string()
    .regex(/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/, "Formato de teléfono inválido")
    .optional()
    .nullable()
    .or(z.literal("")),

  email: z.string().email("Email inválido").optional().nullable().or(z.literal("")),

  address: z.string().max(250, "La dirección no puede exceder 250 caracteres").optional().nullable(),

  secondLastName: z.string().max(100, "El segundo apellido no puede exceder 100 caracteres").optional().nullable(),
})

/**
 * Schema for patient editing with critical changes
 * Requires motivoCambioCritico when critical fields are changed
 */
export const patientEditWithCriticalSchema = patientEditBaseSchema.extend({
  motivoCambioCritico: z
    .string()
    .min(10, "El motivo debe tener al menos 10 caracteres")
    .max(500, "El motivo no puede exceder 500 caracteres")
    .refine((val) => val.trim().length >= 10, {
      message: "El motivo no puede estar vacío o contener solo espacios",
    }),
})

/**
 * Inferred types from schemas
 */
export type PatientEditFormData = z.infer<typeof patientEditBaseSchema>
export type PatientEditWithCriticalData = z.infer<typeof patientEditWithCriticalSchema>
