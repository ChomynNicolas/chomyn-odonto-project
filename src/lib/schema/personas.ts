// src/lib/schemas/personas.ts
import { z } from "zod"
import { TipoDocumentoEnum } from "./paciente"

/** Query de búsqueda de personas (por nombre, CI/DNI o RUC) */
export const PersonaSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(120),
  limit: z.coerce.number().int().positive().max(50).default(10),
})
export type PersonaSearchQueryDTO = z.infer<typeof PersonaSearchQuerySchema>

/** Contacto resumido para UI */
export const PersonaContactoItemSchema = z.object({
  tipo: z.enum(["PHONE", "EMAIL"]),
  valor: z.string().trim(),
})
export type PersonaContactoItemDTO = z.infer<typeof PersonaContactoItemSchema>

/** Item de lista de personas para autocomplete */
export const PersonaListItemSchema = z.object({
  idPersona: z.number().int().positive(),
  nombreCompleto: z.string().trim(),
  fechaNacimiento: z.string().datetime().nullable().optional(),
  documento: z.object({
    tipo: TipoDocumentoEnum,
    numero: z.string().trim(),
    ruc: z.string().trim().optional().nullable(),
  }),
  contactos: z.array(PersonaContactoItemSchema).optional(),
})
export type PersonaListItemDTO = z.infer<typeof PersonaListItemSchema>
