// src/app/api/agenda/citas/[id]/consulta/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { paramsSchema } from "./_schemas"
import { getConsultaClinica, getConsultaAdmin, ensureConsulta } from "./_service"
import { CONSULTA_RBAC } from "./_rbac"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/agenda/citas/[id]/consulta
 * Obtiene la consulta clínica completa o resumen administrativo según el rol
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("ID de cita inválido")
    const { id: citaId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = ((session.user as any)?.rol ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    // Verificar que la cita existe
    const cita = await prisma.cita.findUnique({
      where: { idCita: citaId },
      select: { idCita: true },
    })
    if (!cita) return errors.notFound("Cita no encontrada")

    // RBAC: ODONT/ADMIN ven datos clínicos completos, RECEP solo administrativos
    if (CONSULTA_RBAC.canViewClinicalData(rol)) {
      const consulta = await getConsultaClinica(citaId)
      if (!consulta) {
        // Si no existe consulta, retornar estructura vacía
        return ok({
          citaId,
          status: "DRAFT" as const,
          startedAt: null,
          finishedAt: null,
          reason: null,
          diagnosis: null,
          clinicalNotes: null,
          performedBy: null,
          createdAt: null,
          updatedAt: null,
          anamnesis: [],
          diagnosticos: [],
          procedimientos: [],
          medicaciones: [],
          adjuntos: [],
          odontograma: null,
          periodontograma: null,
        })
      }
      return ok(consulta)
    } else if (CONSULTA_RBAC.canViewAdminData(rol)) {
      const consulta = await getConsultaAdmin(citaId)
      if (!consulta) return errors.notFound("Consulta no encontrada")
      return ok(consulta)
    }

    return errors.forbidden("No tiene permisos para ver esta consulta")
  } catch (e: any) {
    console.error("[GET /api/agenda/citas/[id]/consulta]", e)
    return errors.internal(e?.message ?? "Error al obtener consulta")
  }
}

/**
 * POST /api/agenda/citas/[id]/consulta
 * Crea una nueva consulta (si no existe) o inicializa el workspace
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("ID de cita inválido")
    const { id: citaId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = ((session.user as any)?.rol ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    // Solo ODONT y ADMIN pueden crear consultas
    if (!CONSULTA_RBAC.canEditClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden crear consultas clínicas")
    }

    // Verificar que la cita existe y obtener datos necesarios
    const cita = await prisma.cita.findUnique({
      where: { idCita: citaId },
      include: {
        profesional: true,
      },
    })
    if (!cita) return errors.notFound("Cita no encontrada")

    // Verificar que no existe ya una consulta
    const existe = await prisma.consulta.findUnique({
      where: { citaId },
      select: { citaId: true },
    })
    if (existe) {
      return errors.conflict("Ya existe una consulta para esta cita")
    }

    // Crear consulta
    const consulta = await ensureConsulta(citaId, cita.profesionalId, session.user.id)

    return ok({ citaId: consulta.citaId, status: consulta.status })
  } catch (e: any) {
    console.error("[POST /api/agenda/citas/[id]/consulta]", e)
    return errors.internal(e?.message ?? "Error al crear consulta")
  }
}

