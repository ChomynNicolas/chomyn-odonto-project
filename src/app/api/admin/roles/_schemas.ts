// src/app/api/admin/roles/_schemas.ts
/**
 * Schemas de validación para endpoints de roles
 */

import { z } from "zod"

// Schema para respuesta de roles (read-only, no hay query params complejos)
export const RoleListItemSchema = z.object({
  idRol: z.number().int().positive(),
  nombreRol: z.enum(["ADMIN", "ODONT", "RECEP"]),
  userCount: z.number().int().nonnegative(),
})

export type RoleListItem = z.infer<typeof RoleListItemSchema>

