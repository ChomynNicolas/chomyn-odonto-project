// ============================================================================
// SERVICE - Crear Cita
// ============================================================================

import { PrismaClient } from "@prisma/client"
import type { CreateCitaBody } from "./_create.schema"

const prisma = new PrismaClient()

export async function createCita(body: CreateCitaBody & { createdByUserId: number }): Promise<{
  ok: boolean
  data?: any
  error?: string
  status: number
}> {
  try {
    const inicio = new Date(body.inicio)
    const fin = new Date(inicio.getTime() + body.duracionMinutos * 60000)

    // Validación básica: no crear citas en el pasado
    if (inicio < new Date()) {
      return {
        ok: false,
        error: "NO_PAST_APPOINTMENTS",
        status: 400,
      }
    }

    // Crear cita
    const cita = await prisma.cita.create({
      data: {
        pacienteId: body.pacienteId,
        profesionalId: body.profesionalId,
        consultorioId: body.consultorioId ?? null,
        inicio,
        fin,
        duracionMinutos: body.duracionMinutos,
        tipo: body.tipo,
        estado: "SCHEDULED",
        motivo: body.motivo,
        notas: body.notas ?? null,
        creadoPorId: body.createdByUserId,
      },
      select: {
        idCita: true,
        inicio: true,
        fin: true,
        tipo: true,
        estado: true,
        motivo: true,
      },
    })

    return {
      ok: true,
      data: {
        idCita: cita.idCita,
        inicio: cita.inicio.toISOString(),
        fin: cita.fin.toISOString(),
        tipo: cita.tipo,
        estado: cita.estado,
        motivo: cita.motivo,
      },
      status: 201,
    }
  } catch (e: any) {
    console.error("createCita error:", e?.code || e?.message)
    return {
      ok: false,
      error: "INTERNAL_ERROR",
      status: 500,
    }
  }
}
