// src/app/api/personas/_schemas.create.ts
/**
 * Schemas para creación de Persona (sin Paciente)
 */

import { z } from "zod"
import { TipoDocumento, Genero, TipoContacto } from "@prisma/client"

export const PersonaCreateBodySchema = z.object({
  nombres: z.string().min(1, "Los nombres son requeridos").max(100).trim(),
  apellidos: z.string().min(1, "Los apellidos son requeridos").max(100).trim(),
  segundoApellido: z.string().max(100).trim().optional().nullable(),
  fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  genero: z.nativeEnum(Genero).optional().nullable(),
  direccion: z.string().max(500).trim().optional().nullable(),
  // Documento
  documento: z.object({
    tipo: z.nativeEnum(TipoDocumento),
    numero: z.string().min(1, "El número de documento es requerido").max(50).trim(),
    ruc: z.string().max(20).trim().optional().nullable(),
    paisEmision: z.string().max(3).default("PY").optional(),
  }),
  // Contactos opcionales
  contactos: z
    .array(
      z.object({
        tipo: z.nativeEnum(TipoContacto),
        valor: z.string().min(1).max(255).trim(),
        label: z.string().max(100).trim().optional(),
      })
    )
    .optional()
    .default([]),
})

export type PersonaCreateBody = z.infer<typeof PersonaCreateBodySchema>

