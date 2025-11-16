// src/app/api/pacientes/[id]/route.ts
import type { NextRequest } from "next/server"
import { requireRole } from "@/app/api/pacientes/_rbac"
import { pathParamsSchema, patientUpdateBodySchema, deleteQuerySchema } from "./_schemas"
import { getPacienteFicha } from "./_service.get"
import { updatePaciente } from "./_service.update"
import { deletePacienteById, DeletePacienteError } from "./_service.delete"
import { prisma as db } from "@/lib/prisma"
import { ok, errors, generateETag, checkETag, checkRateLimit, safeLog } from "../_http"



export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireRole(["ADMIN", "RECEP", "ODONT"])
  if (!gate.ok) return errors.forbidden()

  const requestId = crypto.randomUUID()

  try {
    const { id } = pathParamsSchema.parse(await ctx.params)

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
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    safeLog("error", "Error fetching patient record", { requestId, error: errorMessage })
    if (e instanceof Error && e.name === "ZodError") return errors.validation("Parámetros inválidos")
    return errors.internal(errorMessage ?? "Error al obtener paciente")
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireRole(["ADMIN", "RECEP", "ODONT"])
  if (!gate.ok) return errors.forbidden()

  const requestId = crypto.randomUUID()

  // Validate userId is defined for rate limiting
  if (gate.userId === undefined) {
    safeLog("error", "User ID is undefined", { requestId })
    return errors.forbidden("Usuario no identificado")
  }

  // Rate limiting for mutations
  const rateLimitKey = `update:${gate.userId}`
  const rateLimit = checkRateLimit(rateLimitKey, 30, 60000) // 30 requests per minute
  if (!rateLimit.allowed) {
    safeLog("warn", "Rate limit exceeded", { requestId, userId: gate.userId })
    return errors.rateLimit()
  }

  try {
    const { id } = pathParamsSchema.parse(await ctx.params)
    const body = patientUpdateBodySchema.parse(await req.json())

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

    // Get client IP for audit
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? undefined

    // Build update context (userId is already validated above)
    const context = {
      userId: gate.userId,
      role: gate.role,
      ip,
    }

    safeLog("info", "Updating patient", { requestId, pacienteId: id, userId: gate.userId })

    const result = await updatePaciente(id, body, context)

    safeLog("info", "Patient updated successfully", { requestId, pacienteId: id })

    return ok(result)
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    safeLog("error", "Error updating patient", { requestId, error: errorMessage })
    if (e instanceof Error && e.name === "ZodError") {
      const zodError = e as { issues?: Array<{ message?: string }> }
      return errors.validation(zodError.issues?.[0]?.message ?? "Datos inválidos")
    }
    const status = (e as { status?: number })?.status
    if (status === 404) {
      const error = e as { message?: string }
      return errors.notFound(error.message ?? "No encontrado")
    }
    const code = (e as { code?: string })?.code
    if (code === "P2002") return errors.conflict("Ya existe un registro con esos datos")
    return errors.internal(errorMessage ?? "Error al actualizar paciente")
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireRole(["ADMIN", "RECEP", "ODONT"])
  if (!gate.ok) return errors.forbidden()

  const requestId = crypto.randomUUID()

  // Validate userId is defined for rate limiting
  if (gate.userId === undefined) {
    safeLog("error", "User ID is undefined", { requestId })
    return errors.forbidden("Usuario no identificado")
  }

  // Rate limiting for deletions
  const rateLimitKey = `delete:${gate.userId}`
  const rateLimit = checkRateLimit(rateLimitKey, 10, 60000) // 10 requests per minute
  if (!rateLimit.allowed) {
    safeLog("warn", "Rate limit exceeded for deletion", { requestId, userId: gate.userId })
    return errors.rateLimit()
  }

  try {
    const { id } = pathParamsSchema.parse(await ctx.params)
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
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    safeLog("error", "Error deleting patient", { requestId, error: errorMessage })
    if (e instanceof Error && e.name === "ZodError") return errors.validation("Parámetros inválidos")
    if (e instanceof DeletePacienteError)
      return errors.apiError?.(e.status, e.code, e.message) ?? errors.internal(e.message)
    const code = (e as { code?: string })?.code
    if (code === "P2003") return errors.fk("No se puede eliminar por restricciones de integridad")
    return errors.internal(errorMessage ?? "Error al eliminar/inactivar paciente")
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 1. Authentication & authorization (mock - replace with real auth)
    const userId = 1 // TODO: Get from session
    const userRole = "ADMIN" as "ADMIN" | "RECEP" | "ODONT" // TODO: Get from session

    // 2. Parse and validate request
    const resolvedParams = await params
    const id = Number.parseInt(resolvedParams.id, 10)
    if (isNaN(id)) {
      return Response.json({ ok: false, error: "ID inválido" }, { status: 400 })
    }

    const body = await req.json()
    const validatedBody = patientUpdateBodySchema.parse(body)

    // 3. Get client IP for audit
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? undefined

    // 4. Update patient
    const result = await updatePaciente(id, validatedBody, {
      userId,
      role: userRole,
      ip,
    })

    // 5. Return success
    return Response.json(
      { ok: true, data: result },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    )
  } catch (error: unknown) {
    console.error("[PATCH /api/pacientes/[id]]", error)

    // Handle Zod validation errors
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as { errors?: unknown }
      return Response.json(
        {
          ok: false,
          error: "Datos inválidos",
          details: zodError.errors,
        },
        { status: 400 },
      )
    }

    // Handle custom errors
    const status = (error as { status?: number })?.status
    if (status) {
      const errorObj = error as { message?: string; code?: string }
      return Response.json(
        {
          ok: false,
          error: errorObj.message ?? "Error",
          code: errorObj.code,
        },
        { status },
      )
    }

    // Handle Prisma unique constraint violations
    const code = (error as { code?: string })?.code
    if (code === "P2002") {
      return Response.json(
        {
          ok: false,
          error: "Ya existe un registro con esos datos",
          code: "DUPLICATE",
        },
        { status: 409 },
      )
    }

    // Generic error
    return Response.json({ ok: false, error: "Error al actualizar paciente" }, { status: 500 })
  }
}
