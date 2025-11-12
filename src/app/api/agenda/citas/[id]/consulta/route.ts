// src/app/api/agenda/citas/[id]/consulta/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { paramsSchema } from "./_schemas"
import { getConsultaClinica, ensureConsulta } from "./_service"
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
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    // Verificar que la cita existe
    const cita = await prisma.cita.findUnique({
      where: { idCita: citaId },
      select: { 
        idCita: true,
        estado: true,
        inicio: true,
        fin: true,
      },
    })
    if (!cita) return errors.notFound("Cita no encontrada")

    // RBAC: ODONT/ADMIN ven datos clínicos completos, RECEP solo administrativos
    // PERO: El componente frontend siempre espera ConsultaClinicaDTO, así que siempre retornamos ese formato
    if (CONSULTA_RBAC.canViewClinicalData(rol)) {
      // ODONT/ADMIN: datos clínicos completos
      const consulta = await getConsultaClinica(citaId)
      if (!consulta) {
        // Si no existe consulta, obtener datos de la cita para construir respuesta inicial
        const cita = await prisma.cita.findUnique({
          where: { idCita: citaId },
          include: {
            profesional: {
              include: {
                persona: true,
              },
            },
          },
        })
        
        if (!cita) return errors.notFound("Cita no encontrada")

        // Retornar estructura inicial con datos de la cita (consulta no existe aún)
        const initialData = {
          citaId,
          status: "DRAFT" as const,
          startedAt: null,
          finishedAt: null,
          reason: null,
          diagnosis: null,
          clinicalNotes: null,
          performedBy: {
            id: cita.profesionalId,
            nombre: `${cita.profesional.persona.nombres} ${cita.profesional.persona.apellidos}`.trim(),
          },
          createdAt: null, // null indica que la consulta no existe aún
          updatedAt: null,
          citaEstado: cita.estado,
          citaInicio: cita.inicio.toISOString(),
          citaFin: cita.fin.toISOString(),
          anamnesis: [],
          diagnosticos: [],
          procedimientos: [],
          medicaciones: [],
          adjuntos: [],
          odontograma: null,
          periodontograma: null,
        }
        
        console.log("[GET /consulta] Retornando estructura inicial (sin consulta):", {
          citaId,
          rol,
          hasConsulta: false,
        })
        
        return ok(initialData)
      }
      
      console.log("[GET /consulta] Retornando consulta clínica completa:", {
        citaId,
        rol,
        hasConsulta: true,
        anamnesisCount: consulta.anamnesis?.length || 0,
        diagnosticosCount: consulta.diagnosticos?.length || 0,
        anamnesis: consulta.anamnesis?.map(a => ({ id: a.id, title: a.title })) || [],
      })
      
      return ok(consulta)
    } else if (CONSULTA_RBAC.canViewAdminData(rol)) {
      // RECEP: puede ver pero necesita formato ConsultaClinicaDTO con arrays vacíos
      const consulta = await getConsultaClinica(citaId)
      if (!consulta) {
        // Si no existe consulta, obtener datos básicos de la cita
        const cita = await prisma.cita.findUnique({
          where: { idCita: citaId },
          include: {
            profesional: {
              include: {
                persona: true,
              },
            },
          },
        })
        
        if (!cita) return errors.notFound("Cita no encontrada")

        // Retornar estructura ConsultaClinicaDTO con arrays vacíos para RECEP
        const recepData = {
          citaId,
          status: "DRAFT" as const,
          startedAt: null,
          finishedAt: null,
          reason: null,
          diagnosis: null,
          clinicalNotes: null,
          performedBy: {
            id: cita.profesionalId,
            nombre: `${cita.profesional.persona.nombres} ${cita.profesional.persona.apellidos}`.trim(),
          },
          createdAt: null,
          updatedAt: null,
          citaEstado: cita.estado,
          citaInicio: cita.inicio.toISOString(),
          citaFin: cita.fin.toISOString(),
          anamnesis: [], // RECEP no puede ver datos clínicos
          diagnosticos: [],
          procedimientos: [],
          medicaciones: [],
          adjuntos: [],
          odontograma: null,
          periodontograma: null,
        }
        
        console.log("[GET /consulta] Retornando estructura inicial para RECEP (sin consulta):", {
          citaId,
          rol,
          hasConsulta: false,
        })
        
        return ok(recepData)
      }
      // Si existe consulta, RECEP puede ver estructura pero con arrays vacíos (datos sensibles ocultos)
      const recepConsulta = {
        ...consulta,
        anamnesis: [], // RECEP no puede ver datos clínicos
        diagnosticos: [],
        procedimientos: [],
        medicaciones: [],
        adjuntos: [],
        odontograma: null,
        periodontograma: null,
      }
      
      console.log("[GET /consulta] Retornando consulta para RECEP (datos clínicos ocultos):", {
        citaId,
        rol,
        hasConsulta: true,
      })
      
      return ok(recepConsulta)
    }

    return errors.forbidden("No tiene permisos para ver esta consulta")
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[GET /api/agenda/citas/[id]/consulta]", e)
    return errors.internal(errorMessage ?? "Error al obtener consulta")
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
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

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
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[POST /api/agenda/citas/[id]/consulta]", e)
    return errors.internal(errorMessage ?? "Error al crear consulta")
  }
}

