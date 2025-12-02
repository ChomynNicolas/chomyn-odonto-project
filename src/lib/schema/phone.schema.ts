// src/lib/schema/phone.schema.ts
/**
 * Schema reutilizable para validación de teléfonos usando Zod
 * Integra con phone-utils.ts para validación robusta y consistente
 */

import { z } from "zod"
import { normalizePhone, validatePhone } from "@/lib/phone-utils"

/**
 * Schema base para teléfono que valida formato y normaliza
 * Soporta múltiples formatos de entrada y los normaliza a E.164
 * 
 * @param options - Opciones de configuración
 * @param options.required - Si el teléfono es requerido (default: true)
 * @param options.countryCode - Código de país por defecto (default: "+595")
 * @param options.allowEmpty - Si permite string vacío cuando no es requerido (default: true)
 */
export function createPhoneSchema(options?: {
  required?: boolean
  countryCode?: string
  allowEmpty?: boolean
}) {
  const {
    required = true,
    countryCode = "+595",
    allowEmpty = true,
  } = options || {}

  let schema: z.ZodSchema<string | undefined>

  // Validación de requerido
  if (required) {
    schema = z.string().min(1, "El teléfono es requerido")
  } else if (allowEmpty) {
    schema = z.union([z.string(), z.literal("")]).optional()
  } else {
    schema = z.string().optional()
  }

  // Transformación: normalizar y limpiar espacios
  schema = schema.transform((val) => {
    if (!val || typeof val !== "string") return ""
    return val.trim()
  }) as z.ZodSchema<string | undefined>

  // Validación de formato usando phone-utils
  schema = schema.refine(
    (val) => {
      // Si no es requerido y está vacío, es válido
      if (!required && (!val || val.trim() === "")) {
        return true
      }

      // Validar usando phone-utils
      const validation = validatePhone(val || "", countryCode)
      return validation.isValid
    },
    "Formato de teléfono inválido"
  ) as z.ZodSchema<string | undefined>

  // Transformación final: normalizar a E.164
  schema = schema.transform((val) => {
    if (!val || val.trim() === "") {
      return required ? "" : undefined
    }
    return normalizePhone(val, countryCode)
  })

  return schema
}

/**
 * Schema de teléfono requerido (Paraguay por defecto)
 * Normaliza a formato E.164 y valida formato
 */
export const PhoneSchemaRequired = createPhoneSchema({
  required: true,
  countryCode: "+595",
})

/**
 * Schema de teléfono opcional
 * Permite string vacío o undefined
 */
export const PhoneSchemaOptional = createPhoneSchema({
  required: false,
  countryCode: "+595",
  allowEmpty: true,
})

/**
 * Schema de teléfono con código de país dinámico
 * Útil para formularios con selector de país
 */
export function createPhoneSchemaWithCountryCode(countryCode: string) {
  return createPhoneSchema({
    required: true,
    countryCode,
  })
}

/**
 * Tipo inferido del schema requerido
 */
export type PhoneValue = z.infer<typeof PhoneSchemaRequired>

/**
 * Tipo inferido del schema opcional
 */
export type PhoneValueOptional = z.infer<typeof PhoneSchemaOptional>

