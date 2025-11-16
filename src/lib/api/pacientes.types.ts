import { z } from "zod"


// ============= Sort & Pagination =============
export const SortPacientesSchema = z.enum(["createdAt_asc", "createdAt_desc", "nombre_asc", "nombre_desc"])
export type SortPacientes = z.infer<typeof SortPacientesSchema>

export interface PacienteListFilters {
  q?: string
  createdFrom?: string // ISO date
  createdTo?: string // ISO date
  estaActivo?: boolean
  sort?: SortPacientes
  cursor?: string
  limit?: number
}

// ============= List Item DTO =============
export interface PacienteListItemDTO {
  idPaciente: number
  personaId: number
  nombres: string
  apellidos: string
  nombreCompleto: string
  fechaNacimiento: string | null
  edad: number | null
  genero: string | null
  documento: {
    tipo: string
    numero: string
  } | null
  contactoPrincipal: {
    tipo: "PHONE" | "EMAIL"
    valor: string
    whatsappCapaz?: boolean
  } | null
  estaActivo: boolean
  createdAt: string
  proximaCita: {
    idCita: number
    inicio: string
    tipo: string
    profesional: string
    esHoy: boolean
  } | null
}

// ============= PacienteItem (for legacy components) =============
// Tipo compatible con componentes que esperan estructura con `persona`
export interface PacienteItem {
  idPaciente: number
  estaActivo: boolean
  persona: {
    nombres: string
    apellidos: string
    fechaNacimiento: string | null
    genero: string | null
    documento: {
      numero: string
      ruc?: string | null
    } | null
    contactos: Array<{
      tipo: "PHONE" | "EMAIL"
      valorNorm: string
      activo: boolean
    }>
  }
}

export interface PacientesResponse {
  items: PacienteListItemDTO[]
  nextCursor: string | null
  hasMore: boolean
  total?: number
}

// ============= Zod Schema for API Response Validation =============
export const PacienteListItemDTOSchema = z.object({
  idPaciente: z.number().int().positive(),
  personaId: z.number().int().positive(),
  nombres: z.string(),
  apellidos: z.string(),
  nombreCompleto: z.string(),
  fechaNacimiento: z.string().nullable(),
  edad: z.number().int().nullable(),
  genero: z.string().nullable(),
  documento: z
    .object({
      tipo: z.string(),
      numero: z.string(),
    })
    .nullable(),
  contactoPrincipal: z
    .object({
      tipo: z.enum(["PHONE", "EMAIL"]),
      valor: z.string(),
      whatsappCapaz: z.boolean().optional(),
    })
    .nullable(),
  estaActivo: z.boolean(),
  createdAt: z.string(),
  proximaCita: z
    .object({
      idCita: z.number().int().positive(),
      inicio: z.string(),
      tipo: z.string(),
      profesional: z.string(),
      esHoy: z.boolean(),
    })
    .nullable(),
})

export const PacientesResponseSchema = z
  .object({
    items: z.array(PacienteListItemDTOSchema),
    nextCursor: z.union([z.string(), z.number(), z.null()]),
    hasMore: z.boolean(),
    totalCount: z.number().int().nonnegative().optional(),
    total: z.number().int().nonnegative().optional(),
  })
  .transform((data) => ({
    items: data.items,
    nextCursor: data.nextCursor === null ? null : String(data.nextCursor),
    hasMore: data.hasMore,
    total: data.total ?? data.totalCount,
  }))

export const zPacientesResponse = PacientesResponseSchema

// ============= Create DTO =============
export const PacienteCreateDTOSchema = z.object({
  nombres: z.string().min(1, "Nombres requeridos"),
  apellidos: z.string().min(1, "Apellidos requeridos"),
  fechaNacimiento: z.string().optional(),
  genero: z.enum(["MASCULINO", "FEMENINO", "OTRO", "NO_ESPECIFICADO"]).optional(),
  direccion: z.string().optional(),
  documento: z
    .object({
      tipo: z.enum(["CI", "DNI", "PASAPORTE", "RUC", "OTRO"]),
      numero: z.string().min(1),
      paisEmision: z.string().optional(),
    })
    .optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional(),
  notas: z.string().optional(),
})

export type PacienteCreateDTO = z.infer<typeof PacienteCreateDTOSchema>

export interface PacienteCreateResponse {
  idPaciente: number
  personaId: number
}
