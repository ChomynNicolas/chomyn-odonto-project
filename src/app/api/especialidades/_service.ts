// src/app/api/especialidades/_service.ts
/**
 * Servicio para obtener especialidades activas
 */

import { prisma } from "@/lib/prisma"

export interface EspecialidadListItem {
  idEspecialidad: number
  nombre: string
  descripcion: string | null
}

export async function listEspecialidades(): Promise<EspecialidadListItem[]> {
  const especialidades = await prisma.especialidad.findMany({
    where: {
      isActive: true,
    },
    select: {
      idEspecialidad: true,
      nombre: true,
      descripcion: true,
    },
    orderBy: {
      nombre: "asc",
    },
  })

  return especialidades
}

