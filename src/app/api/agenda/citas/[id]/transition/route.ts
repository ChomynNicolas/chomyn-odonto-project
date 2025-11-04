// ============================================================================
// ENDPOINT - Transiciones de Estado de Cita
// ============================================================================
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { PrismaClient, type EstadoCita, MotivoCancelacion } from "@prisma/client"
import { requireSessionWithRoles } from "@/app/api/_lib/auth"

export const revalidate = 0
export const dynamic = "force-dynamic"

const prisma = new PrismaClient()

const transitionSchema = z.object({
  action: z.enum(["CONFIRM", "CHECKIN", "START", "COMPLETE", "CANCEL", "NO_SHOW"]),
  note: z.string().max(500).optional(),
  // Requerido cuando action = CANCEL
  cancelReason: z.nativeEnum(MotivoCancelacion).optional(),
})

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
})

// Matriz de transiciones permitidas
const ALLOWED_TRANSITIONS: Record<EstadoCita, EstadoCita[]> = {
  SCHEDULED: ["CONFIRMED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["IN_PROGRESS", "CANCELLED", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
}

// Mapeo de acción → nuevo estado
const ACTION_TO_STATE: Record<string, EstadoCita> = {
  CONFIRM: "CONFIRMED",
  CHECKIN: "CHECKED_IN",
  START: "IN_PROGRESS",
  COMPLETE: "COMPLETED",
  CANCEL: "CANCELLED",
  NO_SHOW: "NO_SHOW",
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  // RBAC: RECEP, ODONT, ADMIN
  const auth = await requireSessionWithRoles(req, ["RECEP", "ODONT", "ADMIN"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const parsedParams = paramsSchema.safeParse(await context.params)
  if (!parsedParams.success) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 })
  }

  const bodyJson = await req.json().catch(() => null)
  const parsed = transitionSchema.safeParse(bodyJson)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() }, { status: 400 })
  }

  const { action, note, cancelReason } = parsed.data
  const idCita = parsedParams.data.id
  const user = auth.session.user as any
  const userId: number = Number(user?.idUsuario ?? user?.id ?? 0)
  const userRol = (user?.rolNombre ?? user?.rol ?? user?.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

// RBAC: solo ODONT/ADMIN pueden START y COMPLETE
if (!["ODONT", "ADMIN"].includes(userRol) && (action === "START" || action === "COMPLETE")) {
  return NextResponse.json(
    { ok: false, error: "FORBIDDEN", message: "Acción no permitida para este rol" },
    { status: 403 },
  )
}

  try {
    // Estado actual
    const current = await prisma.cita.findUnique({
      where: { idCita },
      select: { estado: true, checkedInAt: true, startedAt: true, completedAt: true },
    })
    if (!current) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 })
    }

    const nuevoEstado = ACTION_TO_STATE[action]
    if (!nuevoEstado) {
      return NextResponse.json({ ok: false, error: "INVALID_ACTION" }, { status: 400 })
    }

    // Validar transición
    const permitidas = ALLOWED_TRANSITIONS[current.estado]
    if (!permitidas.includes(nuevoEstado)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_TRANSITION", message: `No se puede pasar de ${current.estado} a ${nuevoEstado}` },
        { status: 400 },
      )
    }

    // Datos a actualizar
    const now = new Date()
    const data: any = { estado: nuevoEstado }

    // Timestamps correctos (según tu schema)
    if (action === "CHECKIN" && !current.checkedInAt) data.checkedInAt = now
    if (action === "START" && !current.startedAt) data.startedAt = now
    if (action === "COMPLETE" && !current.completedAt) data.completedAt = now

    // Cancelación
    if (action === "CANCEL") {
      if (!cancelReason) {
        return NextResponse.json(
          { ok: false, error: "BAD_REQUEST", message: "cancelReason es requerido cuando action=CANCEL" },
          { status: 400 },
        )
      }
      data.cancelReason = cancelReason
      data.cancelledAt = now
      data.cancelledByUserId = userId
    }

    // Persistir y registrar historial
    const [updated] = await prisma.$transaction([
      prisma.cita.update({
        where: { idCita },
        data,
        select: {
          idCita: true,
          estado: true,
          checkedInAt: true,
          startedAt: true,
          completedAt: true,
        },
      }),
      prisma.citaEstadoHistorial.create({
        data: {
          citaId: idCita,
          estadoPrevio: current.estado,
          estadoNuevo: nuevoEstado,
          nota: note ?? null,
          changedByUserId: userId,
        },
      }),
    ])

    return NextResponse.json(
      {
        ok: true,
        data: {
          idCita: updated.idCita,
          estado: updated.estado,
          // mantenemos nombres amigables para el front
          timestamps: {
            checkinAt: updated.checkedInAt ? updated.checkedInAt.toISOString() : null,
            startAt: updated.startedAt ? updated.startedAt.toISOString() : null,
            completeAt: updated.completedAt ? updated.completedAt.toISOString() : null,
          },
        },
      },
      { status: 200 },
    )
  } catch (e: any) {
    console.error("POST /api/agenda/citas/[id]/transition error:", e?.message)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}
