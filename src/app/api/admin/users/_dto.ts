// src/app/api/admin/users/_dto.ts
/**
 * DTOs para respuestas de la API de usuarios
 */

export interface UserListItemDTO {
  idUsuario: number
  usuario: string
  email: string | null
  nombreApellido: string
  rolId: number
  estaActivo: boolean
  createdAt: Date
  updatedAt: Date
  ultimoLoginAt: Date | null
  rol: {
    nombreRol: string
  }
  profesional?: {
    idProfesional: number
  } | null
}

export interface UserDetailDTO extends UserListItemDTO {
  rol: {
    idRol: number
    nombreRol: string
  }
}

