// ============================================================================
// SCHEMA ZOD - Validación de Disponibilidad JSON
// ============================================================================
// Schema para validar la estructura del campo Profesional.disponibilidad
// Usado al crear/actualizar profesionales para asegurar datos válidos

import { z } from "zod";

/**
 * Schema para un rango de tiempo en formato HH:mm
 * Ejemplo: "08:00", "16:30"
 */
const timeRangeSchema = z.tuple([
  z.string().regex(/^\d{2}:\d{2}$/, "Formato inválido. Se espera HH:mm (ej: 08:00)"),
  z.string().regex(/^\d{2}:\d{2}$/, "Formato inválido. Se espera HH:mm (ej: 16:00)"),
]).refine(
  ([start, end]) => {
    // Validar que start < end
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;
    return startMinutes < endMinutes;
  },
  {
    message: "El horario de inicio debe ser anterior al horario de fin",
  }
);

/**
 * Schema para un día de la semana
 * Clave: "0"-"6" (domingo-sábado) o "1"-"7" (lunes-domingo)
 * Valor: Array de rangos de tiempo
 */
const dayOfWeekSchema = z.record(
  z.string().regex(/^[0-7]$/, "Clave de día inválida. Debe ser 0-6 o 1-7"),
  z.array(timeRangeSchema).min(0).max(10) // Máximo 10 ventanas por día (razonable)
);

/**
 * Schema para un objeto de rango de tiempo con inicio/fin
 */
const timeRangeObjectSchema = z.object({
  inicio: z.string().regex(/^\d{2}:\d{2}$/, "Formato inválido. Se espera HH:mm (ej: 09:00)"),
  fin: z.string().regex(/^\d{2}:\d{2}$/, "Formato inválido. Se espera HH:mm (ej: 13:00)"),
}).refine(
  (data) => {
    const [sh, sm] = data.inicio.split(":").map(Number);
    const [eh, em] = data.fin.split(":").map(Number);
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;
    return startMinutes < endMinutes;
  },
  {
    message: "El horario de inicio debe ser anterior al horario de fin",
  }
);

/**
 * Schema completo para disponibilidad JSON
 * 
 * FORMATO REAL (usado en producción):
 * {
 *   "lunes": [{"inicio":"09:00","fin":"13:00"},{"inicio":"15:00","fin":"19:00"}],
 *   "martes": [{"inicio":"09:00","fin":"13:00"},{"inicio":"15:00","fin":"19:00"}],
 *   "miercoles": [{"inicio":"09:00","fin":"13:00"},{"inicio":"15:00","fin":"19:00"}],
 *   "jueves": [{"inicio":"09:00","fin":"13:00"},{"inicio":"15:00","fin":"19:00"}],
 *   "viernes": [{"inicio":"09:00","fin":"13:00"}],
 *   "sabado": [],
 *   "domingo": []
 * }
 * 
 * FORMATO LEGACY (soportado para compatibilidad):
 * {
 *   "dow": {
 *     "0": [["08:00","12:00"],["13:00","16:00"]],  // Domingo
 *     "1": [["08:00","12:00"],["13:00","16:00"]],  // Lunes
 *     ...
 *   }
 * }
 */
export const disponibilidadSchema = z.union([
  // Formato nuevo: nombres de días en español
  z.object({
    lunes: z.array(timeRangeObjectSchema).optional(),
    martes: z.array(timeRangeObjectSchema).optional(),
    miercoles: z.array(timeRangeObjectSchema).optional(),
    miércoles: z.array(timeRangeObjectSchema).optional(), // Variante con acento
    jueves: z.array(timeRangeObjectSchema).optional(),
    viernes: z.array(timeRangeObjectSchema).optional(),
    sabado: z.array(timeRangeObjectSchema).optional(),
    sábado: z.array(timeRangeObjectSchema).optional(), // Variante con acento
    domingo: z.array(timeRangeObjectSchema).optional(),
  }).passthrough(), // Permitir otros campos pero ignorarlos
  // Formato legacy: dow con números
  z.object({
    dow: dayOfWeekSchema,
  }).strict(),
]);

/**
 * Schema opcional (permite null/undefined para fallback)
 */
export const disponibilidadOptionalSchema = disponibilidadSchema.nullable().optional();

/**
 * Valida y normaliza disponibilidad JSON
 * Retorna el objeto validado o null si es inválido
 */
export function validateDisponibilidad(
  json: unknown
): z.infer<typeof disponibilidadSchema> | null {
  const result = disponibilidadOptionalSchema.safeParse(json);
  if (result.success && result.data) {
    return result.data;
  }
  return null;
}

/**
 * Type para disponibilidad validada
 */
export type DisponibilidadValidated = z.infer<typeof disponibilidadSchema>;

