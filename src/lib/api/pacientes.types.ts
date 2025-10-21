import { z } from "zod";

export const zContacto = z.object({
  tipo: z.enum(["PHONE", "EMAIL"]),
  valorNorm: z.string(),
  esPrincipal: z.boolean().optional(),
  activo: z.boolean().optional(),
});

export const zDocumento = z.object({
  tipo: z.string(),
  numero: z.string(),
  ruc: z.string().nullable().optional(),
});

export const zPersona = z.object({
  idPersona: z.number(),
  nombres: z.string().nullable().optional(),
  apellidos: z.string().nullable().optional(),
  genero: z.string().nullable().optional(),
  documento: zDocumento.nullable().optional(),
  contactos: z.array(zContacto).default([]),
});

export const zPacienteItem = z.object({
  idPaciente: z.number(),
  estaActivo: z.boolean().optional(),
  persona: zPersona,
});

export const zPacientesResponse = z.object({
  items: z.array(zPacienteItem),
  nextCursor: z.string().nullable(),
});

export type PacienteItem = z.infer<typeof zPacienteItem>;
export type PacientesResponse = z.infer<typeof zPacientesResponse>;
