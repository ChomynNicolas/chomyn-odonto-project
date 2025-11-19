// src/app/api/profesionales/_service.ts
/**
 * Servicio para gestión de profesionales
 */

import { prisma } from "@/lib/prisma"
import type {
  ProfesionalListQuery,
  ProfesionalCreateBody,
  ProfesionalUpdateBody,
  DisponibilidadUpdateBody,
  ToggleActivoBody,
} from "./_schemas"
import type { ProfesionalListItemDTO, ProfesionalDetailDTO } from "./_dto"
import { validateUsuarioODONT, validateUniqueness } from "./_security"
import { safeAuditWrite } from "@/lib/audit/log"
import { AuditAction, AuditEntity } from "@/lib/audit/actions"
import type { Prisma } from "@prisma/client"

/**
 * Lista profesionales con filtros, paginación y búsqueda
 */
export async function listProfesionales(filters: ProfesionalListQuery) {
  const { page, limit, estaActivo, especialidadId, search, sortBy, sortOrder } = filters
  const skip = (page - 1) * limit

  const where: Prisma.ProfesionalWhereInput = {}

  if (estaActivo !== undefined) {
    where.estaActivo = estaActivo
  }

  if (especialidadId) {
    where.especialidades = {
      some: {
        especialidadId,
      },
    }
  }

  if (search) {
    where.OR = [
      { numeroLicencia: { contains: search, mode: "insensitive" } },
      { persona: { nombres: { contains: search, mode: "insensitive" } } },
      { persona: { apellidos: { contains: search, mode: "insensitive" } } },
      { usuario: { usuario: { contains: search, mode: "insensitive" } } },
      { usuario: { nombreApellido: { contains: search, mode: "insensitive" } } },
    ]
  }

  const [data, total] = await Promise.all([
    prisma.profesional.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        ...(sortBy === "nombre"
          ? { persona: { nombres: sortOrder } }
          : sortBy === "numeroLicencia"
            ? { numeroLicencia: sortOrder }
            : { createdAt: sortOrder }),
      },
      select: {
        idProfesional: true,
        numeroLicencia: true,
        estaActivo: true,
        createdAt: true,
        updatedAt: true,
        persona: {
          select: {
            idPersona: true,
            nombres: true,
            apellidos: true,
            segundoApellido: true,
          },
        },
        usuario: {
          select: {
            idUsuario: true,
            usuario: true,
            email: true,
            nombreApellido: true,
          },
        },
        especialidades: {
          select: {
            especialidad: {
              select: {
                idEspecialidad: true,
                nombre: true,
              },
            },
          },
        },
        _count: {
          select: {
            Cita: true,
            BloqueoAgenda: true,
            Consulta: true,
          },
        },
      },
    }),
    prisma.profesional.count({ where }),
  ])

  // Convertir a DTOs y serializar fechas
  const serializedData: ProfesionalListItemDTO[] = data.map((prof) => ({
    idProfesional: prof.idProfesional,
    numeroLicencia: prof.numeroLicencia,
    estaActivo: prof.estaActivo,
    createdAt: prof.createdAt.toISOString(),
    updatedAt: prof.updatedAt.toISOString(),
    persona: {
      idPersona: prof.persona.idPersona,
      nombres: prof.persona.nombres,
      apellidos: prof.persona.apellidos,
      segundoApellido: prof.persona.segundoApellido,
    },
    usuario: {
      idUsuario: prof.usuario.idUsuario,
      usuario: prof.usuario.usuario,
      email: prof.usuario.email,
      nombreApellido: prof.usuario.nombreApellido,
    },
    especialidades: prof.especialidades.map((e) => ({
      idEspecialidad: e.especialidad.idEspecialidad,
      nombre: e.especialidad.nombre,
    })),
    counts: {
      citas: prof._count.Cita,
      bloqueosAgenda: prof._count.BloqueoAgenda,
      consultas: prof._count.Consulta,
    },
  }))

  return {
    data: serializedData,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  }
}

/**
 * Obtiene un profesional por ID con información completa
 */
export async function getProfesionalById(id: number): Promise<ProfesionalDetailDTO | null> {
  const profesional = await prisma.profesional.findUnique({
    where: { idProfesional: id },
    select: {
      idProfesional: true,
      numeroLicencia: true,
      estaActivo: true,
      disponibilidad: true,
      createdAt: true,
      updatedAt: true,
      persona: {
        select: {
          idPersona: true,
          nombres: true,
          apellidos: true,
          segundoApellido: true,
        },
      },
      usuario: {
        select: {
          idUsuario: true,
          usuario: true,
          email: true,
          nombreApellido: true,
        },
      },
      especialidades: {
        select: {
          especialidad: {
            select: {
              idEspecialidad: true,
              nombre: true,
            },
          },
        },
      },
      _count: {
        select: {
          Cita: true,
          BloqueoAgenda: true,
          Consulta: true,
        },
      },
    },
  })

  if (!profesional) {
    return null
  }

  return {
    idProfesional: profesional.idProfesional,
    numeroLicencia: profesional.numeroLicencia,
    estaActivo: profesional.estaActivo,
    createdAt: profesional.createdAt.toISOString(),
    updatedAt: profesional.updatedAt.toISOString(),
    persona: {
      idPersona: profesional.persona.idPersona,
      nombres: profesional.persona.nombres,
      apellidos: profesional.persona.apellidos,
      segundoApellido: profesional.persona.segundoApellido,
    },
    usuario: {
      idUsuario: profesional.usuario.idUsuario,
      usuario: profesional.usuario.usuario,
      email: profesional.usuario.email,
      nombreApellido: profesional.usuario.nombreApellido,
    },
    especialidades: profesional.especialidades.map((e) => ({
      idEspecialidad: e.especialidad.idEspecialidad,
      nombre: e.especialidad.nombre,
    })),
    counts: {
      citas: profesional._count.Cita,
      bloqueosAgenda: profesional._count.BloqueoAgenda,
      consultas: profesional._count.Consulta,
    },
    disponibilidad: profesional.disponibilidad as ProfesionalDetailDTO["disponibilidad"],
  }
}

/**
 * Crea un nuevo profesional
 */
export async function createProfesional(
  body: ProfesionalCreateBody,
  actorId: number,
  headers?: Headers,
  path?: string
) {
  // Validar que el usuario tiene rol ODONT
  const usuarioCheck = await validateUsuarioODONT(body.userId)
  if (!usuarioCheck.ok) {
    throw new Error(usuarioCheck.error || "Validación de usuario fallida")
  }

  // Validar unicidad
  const uniquenessCheck = await validateUniqueness(
    body.numeroLicencia || null,
    body.userId,
    body.personaId
  )
  if (!uniquenessCheck.ok) {
    throw new Error(uniquenessCheck.error || "Validación de unicidad fallida")
  }

  // Verificar que Persona existe
  const persona = await prisma.persona.findUnique({
    where: { idPersona: body.personaId },
  })
  if (!persona) {
    throw new Error("Persona no encontrada")
  }

  // Crear profesional con especialidades en transacción
  const profesional = await prisma.$transaction(async (tx) => {
    const nuevoProfesional = await tx.profesional.create({
      data: {
        userId: body.userId,
        personaId: body.personaId,
        numeroLicencia: body.numeroLicencia || null,
        estaActivo: body.estaActivo ?? true,
        disponibilidad: body.disponibilidad
          ? (body.disponibilidad as Prisma.InputJsonValue)
          : null,
      },
      select: {
        idProfesional: true,
        numeroLicencia: true,
        estaActivo: true,
        createdAt: true,
        updatedAt: true,
        persona: {
          select: {
            nombres: true,
            apellidos: true,
          },
        },
        usuario: {
          select: {
            usuario: true,
            email: true,
          },
        },
      },
    })

    // Crear relaciones con especialidades
    if (body.especialidadIds && body.especialidadIds.length > 0) {
      await tx.profesionalEspecialidad.createMany({
        data: body.especialidadIds.map((especialidadId) => ({
          profesionalId: nuevoProfesional.idProfesional,
          especialidadId,
        })),
      })
    }

    return nuevoProfesional
  })

  // Log de auditoría
  await safeAuditWrite({
    actorId,
    action: AuditAction.PROFESIONAL_CREATE,
    entity: AuditEntity.Profesional,
    entityId: profesional.idProfesional,
    metadata: {
      numeroLicencia: profesional.numeroLicencia,
      personaId: body.personaId,
      userId: body.userId,
      especialidadIds: body.especialidadIds,
    },
    headers,
    path,
  })

  return profesional
}

/**
 * Actualiza un profesional existente
 */
export async function updateProfesional(
  id: number,
  body: ProfesionalUpdateBody,
  actorId: number,
  headers?: Headers,
  path?: string
) {
  // Obtener profesional actual para comparar cambios
  const currentProfesional = await prisma.profesional.findUnique({
    where: { idProfesional: id },
    include: {
      especialidades: {
        select: {
          especialidadId: true,
        },
      },
    },
  })

  if (!currentProfesional) {
    throw new Error("Profesional no encontrado")
  }

  // Validar unicidad si se está cambiando numeroLicencia
  if (body.numeroLicencia !== undefined && body.numeroLicencia !== currentProfesional.numeroLicencia) {
    const uniquenessCheck = await validateUniqueness(
      body.numeroLicencia || null,
      currentProfesional.userId,
      currentProfesional.personaId,
      id
    )
    if (!uniquenessCheck.ok) {
      throw new Error(uniquenessCheck.error || "Validación de unicidad fallida")
    }
  }

  // Preparar datos de actualización
  const updateData: Prisma.ProfesionalUpdateInput = {}
  if (body.numeroLicencia !== undefined) updateData.numeroLicencia = body.numeroLicencia
  if (body.estaActivo !== undefined) updateData.estaActivo = body.estaActivo
  if (body.disponibilidad !== undefined) {
    updateData.disponibilidad = body.disponibilidad
      ? (body.disponibilidad as Prisma.InputJsonValue)
      : null
  }

  // Actualizar profesional y especialidades en transacción
  const updatedProfesional = await prisma.$transaction(async (tx) => {
    // Actualizar profesional
    const prof = await tx.profesional.update({
      where: { idProfesional: id },
      data: updateData,
      select: {
        idProfesional: true,
        numeroLicencia: true,
        estaActivo: true,
        disponibilidad: true,
        createdAt: true,
        updatedAt: true,
        persona: {
          select: {
            nombres: true,
            apellidos: true,
          },
        },
        usuario: {
          select: {
            usuario: true,
            email: true,
          },
        },
      },
    })

    // Sincronizar especialidades si se proporcionan
    if (body.especialidadIds !== undefined) {
      const currentEspecialidadIds = currentProfesional.especialidades.map((e) => e.especialidadId)
      const newEspecialidadIds = body.especialidadIds

      // Eliminar las que ya no están
      const toRemove = currentEspecialidadIds.filter((id) => !newEspecialidadIds.includes(id))
      if (toRemove.length > 0) {
        await tx.profesionalEspecialidad.deleteMany({
          where: {
            profesionalId: id,
            especialidadId: { in: toRemove },
          },
        })
      }

      // Agregar las nuevas
      const toAdd = newEspecialidadIds.filter((id) => !currentEspecialidadIds.includes(id))
      if (toAdd.length > 0) {
        await tx.profesionalEspecialidad.createMany({
          data: toAdd.map((especialidadId) => ({
            profesionalId: id,
            especialidadId,
          })),
        })
      }
    }

    return prof
  })

  // Determinar tipo de acción para audit log
  const metadata: Record<string, unknown> = {
    changes: {},
  }

  if (body.numeroLicencia !== undefined && body.numeroLicencia !== currentProfesional.numeroLicencia) {
    metadata.changes = {
      numeroLicencia: { old: currentProfesional.numeroLicencia, new: body.numeroLicencia },
    }
  }

  if (body.estaActivo !== undefined && body.estaActivo !== currentProfesional.estaActivo) {
    metadata.changes = {
      ...metadata.changes,
      estaActivo: { old: currentProfesional.estaActivo, new: body.estaActivo },
    }
  }

  if (body.especialidadIds !== undefined) {
    const currentIds = currentProfesional.especialidades.map((e) => e.especialidadId)
    const added = body.especialidadIds.filter((id) => !currentIds.includes(id))
    const removed = currentIds.filter((id) => !body.especialidadIds.includes(id))

    if (added.length > 0 || removed.length > 0) {
      metadata.changes = {
        ...metadata.changes,
        especialidades: { added, removed },
      }
    }
  }

  // Log de auditoría
  await safeAuditWrite({
    actorId,
    action: AuditAction.PROFESIONAL_UPDATE,
    entity: AuditEntity.Profesional,
    entityId: id,
    metadata,
    headers,
    path,
  })

  return updatedProfesional
}

/**
 * Actualiza solo la disponibilidad de un profesional
 */
export async function updateAvailability(
  id: number,
  body: DisponibilidadUpdateBody,
  actorId: number,
  headers?: Headers,
  path?: string
) {
  const profesional = await prisma.profesional.findUnique({
    where: { idProfesional: id },
    select: {
      idProfesional: true,
      disponibilidad: true,
    },
  })

  if (!profesional) {
    throw new Error("Profesional no encontrado")
  }

  const updatedProfesional = await prisma.profesional.update({
    where: { idProfesional: id },
    data: {
      disponibilidad: body.disponibilidad as Prisma.InputJsonValue,
    },
    select: {
      idProfesional: true,
      disponibilidad: true,
    },
  })

  // Log de auditoría específico para disponibilidad
  await safeAuditWrite({
    actorId,
    action: AuditAction.PROFESIONAL_UPDATE_AVAILABILITY,
    entity: AuditEntity.Profesional,
    entityId: id,
    metadata: {
      previous: profesional.disponibilidad,
      new: body.disponibilidad,
    },
    headers,
    path,
  })

  return updatedProfesional
}

/**
 * Activa o desactiva un profesional (soft delete)
 */
export async function toggleActivo(
  id: number,
  body: ToggleActivoBody,
  actorId: number,
  headers?: Headers,
  path?: string
) {
  const profesional = await prisma.profesional.findUnique({
    where: { idProfesional: id },
    select: {
      idProfesional: true,
      estaActivo: true,
    },
  })

  if (!profesional) {
    throw new Error("Profesional no encontrado")
  }

  const updatedProfesional = await prisma.profesional.update({
    where: { idProfesional: id },
    data: {
      estaActivo: body.estaActivo,
    },
    select: {
      idProfesional: true,
      estaActivo: true,
      persona: {
        select: {
          nombres: true,
          apellidos: true,
        },
      },
    },
  })

  // Log de auditoría
  const auditAction = body.estaActivo
    ? AuditAction.PROFESIONAL_ACTIVATE
    : AuditAction.PROFESIONAL_DEACTIVATE

  await safeAuditWrite({
    actorId,
    action: auditAction,
    entity: AuditEntity.Profesional,
    entityId: id,
    metadata: {
      previous: profesional.estaActivo,
      new: body.estaActivo,
    },
    headers,
    path,
  })

  return updatedProfesional
}

