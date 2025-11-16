// src/app/api/agenda/citas/[id]/consulta/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { paramsSchema, updateConsultaResumenSchema } from "./_schemas"
import { getConsultaClinica, ensureConsulta, updateConsultaResumen } from "./_service"
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
            paciente: {
              include: {
                persona: {
                  include: {
                    contactos: {
                      where: { activo: true },
                      select: {
                        tipo: true,
                        valorNorm: true,
                        esPrincipal: true,
                      },
                    },
                  },
                },
              },
            },
            profesional: {
              include: {
                persona: true,
              },
            },
          },
        })
        
        if (!cita) return errors.notFound("Cita no encontrada")

        // Calcular edad del paciente
        const calcularEdad = (fechaNacimiento: Date | null): number | null => {
          if (!fechaNacimiento) return null
          const today = new Date()
          const birthDate = new Date(fechaNacimiento)
          let age = today.getFullYear() - birthDate.getFullYear()
          const monthDiff = today.getMonth() - birthDate.getMonth()
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--
          }
          return age
        }

        // Obtener teléfono principal del paciente
        const telefonoPrincipal = cita.paciente.persona.contactos?.find(
          (c) => c.tipo === "PHONE" && c.esPrincipal
        )?.valorNorm || null

        // Retornar estructura inicial con datos de la cita (consulta no existe aún)
        const initialData = {
          citaId,
          pacienteId: cita.pacienteId,
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
          paciente: {
            id: cita.pacienteId,
            nombres: cita.paciente.persona.nombres,
            apellidos: cita.paciente.persona.apellidos,
            fechaNacimiento: cita.paciente.persona.fechaNacimiento?.toISOString() ?? null,
            genero: cita.paciente.persona.genero,
            direccion: cita.paciente.persona.direccion,
            telefono: telefonoPrincipal,
            edad: calcularEdad(cita.paciente.persona.fechaNacimiento),
          },
          anamnesis: [],
          diagnosticos: [],
          procedimientos: [],
          medicaciones: [],
          adjuntos: [],
          odontograma: null,
          periodontograma: null,
          vitales: [],
          alergias: [],
          planTratamiento: null,
        }
        
        return ok(initialData)
      }
      
      return ok(consulta)
    } else if (CONSULTA_RBAC.canViewAdminData(rol)) {
      // RECEP: puede ver pero necesita formato ConsultaClinicaDTO con arrays vacíos
      const consulta = await getConsultaClinica(citaId)
      if (!consulta) {
        // Si no existe consulta, obtener datos básicos de la cita
        const cita = await prisma.cita.findUnique({
          where: { idCita: citaId },
          include: {
            paciente: {
              include: {
                persona: {
                  include: {
                    contactos: {
                      where: { activo: true },
                      select: {
                        tipo: true,
                        valorNorm: true,
                        esPrincipal: true,
                      },
                    },
                  },
                },
              },
            },
            profesional: {
              include: {
                persona: true,
              },
            },
          },
        })
        
        if (!cita) return errors.notFound("Cita no encontrada")

        // Calcular edad del paciente
        const calcularEdad = (fechaNacimiento: Date | null): number | null => {
          if (!fechaNacimiento) return null
          const today = new Date()
          const birthDate = new Date(fechaNacimiento)
          let age = today.getFullYear() - birthDate.getFullYear()
          const monthDiff = today.getMonth() - birthDate.getMonth()
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--
          }
          return age
        }

        // Obtener teléfono principal del paciente
        const telefonoPrincipal = cita.paciente.persona.contactos?.find(
          (c) => c.tipo === "PHONE" && c.esPrincipal
        )?.valorNorm || null

        // Retornar estructura ConsultaClinicaDTO con arrays vacíos para RECEP
        const recepData = {
          citaId,
          pacienteId: cita.pacienteId,
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
          paciente: {
            id: cita.pacienteId,
            nombres: cita.paciente.persona.nombres,
            apellidos: cita.paciente.persona.apellidos,
            fechaNacimiento: cita.paciente.persona.fechaNacimiento?.toISOString() ?? null,
            genero: cita.paciente.persona.genero,
            direccion: cita.paciente.persona.direccion,
            telefono: telefonoPrincipal,
            edad: calcularEdad(cita.paciente.persona.fechaNacimiento),
          },
          anamnesis: [], // RECEP no puede ver datos clínicos
          diagnosticos: [],
          procedimientos: [],
          medicaciones: [],
          adjuntos: [],
          odontograma: null,
          periodontograma: null,
          vitales: [], // RECEP no puede ver datos clínicos
          alergias: [], // RECEP no puede ver datos clínicos
          planTratamiento: null, // RECEP no puede ver datos clínicos
        }
        
        return ok(recepData)
      }
      // Si existe consulta, RECEP puede ver estructura pero con arrays vacíos (datos sensibles ocultos)
      // PERO mantener información del paciente (no es sensible clínicamente)
      const recepConsulta = {
        ...consulta,
        reason: null, // RECEP no puede ver datos clínicos
        diagnosis: null,
        clinicalNotes: null,
        anamnesis: [], // RECEP no puede ver datos clínicos
        diagnosticos: [],
        procedimientos: [],
        medicaciones: [],
        adjuntos: [],
        odontograma: null,
        periodontograma: null,
        vitales: [], // RECEP no puede ver datos clínicos
        alergias: [], // RECEP no puede ver datos clínicos
        planTratamiento: null, // RECEP no puede ver datos clínicos
        // Mantener información del paciente (ya está en consulta.paciente)
      }
      
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
    const userId = session.user.id ? Number.parseInt(session.user.id, 10) : 0
    const consulta = await ensureConsulta(citaId, cita.profesionalId, userId)

    return ok({ citaId: consulta.citaId, status: consulta.status })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[POST /api/agenda/citas/[id]/consulta]", e)
    return errors.internal(errorMessage ?? "Error al crear consulta")
  }
}

/**
 * PUT /api/agenda/citas/[id]/consulta
 * Actualiza el resumen de la consulta (reason, diagnosis, clinicalNotes)
 */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("ID de cita inválido")
    const { id: citaId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    // Solo ODONT y ADMIN pueden editar datos clínicos
    if (!CONSULTA_RBAC.canEditClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden editar datos clínicos")
    }

    // Validar body
    const body = await req.json()
    const validatedBody = updateConsultaResumenSchema.safeParse(body)
    if (!validatedBody.success) {
      const firstError = validatedBody.error.issues[0]
      const errorMessage = firstError?.message || "Datos inválidos"
      return errors.validation(errorMessage)
    }

    // Verificar que la cita existe
    const cita = await prisma.cita.findUnique({
      where: { idCita: citaId },
      include: {
        profesional: true,
      },
    })
    if (!cita) return errors.notFound("Cita no encontrada")

    // Asegurar que existe Consulta (crear si no existe)
    const userId = session.user.id ? Number.parseInt(session.user.id, 10) : 0
    await ensureConsulta(citaId, cita.profesionalId, userId)

    // Verificar que la consulta no esté finalizada
    const consultaExistente = await prisma.consulta.findUnique({
      where: { citaId },
      select: { status: true },
    })
    if (consultaExistente?.status === "FINAL") {
      return errors.forbidden("No se puede editar una consulta finalizada")
    }

    // Actualizar resumen
    await updateConsultaResumen(citaId, validatedBody.data)

    // Obtener consulta actualizada y retornar
    const consultaActualizada = await getConsultaClinica(citaId)
    if (!consultaActualizada) {
      return errors.notFound("Error al obtener consulta actualizada")
    }

    return ok(consultaActualizada)
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[PUT /api/agenda/citas/[id]/consulta]", e)
    return errors.internal(errorMessage ?? "Error al actualizar resumen de consulta")
  }
}

