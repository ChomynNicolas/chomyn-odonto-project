// src/app/api/pacientes/_schemas.ts
import { z } from "zod"
import {
  GeneroEnum,
  TipoDocumentoEnum,
  RelacionPacienteEnum,
  PreferenciasContactoSchema as preferenciasContactoSchema,
  ResponsablePagoSchema as responsablePagoSchema,
  PacienteCreateSchema as pacienteCreateBodySchema,
  type PacienteCreateDTO as PacienteCreateBody,
} from "@/lib/schema/paciente"

// Re-export para que el resto del back importe desde aquí si prefiere
export {
  GeneroEnum,
  TipoDocumentoEnum,
  RelacionPacienteEnum,
  preferenciasContactoSchema,
  responsablePagoSchema,
  pacienteCreateBodySchema,
  type PacienteCreateBody,
}

export const pacientesListQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  cursor: z.string().optional(), // idPaciente como string
  soloActivos: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v !== "false"), // default true
  genero: GeneroEnum.optional(),
  hasEmail: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  hasPhone: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  // rangos ISO: 2025-10-01
  createdFrom: z.string().optional(),
  createdTo: z.string().optional(),
  // orden
  sort: z.enum(["createdAt desc", "createdAt asc", "nombre asc", "nombre desc"]).default("createdAt desc"),
  obraSocial: z.string().trim().min(1).max(120).optional(),
})

export type PacientesListQuery = z.infer<typeof pacientesListQuerySchema>
