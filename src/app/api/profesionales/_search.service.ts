// src/app/api/profesionales/_search.service.ts
/**
 * Servicios de búsqueda para wizard de creación de profesionales
 */

import { prisma } from "@/lib/prisma"
import type { PersonaSearchQuery, UsuarioSearchQuery } from "./_schemas"
import type { PersonaSearchResultDTO, UsuarioSearchResultDTO } from "./_dto"

/**
 * Búsqueda de Personas por nombre o documento
 */
export async function searchPersonas(query: PersonaSearchQuery): Promise<PersonaSearchResultDTO[]> {
  const { q, limit } = query
  const searchTerm = q.trim()

  // Construir condiciones de búsqueda
  const where = {
    OR: [
      // Búsqueda por nombres
      { nombres: { contains: searchTerm, mode: "insensitive" as const } },
      { apellidos: { contains: searchTerm, mode: "insensitive" as const } },
      // Búsqueda por documento
      { documento: { numero: { contains: searchTerm, mode: "insensitive" as const } } },
      { documento: { ruc: { contains: searchTerm, mode: "insensitive" as const } } },
    ],
  }

  const personas = await prisma.persona.findMany({
    where,
    take: limit,
    select: {
      idPersona: true,
      nombres: true,
      apellidos: true,
      segundoApellido: true,
      documento: {
        select: {
          tipo: true,
          numero: true,
        },
      },
      contactos: {
        where: {
          activo: true,
          esPrincipal: true,
        },
        select: {
          tipo: true,
          valorRaw: true,
        },
        take: 1,
      },
    },
    orderBy: [
      { nombres: "asc" },
      { apellidos: "asc" },
    ],
  })

  return personas.map((p) => ({
    idPersona: p.idPersona,
    nombres: p.nombres,
    apellidos: p.apellidos,
    segundoApellido: p.segundoApellido,
    documento: p.documento
      ? {
          tipo: p.documento.tipo,
          numero: p.documento.numero,
        }
      : null,
    email: p.contactos.find((c) => c.tipo === "EMAIL")?.valorRaw || null,
    telefono: p.contactos.find((c) => c.tipo === "PHONE")?.valorRaw || null,
  }))
}

/**
 * Búsqueda de Usuarios con rol ODONT que no estén ya vinculados a un Profesional
 */
export async function searchUsuariosODONT(
  query: UsuarioSearchQuery
): Promise<UsuarioSearchResultDTO[]> {
  const { q, limit } = query
  const searchTerm = q.trim()

  // Obtener IDs de usuarios ya vinculados
  const profesionalesVinculados = await prisma.profesional.findMany({
    select: { userId: true },
  })
  const userIdsVinculados = profesionalesVinculados.map((p) => p.userId)

  // Obtener rol ODONT
  const rolODONT = await prisma.rol.findUnique({
    where: { nombreRol: "ODONT" },
    select: { idRol: true },
  })

  if (!rolODONT) {
    return []
  }

  const usuarios = await prisma.usuario.findMany({
    where: {
      rolId: rolODONT.idRol,
      estaActivo: true,
      OR: [
        { usuario: { contains: searchTerm, mode: "insensitive" } },
        { nombreApellido: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
      ],
    },
    take: limit,
    select: {
      idUsuario: true,
      usuario: true,
      email: true,
      nombreApellido: true,
      estaActivo: true,
    },
    orderBy: [
      { nombreApellido: "asc" },
      { usuario: "asc" },
    ],
  })

  return usuarios.map((u) => ({
    idUsuario: u.idUsuario,
    usuario: u.usuario,
    email: u.email,
    nombreApellido: u.nombreApellido,
    estaActivo: u.estaActivo,
    yaVinculado: userIdsVinculados.includes(u.idUsuario),
  }))
}

