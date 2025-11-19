// src/app/api/admin/users/_schemas.ts
/**
 * Schemas de validación para endpoints de usuarios
 */

import { z } from "zod"

// Schema para query params de listado
export const UserListQuerySchema = z.object({
  // Filtros
  rolId: z.coerce.number().int().positive().optional(),
  estaActivo: z
    .string()
    .optional()
    .transform((val) => {
      if (val === "true") return true
      if (val === "false") return false
      return undefined
    }),
  search: z.string().min(1).max(200).optional(), // Búsqueda por nombre/usuario/email

  // Paginación
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().min(1).max(100).default(20),

  // Ordenamiento
  sortBy: z.enum(["usuario", "nombreApellido", "createdAt", "ultimoLoginAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
})

export type UserListQuery = z.infer<typeof UserListQuerySchema>

// Schema para creación de usuario
export const UserCreateBodySchema = z.object({
  usuario: z.string().min(1).max(100).toLowerCase().trim(),
  email: z.string().email().max(255).optional().nullable(),
  nombreApellido: z.string().min(1).max(255).trim(),
  rolId: z.number().int().positive(),
  password: z.string().min(8).max(100),
})

export type UserCreateBody = z.infer<typeof UserCreateBodySchema>

// Schema para actualización de usuario
export const UserUpdateBodySchema = z.object({
  usuario: z.string().min(1).max(100).toLowerCase().trim().optional(),
  email: z.string().email().max(255).optional().nullable(),
  nombreApellido: z.string().min(1).max(255).trim().optional(),
  rolId: z.number().int().positive().optional(),
  estaActivo: z.boolean().optional(),
})

export type UserUpdateBody = z.infer<typeof UserUpdateBodySchema>

// Schema para reset de contraseña
export const PasswordResetBodySchema = z.object({
  tipo: z.enum(["temporary", "reset_link"]),
  motivo: z.string().max(500).optional(),
})

export type PasswordResetBody = z.infer<typeof PasswordResetBodySchema>

