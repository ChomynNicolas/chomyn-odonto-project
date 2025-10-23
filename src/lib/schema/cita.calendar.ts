import { z } from "zod";

/** === ENUM API (según tu backend real) === */
export const CitaEstadoEnum = z.enum([
  "SCHEDULED",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);

/** === SHAPE QUE VIENE DEL BACKEND (API Response) === */
export const CitaItemApiSchema = z.object({
  idCita: z.number().int(),
  inicio: z.string().datetime(),
  fin: z.string().datetime(),
  duracionMinutos: z.number().int(),
  tipo: z.string(),
  estado: CitaEstadoEnum,
  motivo: z.string().nullable().optional(),
  profesional: z.object({
    id: z.number().int(),
    nombre: z.string(),
  }),
  paciente: z.object({
    id: z.number().int(),
    nombre: z.string(),
  }),
  consultorio: z
    .object({
      id: z.number().int(),
      nombre: z.string(),
      colorHex: z.string().regex(/^#([0-9A-Fa-f]{6})$/),
    })
    .nullable()
    .optional(),
});

export const CitasListApiResponseSchema = z.object({
  ok: z.literal(true),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number().optional(),
    // el backend trae extras; Zod permite keys extra por defecto
  }),
  data: z.array(CitaItemApiSchema),
});

export type CitaItemApi = z.infer<typeof CitaItemApiSchema>;
export type CitasListApiResponse = z.infer<typeof CitasListApiResponseSchema>;

/** === DTO NORMALIZADO (lo que usaremos en el front / calendar) === */
export const CitaItemSchema = z.object({
  idCita: z.number().int(),
  pacienteId: z.number().int(),
  profesionalId: z.number().int(),
  consultorioId: z.number().int().nullable().optional(),
  motivo: z.string().nullable().optional(),
  inicio: z.string().datetime(),
  fin: z.string().datetime(),
  estado: CitaEstadoEnum,
  // extras opcionales para UI
  profesionalNombre: z.string().optional(),
  pacienteNombre: z.string().optional(),
  consultorioNombre: z.string().optional(),
  consultorioColorHex: z.string().regex(/^#([0-9A-Fa-f]{6})$/).optional(),
});
export type CitaItem = z.infer<typeof CitaItemSchema>;

/** === POST body (sigue igual) === */
export const CreateCitaBodySchema = z.object({
  pacienteId: z.number().int(),
  profesionalId: z.number().int(),
  consultorioId: z.number().int().nullable().optional(),
  motivo: z.string().min(1),
  inicio: z.string().datetime(),
  fin: z.string().datetime(),
});
export type CreateCitaBody = z.infer<typeof CreateCitaBodySchema>;
