// src/app/api/pacientes/_schemas.ts
import { z } from "zod";
import {
  GeneroEnum,
  TipoDocumentoEnum,
  RelacionPacienteEnum,
  PreferenciasContactoSchema as preferenciasContactoSchema,
  ResponsablePagoSchema as responsablePagoSchema,
  PacienteCreateSchema as pacienteCreateBodySchema,
  type PacienteCreateDTO as PacienteCreateBody,
} from "@/lib/schema/paciente";

export {
  GeneroEnum,
  TipoDocumentoEnum,
  RelacionPacienteEnum,
  preferenciasContactoSchema,
  responsablePagoSchema,
  pacienteCreateBodySchema,
  type PacienteCreateBody,
};

export const pacientesListQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  cursor: z.string().optional(),
  soloActivos: z.union([z.literal("true"), z.literal("false")]).optional()
    .transform((v) => v !== "false"),
  genero: GeneroEnum.optional(),
  hasEmail: z.union([z.literal("true"), z.literal("false")]).optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  hasPhone: z.union([z.literal("true"), z.literal("false")]).optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  createdFrom: z.string().optional(), // YYYY-MM-DD
  createdTo: z.string().optional(),
  sort: z.enum(["createdAt desc", "createdAt asc", "nombre asc", "nombre desc"]).default("createdAt desc"),
  obraSocial: z.string().trim().min(1).max(120).optional(),
});


// Patient creation schema
export const PacienteCreateDTOSchema = z.object({
  nombres: z.string().min(1).max(100),
  apellidos: z.string().min(1).max(100),
  segundoApellido: z.string().max(100).optional(),
  fechaNacimiento: z.string().optional(),
  genero: z.enum(["MALE", "FEMALE", "OTHER"]),
  documentoTipo: z.enum(["CI", "PASSPORT", "RUC", "OTHER"]).optional(),
  documentoNumero: z.string().max(50).optional(),
  documentoPais: z.enum(["PY", "AR", "BR", "OTHER"]).optional(),
  ruc: z.string().max(50).optional(),
  direccion: z.string().max(300).optional(),
  ciudad: z.string().max(100).optional(),
  pais: z.enum(["PY", "AR", "BR", "OTHER"]).optional(),
})

// Patient update schema
export const PacienteUpdateDTOSchema = PacienteCreateDTOSchema.partial()

// Query filters schema
export const PacienteListFiltersSchema = z.object({
  q: z.string().optional(),
  createdFrom: z.string().optional(),
  createdTo: z.string().optional(),
  estaActivo: z.boolean().optional(),
  sort: z.enum(["createdAt_asc", "createdAt_desc", "nombre_asc", "nombre_desc"]).optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
})


export type PacientesListQuery = z.infer<typeof pacientesListQuerySchema>;
