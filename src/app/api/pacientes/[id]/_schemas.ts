// src/app/api/pacientes/[id]/_schemas.ts
import { z } from "zod";
import { GeneroEnum } from "@/app/api/pacientes/_schemas"; // ya definido en el feature padre

export const pathParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).transform((v) => Number(v)),
});

export const pacienteUpdateBodySchema = z.object({
  nombreCompleto: z.string().min(3).max(160).optional(),
  genero: GeneroEnum.optional(),
  fechaNacimiento: z.coerce.date().nullable().optional(),
  domicilio: z.string().max(200).nullable().optional(),

  antecedentesMedicos: z.string().max(2000).nullable().optional(),
  alergias: z.string().max(1000).nullable().optional(),
  medicacion: z.string().max(1000).nullable().optional(),
  obraSocial: z.string().max(120).nullable().optional(),
  responsablePago: z
    .object({
      personaId: z.number().int().positive(),
      relacion: z.enum(["PADRE","MADRE","TUTOR","CONYUGE","FAMILIAR","OTRO"]),
      esPrincipal: z.boolean().optional(),
    })
    .optional(),
});

export const deleteQuerySchema = z.object({
  hard: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"), // default: false
});
export type DeleteQuery = z.infer<typeof deleteQuerySchema>;
export type PacienteUpdateBody = z.infer<typeof pacienteUpdateBodySchema>;
