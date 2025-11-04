// src/app/api/pacientes/[id]/route.ts
import type { NextRequest } from "next/server"
import { requireRole } from "@/app/api/pacientes/_rbac"
import { pathParamsSchema, pacienteUpdateBodySchema, deleteQuerySchema } from "./_schemas"
import { getPacienteFicha } from "./_service.get"
import { updatePaciente } from "./_service.update"
import { deletePacienteById, DeletePacienteError } from "./_service.delete"
import { prisma as db } from "@/lib/prisma"
import z from "zod"
import { ok, errors, generateETag, checkETag, checkRateLimit, safeLog } from "../_http"

const patchSchema = z.object({
  accion: z.enum(["INACTIVAR", "ACTIVAR"]),
  motivo: z.string().max(300).optional(),
})

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const gate = await requireRole(["ADMIN", "RECEP", "ODONT"])
  if (!gate.ok) return errors.forbidden()

  const requestId = crypto.randomUUID()

  try {
    const { id } = pathParamsSchema.parse(ctx.params)

    safeLog("info", "Fetching patient record", { requestId, pacienteId: id, userId: gate.userId })

    const ficha = await getPacienteFicha(id)
    if (!ficha) {
      safeLog("warn", "Patient not found", { requestId, pacienteId: id })
      return errors.notFound("Paciente no encontrado")
    }

    // Generate ETag
    const etag = generateETag(ficha)

    // Check If-None-Match header
    const ifNoneMatch = req.headers.get("If-None-Match")
    if (checkETag(ifNoneMatch, etag)) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "private, must-revalidate",
        },
      })
    }

    safeLog("info", "Patient record fetched successfully", { requestId, pacienteId: id })

    return new Response(JSON.stringify({ ok: true, data: ficha }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ETag: etag,
        "Cache-Control": "private, must-revalidate",
      },
    })
  } catch (e: any) {
    safeLog("error", "Error fetching patient record", { requestId, error: e?.message })
    if (e?.name === "ZodError") return errors.validation("Parámetros inválidos")
    return errors.internal(e?.message ?? "Error al obtener paciente")
  }
}

export async function PUT(req: NextRequest, ctx: { params: { id: string } }) {
  const gate = await requireRole(["ADMIN", "RECEP", "ODONT"])
  if (!gate.ok) return errors.forbidden()

  const requestId = crypto.randomUUID()

  // Rate limiting for mutations
  const rateLimitKey = `update:${gate.userId}`
  const rateLimit = checkRateLimit(rateLimitKey, 30, 60000) // 30 requests per minute
  if (!rateLimit.allowed) {
    safeLog("warn", "Rate limit exceeded", { requestId, userId: gate.userId })
    return errors.rateLimit()
  }

  try {
    const { id } = pathParamsSchema.parse(ctx.params)
    const body = pacienteUpdateBodySchema.parse(await req.json())

    // Check If-Match header for optimistic locking
    const ifMatch = req.headers.get("If-Match")
    if (ifMatch) {
      // Fetch current version to compare
      const current = await db.paciente.findUnique({
        where: { idPaciente: id },
        select: { updatedAt: true },
      })

      if (current) {
        const currentETag = generateETag({ updatedAt: current.updatedAt.toISOString() })
        if (!checkETag(ifMatch, currentETag)) {
          safeLog("warn", "Optimistic lock failed", { requestId, pacienteId: id })
          return errors.optimisticLock()
        }
      }
    }

    safeLog("info", "Updating patient", { requestId, pacienteId: id, userId: gate.userId })

    const result = await updatePaciente(id, body, gate.userId)

    safeLog("info", "Patient updated successfully", { requestId, pacienteId: id })

    return ok(result)
  } catch (e: any) {
    safeLog("error", "Error updating patient", { requestId, error: e?.message })
    if (e?.name === "ZodError") return errors.validation(e.issues?.[0]?.message ?? "Datos inválidos")
    if (e?.status === 404) return errors.notFound(e.message)
    if (e?.code === "P2002") return errors.conflict("Ya existe un registro con esos datos")
    return errors.internal(e?.message ?? "Error al actualizar paciente")
  }
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  const gate = await requireRole(["ADMIN", "RECEP", "ODONT"])
  if (!gate.ok) return errors.forbidden()

  const requestId = crypto.randomUUID()

  // Rate limiting for deletions
  const rateLimitKey = `delete:${gate.userId}`
  const rateLimit = checkRateLimit(rateLimitKey, 10, 60000) // 10 requests per minute
  if (!rateLimit.allowed) {
    safeLog("warn", "Rate limit exceeded for deletion", { requestId, userId: gate.userId })
    return errors.rateLimit()
  }

  try {
    const { id } = pathParamsSchema.parse(ctx.params)
    const query = deleteQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams))
    const role = gate.role!

    safeLog("info", "Deleting patient", { requestId, pacienteId: id, hard: query.hard, userId: gate.userId })

    const result = await deletePacienteById({
      pacienteId: id,
      role,
      hard: query.hard,
      alsoInactivatePersona: true,
    })

    safeLog("info", "Patient deleted successfully", { requestId, pacienteId: id, mode: result.mode })

    return ok({ mode: result.mode, result })
  } catch (e: any) {
    safeLog("error", "Error deleting patient", { requestId, error: e?.message })
    if (e?.name === "ZodError") return errors.validation("Parámetros inválidos")
    if (e instanceof DeletePacienteError)
      return errors.apiError?.(e.status, e.code, e.message) ?? errors.internal(e.message)
    if (e?.code === "P2003") return errors.fk("No se puede eliminar por restricciones de integridad")
    return errors.internal(e?.message ?? "Error al eliminar/inactivar paciente")
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const gate = await requireRole(["ADMIN", "RECEP"])
  if (!gate.ok) return errors.forbidden()

  const { id } = pathParamsSchema.parse(ctx.params)
  const idPaciente = Number(id)
  const body = patchSchema.parse(await req.json())

  try {
    const updated = await db.$transaction(async (tx) => {
      const paciente = await tx.paciente.update({
        where: { idPaciente },
        data: { estaActivo: body.accion === "ACTIVAR" },
        include: {
          persona: {
            select: {
              idPersona: true,
              nombres: true,
              apellidos: true,
              genero: true,
              documento: { select: { tipo: true, numero: true, ruc: true } },
              contactos: { select: { tipo: true, valorNorm: true, esPrincipal: true, activo: true } },
            },
          },
        },
      })
      // AuditLog (cuando actives el modelo)
      // await tx.auditLog.create({...})
      return paciente
    })

    return ok({ item: updated }) // sobre estándar
  } catch (e: any) {
    if (e?.name === "ZodError") return errors.validation("Datos inválidos")
    if (e?.code?.startsWith?.("P")) return errors.db()
    return errors.internal(e?.message ?? "Error al cambiar estado del paciente")
  }
}
