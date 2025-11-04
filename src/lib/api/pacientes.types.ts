import { z } from "zod"

export {
  PacienteUpdateDTOSchema,
  PacienteListFiltersSchema,
} from "@/app/api/pacientes/_schemas"


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

export interface PacientesResponse {
  items: PacienteListItemDTO[]
  nextCursor: string | null
  hasMore: boolean
  total?: number
}

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
