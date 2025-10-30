// src/app/api/pacientes/_schemas.ts
import { z } from "zod";

export const GeneroEnum = z.enum(["MASCULINO", "FEMENINO", "OTRO", "NO_ESPECIFICADO"]);
export const TipoDocumentoEnum = z.enum(["CI", "DNI", "PASAPORTE", "RUC", "OTRO"]);
export const RelacionPacienteEnum = z.enum(["PADRE","MADRE","TUTOR","CONYUGE","FAMILIAR","OTRO"]);

export const preferenciasContactoSchema = z.object({
  whatsapp: z.boolean().optional(),
  sms: z.boolean().optional(),
  email: z.boolean().optional(),
  llamada: z.boolean().optional(),
}).partial();

export const responsablePagoSchema = z.object({
  personaId: z.number().int().positive(),
  relacion: RelacionPacienteEnum,
  esPrincipal: z.boolean().default(true),
});

export const pacienteCreateBodySchema = z.object({
  nombreCompleto: z.string().min(3).max(160),
  genero: GeneroEnum,
  dni: z.string().min(3).max(32),
  tipoDocumento: TipoDocumentoEnum.default("CI").optional(),
  ruc: z.string().min(3).max(32).nullable().optional(),
  telefono: z.string().min(6).max(40),
  email: z.string().email().optional().nullable(),
  domicilio: z.string().max(200).optional().nullable(),
  obraSocial: z.string().max(120).optional().nullable(),
  antecedentesMedicos: z.string().max(2000).optional().nullable(),
  alergias: z.string().max(1000).optional().nullable(),
  medicacion: z.string().max(1000).optional().nullable(),
  responsablePago: responsablePagoSchema.optional(),
  preferenciasContacto: preferenciasContactoSchema.optional(),
  fechaNacimiento: z.coerce.date().optional().nullable(),
});

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
  // rangos de fecha de creación (ISO): 2025-10-01
  createdFrom: z.string().optional(),
  createdTo: z.string().optional(),
  // ordenamiento
  sort: z
    .enum(["createdAt desc", "createdAt asc", "nombre asc", "nombre desc"])
    .default("createdAt desc"),
  // ⚠️ obraSocial: ver nota más abajo
  obraSocial: z.string().trim().min(1).max(120).optional(),
});

export type PacientesListQuery = z.infer<typeof pacientesListQuerySchema>;

export type PacienteCreateBody = z.infer<typeof pacienteCreateBodySchema>;
