import { z } from "zod"

export const ConsentimientoCreateSchema = z.object({
  responsablePersonaId: z.number().int().positive({ message: "Responsable requerido" }),
  tipo: z.enum([
    "CONSENTIMIENTO_MENOR_ATENCION",
    "TRATAMIENTO_ESPECIFICO",
    "ANESTESIA",
    "CIRUGIA",
    "RADIOGRAFIA",
    "DATOS_PERSONALES",
    "OTRO",
  ]),
  firmadoEn: z.string().datetime({ message: "Fecha de firma requerida" }),
  vigenciaEnMeses: z.number().int().min(1).max(60).default(12),
  citaId: z.number().int().positive().optional().nullable(),
  observaciones: z.string().max(1000).optional().nullable(),

  // Cloudinary upload data
  cloudinary: z.object({
    publicId: z.string().min(1),
    secureUrl: z.string().url(),
    format: z.string().optional(),
    bytes: z.number().int().positive(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    hash: z.string().optional(),
  }),
})

export type ConsentimientoCreateBody = z.infer<typeof ConsentimientoCreateSchema>

export const ConsentimientoListQuerySchema = z.object({
  tipo: z
    .enum([
      "CONSENTIMIENTO_MENOR_ATENCION",
      "TRATAMIENTO_ESPECIFICO",
      "ANESTESIA",
      "CIRUGIA",
      "RADIOGRAFIA",
      "DATOS_PERSONALES",
      "OTRO",
    ])
    .optional(),
  vigente: z
    .string()
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
  responsableId: z
    .string()
    .optional()
    .transform((v) => (v && /^\d+$/.test(v) ? Number(v) : undefined)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Math.min(Math.max(Number.parseInt(v, 10) || 50, 1), 100) : 50)),
})

export type ConsentimientoListQuery = z.infer<typeof ConsentimientoListQuerySchema>

export const ConsentimientoRevokeSchema = z.object({
  reason: z.string().min(1).max(500),
})

export type ConsentimientoRevokeBody = z.infer<typeof ConsentimientoRevokeSchema>
