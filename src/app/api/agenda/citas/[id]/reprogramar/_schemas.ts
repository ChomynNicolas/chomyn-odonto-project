// app/api/agenda/citas/[id]/reprogramar/_schemas.ts
import { z } from "zod";

/**
 * Normaliza un string ISO datetime a Date, asegurando timezone consistente.
 * Acepta ISO strings y los convierte a Date objects.
 */
export const isoDateSchema = z.preprocess(
  (val) => {
    if (typeof val === "string") {
      // Validar formato ISO básico
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
        return val; // Dejar que Zod valide el error
      }
      const d = new Date(val);
      // Validar que sea una fecha válida
      if (isNaN(d.getTime())) {
        return val; // Dejar que Zod valide el error
      }
      return d;
    }
    if (val instanceof Date) {
      return val;
    }
    return val;
  },
  z.date({ message: "Formato de fecha inválido. Se espera ISO datetime string." })
);

/**
 * Schema para validar inicioISO y finISO como strings ISO datetime.
 * Normaliza timezone: convierte a UTC internamente para consistencia.
 */
export const isoDateTimeStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/, "Formato ISO datetime inválido")
  .transform((val) => {
    // Normalizar a UTC: si no tiene Z, asumir que es local y convertir
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      throw new Error("Fecha inválida");
    }
    // Retornar ISO string normalizado (UTC)
    return d.toISOString();
  });

export const paramsSchema = z.object({
  id: z.coerce.number().int().positive({ message: "ID de cita inválido" }),
});

/**
 * Schema mejorado para reprogramar cita.
 * - inicioISO: string ISO datetime (normalizado a UTC)
 * - finISO: calculado automáticamente o explícito
 * - motivo: opcional pero validado si se proporciona
 * - idempotencyKey: opcional para prevenir duplicados
 */
export const reprogramarBodySchema = z
  .object({
    inicioISO: isoDateTimeStringSchema,
    finISO: isoDateTimeStringSchema.optional(),
    duracionMinutos: z.coerce.number().int().positive().max(24 * 60).optional(),
    profesionalId: z.coerce.number().int().positive().optional(),
    consultorioId: z.coerce.number().int().positive().optional(),
    motivo: z.string().trim().min(1).max(300).optional(),
    notas: z.string().trim().max(2000).optional(),
    idempotencyKey: z.string().uuid().optional(),
  })
  .refine(
    (data) => {
      // Si se proporciona finISO, debe ser posterior a inicioISO
      if (data.finISO && data.inicioISO) {
        const inicio = new Date(data.inicioISO);
        const fin = new Date(data.finISO);
        return fin > inicio;
      }
      // Si no hay finISO, debe haber duracionMinutos
      if (!data.finISO && !data.duracionMinutos) {
        return false;
      }
      return true;
    },
    {
      message: "finISO debe ser posterior a inicioISO, o se debe proporcionar duracionMinutos",
    }
  );

export type ReprogramarBody = z.infer<typeof reprogramarBodySchema>;
