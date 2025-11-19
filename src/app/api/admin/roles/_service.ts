// src/app/api/admin/roles/_service.ts
/**
 * Servicio para gestión de roles (read-only)
 */

import { prisma } from "@/lib/prisma"
import type { RoleListItem } from "./_schemas"

/**
 * Lista todos los roles con el conteo de usuarios por rol
 */
export async function listRoles(): Promise<RoleListItem[]> {
  const roles = await prisma.rol.findMany({
    include: {
      usuarios: {
        where: {
          estaActivo: true,
        },
        select: {
          idUsuario: true,
        },
      },
    },
    orderBy: {
      idRol: "asc",
    },
  })

  return roles.map((rol) => ({
    idRol: rol.idRol,
    nombreRol: rol.nombreRol,
    userCount: rol.usuarios.length,
  }))
}

