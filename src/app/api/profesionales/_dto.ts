// src/app/api/profesionales/_dto.ts
/**
 * DTOs para respuestas de la API de profesionales
 */

export interface ProfesionalListItemDTO {
  idProfesional: number
  numeroLicencia: string | null
  estaActivo: boolean
  createdAt: string
  updatedAt: string
  // Datos de Persona
  persona: {
    idPersona: number
    nombres: string
    apellidos: string
    segundoApellido: string | null
  }
  // Datos de Usuario
  usuario: {
    idUsuario: number
    usuario: string
    email: string | null
    nombreApellido: string
  }
  // Especialidades
  especialidades: Array<{
    idEspecialidad: number
    nombre: string
  }>
  // Conteos de relaciones
  counts: {
    citas: number
    bloqueosAgenda: number
    consultas: number
  }
}

export interface ProfesionalDetailDTO extends ProfesionalListItemDTO {
  disponibilidad: {
    weekly?: {
      monday?: Array<{ start: string; end: string }>
      tuesday?: Array<{ start: string; end: string }>
      wednesday?: Array<{ start: string; end: string }>
      thursday?: Array<{ start: string; end: string }>
      friday?: Array<{ start: string; end: string }>
      saturday?: Array<{ start: string; end: string }>
      sunday?: Array<{ start: string; end: string }>
    }
    exceptions?: Array<{
      date: string
      timeRanges?: Array<{ start: string; end: string }>
      note?: string
    }>
    timezone?: string
  } | null
}

export interface PersonaSearchResultDTO {
  idPersona: number
  nombres: string
  apellidos: string
  segundoApellido: string | null
  documento?: {
    tipo: string
    numero: string
  } | null
  email?: string | null
  telefono?: string | null
}

export interface UsuarioSearchResultDTO {
  idUsuario: number
  usuario: string
  email: string | null
  nombreApellido: string
  estaActivo: boolean
  yaVinculado: boolean // Si ya tiene un Profesional asociado
}

