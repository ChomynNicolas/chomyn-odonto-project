// ============================================================================
// SERVICE - Listar Citas (con filtros)
// ============================================================================

import { PrismaClient, type EstadoCita, type TipoCita } from "@prisma/client"
import type { Prisma } from "@prisma/client"
import type { GetCitasQuery } from "./_schemas"

const prisma = new PrismaClient()

export async function listCitas(query: GetCitasQuery, page: number, limit: number, skip: number) {
  const where: Prisma.CitaWhereInput = {}

  if (query.profesionalId) where.profesionalId = query.profesionalId
  if (query.consultorioId) where.consultorioId = query.consultorioId
  if (query.pacienteId) where.pacienteId = query.pacienteId

  if (query.estado) {
    const estados = query.estado.split(",").map((s) => s.trim().toUpperCase())
    where.estado = { in: estados as EstadoCita[] }
  }

  if (query.tipo) {
    const tipos = query.tipo.split(",").map((t) => t.trim().toUpperCase())
    where.tipo = { in: tipos as TipoCita[] }
  }

  if (query.desde || query.hasta) {
    where.inicio = {}
    if (query.desde) where.inicio.gte = new Date(query.desde)
    if (query.hasta) where.inicio.lte = new Date(query.hasta)
  }

  // Búsqueda por texto (nombre de paciente, cédula, motivo, etc.)
  if (query.q && query.q.trim()) {
    const searchTerm = query.q.trim()
    const isDocQuery = /^\d{4,}$/.test(searchTerm) // Si es solo números, probablemente es cédula

    where.OR = [
      // Búsqueda por nombre de paciente
      {
        paciente: {
          persona: {
            OR: [
              { nombres: { contains: searchTerm, mode: "insensitive" } },
              { apellidos: { contains: searchTerm, mode: "insensitive" } },
            ],
          },
        },
      },
      // Búsqueda por cédula/documento
      {
        paciente: {
          persona: {
            documento: {
              numero: { contains: searchTerm, mode: "insensitive" },
            },
          },
        },
      },
      // Búsqueda por motivo
      {
        motivo: { contains: searchTerm, mode: "insensitive" },
      },
      // Búsqueda por nombre de profesional
      {
        profesional: {
          persona: {
            OR: [
              { nombres: { contains: searchTerm, mode: "insensitive" } },
              { apellidos: { contains: searchTerm, mode: "insensitive" } },
            ],
          },
        },
      },
    ]

    // Si es búsqueda por documento, priorizar ese filtro
    if (isDocQuery && where.OR) {
      const docQuery: Prisma.CitaWhereInput = {
        paciente: {
          persona: {
            documento: {
              numero: { contains: searchTerm, mode: "insensitive" },
            },
          },
        },
      };
      const otherQueries = where.OR.filter((o) => {
        if (typeof o !== "object" || o === null) return true;
        const hasDocQuery = "paciente" in o &&
          typeof o.paciente === "object" && o.paciente !== null &&
          "persona" in o.paciente &&
          typeof o.paciente.persona === "object" && o.paciente.persona !== null &&
          "documento" in o.paciente.persona;
        return !hasDocQuery;
      }) as Prisma.CitaWhereInput[];
      where.OR = [docQuery, ...otherQueries];
    }
  }

  const [rows, total] = await Promise.all([
    prisma.cita.findMany({
      where,
      skip,
      take: limit,
      orderBy: { inicio: "asc" },
      select: {
        idCita: true,
        inicio: true,
        fin: true,
        tipo: true,
        duracionMinutos: true, // 👈 agrega esto
        estado: true,
        motivo: true,
        profesional: {
          select: {
            idProfesional: true,
            persona: { select: { nombres: true, apellidos: true } },
          },
        },
        paciente: {
          select: {
            idPaciente: true,
            persona: { select: { nombres: true, apellidos: true } },
          },
        },
        consultorio: {
          select: { idConsultorio: true, nombre: true, colorHex: true },
        },
      },
    }),
    prisma.cita.count({ where }),
  ])

  const data = rows.map((c) => ({
    idCita: c.idCita,
    inicio: c.inicio.toISOString(),
    fin: c.fin.toISOString(),
    duracionMinutos: c.duracionMinutos, // 
    tipo: c.tipo,
    estado: c.estado,
    motivo: c.motivo,
    paciente: {
      id: c.paciente.idPaciente,
      nombre: `${c.paciente.persona.nombres} ${c.paciente.persona.apellidos}`.trim(),
    },
    profesional: {
      id: c.profesional.idProfesional,
      nombre: `${c.profesional.persona.nombres} ${c.profesional.persona.apellidos}`.trim(),
    },
    consultorio: c.consultorio
      ? {
          id: c.consultorio.idConsultorio,
          nombre: c.consultorio.nombre,
          colorHex: c.consultorio.colorHex,
        }
      : null,
  }))

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}
