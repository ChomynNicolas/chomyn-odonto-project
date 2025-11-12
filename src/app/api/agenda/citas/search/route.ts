// src/app/api/agenda/citas/search/route.ts
import type { NextRequest } from "next/server"
import { requireSessionWithRoles } from "@/app/api/_lib/auth"
import { ok, errors } from "@/app/api/_http"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import type { EstadoCita, Prisma } from "@prisma/client"

/**
 * Endpoint de búsqueda rápida de citas
 * Optimizado para autocompletado y búsqueda rápida
 */
const searchSchema = z.object({
  q: z.string().trim().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  estado: z.string().optional(),
  desde: z.string().datetime().optional(),
  hasta: z.string().datetime().optional(),
})

export async function GET(req: NextRequest) {
  try {
    // RBAC: Todos los roles pueden buscar citas
    const auth = await requireSessionWithRoles(req, ["RECEP", "ODONT", "ADMIN"])
    if (!auth.authorized) {
      return errors.forbidden("No autorizado")
    }

    const url = new URL(req.url)
    const query = Object.fromEntries(url.searchParams.entries())
    const parsed = searchSchema.safeParse(query)

    if (!parsed.success) {
      return errors.validation("Parámetros inválidos")
    }

    const { q, limit, estado, desde, hasta } = parsed.data
    const searchTerm = q.trim()
    const isDocQuery = /^\d{4,}$/.test(searchTerm)

    const where: Prisma.CitaWhereInput = {
      OR: [
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
      ],
    }

    // Si es búsqueda por documento, priorizar
    if (isDocQuery && where.OR) {
      const docQuery: Prisma.CitaWhereInput = {
        paciente: {
          persona: {
            documento: {
              numero: { contains: searchTerm, mode: "insensitive" },
            },
          },
        },
      }
      // Filtrar elementos que ya tienen búsqueda por documento para evitar duplicados
      const otherQueries = where.OR.filter((o) => {
        if (typeof o !== "object" || o === null) return true
        const hasDocQuery = "paciente" in o && 
          typeof o.paciente === "object" && o.paciente !== null &&
          "persona" in o.paciente &&
          typeof o.paciente.persona === "object" && o.paciente.persona !== null &&
          "documento" in o.paciente.persona
        return !hasDocQuery
      }) as Prisma.CitaWhereInput[]
      where.OR = [docQuery, ...otherQueries]
    }

    // Filtros adicionales
    if (estado) {
      const estados = estado.split(",").map((s) => s.trim().toUpperCase())
      where.estado = { in: estados as EstadoCita[] }
    }

    if (desde || hasta) {
      where.inicio = {}
      if (desde) where.inicio.gte = new Date(desde)
      if (hasta) where.inicio.lte = new Date(hasta)
    }

    const citas = await prisma.cita.findMany({
      where,
      take: limit,
      orderBy: { inicio: "desc" },
      select: {
        idCita: true,
        inicio: true,
        fin: true,
        tipo: true,
        estado: true,
        motivo: true,
        paciente: {
          select: {
            idPaciente: true,
            persona: {
              select: {
                nombres: true,
                apellidos: true,
                documento: {
                  select: {
                    tipo: true,
                    numero: true,
                  },
                },
              },
            },
          },
        },
        profesional: {
          select: {
            idProfesional: true,
            persona: {
              select: {
                nombres: true,
                apellidos: true,
              },
            },
          },
        },
        consultorio: {
          select: {
            idConsultorio: true,
            nombre: true,
            colorHex: true,
          },
        },
      },
    })

    const data = citas.map((c) => ({
      idCita: c.idCita,
      inicio: c.inicio.toISOString(),
      fin: c.fin.toISOString(),
      tipo: c.tipo,
      estado: c.estado,
      motivo: c.motivo,
      paciente: {
        id: c.paciente.idPaciente,
        nombre: `${c.paciente.persona.nombres} ${c.paciente.persona.apellidos}`.trim(),
        documento: c.paciente.persona.documento
          ? `${c.paciente.persona.documento.tipo} ${c.paciente.persona.documento.numero}`
          : null,
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

    return ok({
      items: data,
      count: data.length,
      hasMore: data.length === limit,
    })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[GET /api/agenda/citas/search]", e)
    return errors.internal(errorMessage ?? "Error al buscar citas")
  }
}

