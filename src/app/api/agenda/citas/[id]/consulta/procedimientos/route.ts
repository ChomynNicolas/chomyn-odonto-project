// src/app/api/agenda/citas/[id]/consulta/procedimientos/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { paramsSchema, createProcedureSchema } from "../_schemas"
import { CONSULTA_RBAC } from "../_rbac"
import { prisma } from "@/lib/prisma"
import { ensureConsulta } from "../_service"

/**
 * GET /api/agenda/citas/[id]/consulta/procedimientos
 * Obtiene todos los procedimientos de la consulta
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("ID de cita inválido")
    const { id: citaId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = ((session.user as any)?.rol ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canViewClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden ver procedimientos")
    }

    const consulta = await prisma.consulta.findUnique({
      where: { citaId },
      select: { citaId: true },
    })
    if (!consulta) return errors.notFound("Consulta no encontrada")

    const procedimientos = await prisma.consultaProcedimiento.findMany({
      where: { consultaId: citaId },
      orderBy: { createdAt: "desc" },
    })

    return ok(
      procedimientos.map((p) => ({
        id: p.idConsultaProcedimiento,
        procedureId: p.procedureId,
        serviceType: p.serviceType,
        toothNumber: p.toothNumber,
        toothSurface: p.toothSurface,
        quantity: p.quantity,
        unitPriceCents: p.unitPriceCents,
        totalCents: p.totalCents,
        resultNotes: p.resultNotes,
        treatmentStepId: p.treatmentStepId,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }))
    )
  } catch (e: any) {
    console.error("[GET /api/agenda/citas/[id]/consulta/procedimientos]", e)
    return errors.internal(e?.message ?? "Error al obtener procedimientos")
  }
}

/**
 * POST /api/agenda/citas/[id]/consulta/procedimientos
 * Crea un nuevo procedimiento
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("ID de cita inválido")
    const { id: citaId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = ((session.user as any)?.rol ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canEditClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden crear procedimientos")
    }

    const body = await req.json()
    const input = createProcedureSchema.parse(body)

    // Asegurar que la consulta existe
    const consulta = await prisma.consulta.findUnique({
      where: { citaId },
      select: { citaId: true },
    })
    if (!consulta) {
      const cita = await prisma.cita.findUnique({
        where: { idCita: citaId },
        include: { profesional: true },
      })
      if (!cita) return errors.notFound("Cita no encontrada")
      await ensureConsulta(citaId, cita.profesionalId, session.user.id)
    }

    // Calcular total si no se proporciona
    const totalCents = input.totalCents ?? (input.unitPriceCents ? input.unitPriceCents * input.quantity : null)

    const procedimiento = await prisma.consultaProcedimiento.create({
      data: {
        consultaId: citaId,
        procedureId: input.procedureId ?? null,
        serviceType: input.serviceType ?? null,
        toothNumber: input.toothNumber ?? null,
        toothSurface: input.toothSurface ?? null,
        quantity: input.quantity,
        unitPriceCents: input.unitPriceCents ?? null,
        totalCents,
        resultNotes: input.resultNotes ?? null,
        treatmentStepId: input.treatmentStepId ?? null,
      },
    })

    return ok({
      id: procedimiento.idConsultaProcedimiento,
      procedureId: procedimiento.procedureId,
      serviceType: procedimiento.serviceType,
      toothNumber: procedimiento.toothNumber,
      toothSurface: procedimiento.toothSurface,
      quantity: procedimiento.quantity,
      unitPriceCents: procedimiento.unitPriceCents,
      totalCents: procedimiento.totalCents,
      resultNotes: procedimiento.resultNotes,
      treatmentStepId: procedimiento.treatmentStepId,
      createdAt: procedimiento.createdAt.toISOString(),
      updatedAt: procedimiento.updatedAt.toISOString(),
    })
  } catch (e: any) {
    if (e.name === "ZodError") return errors.validation(e.errors[0]?.message ?? "Datos inválidos")
    console.error("[POST /api/agenda/citas/[id]/consulta/procedimientos]", e)
    return errors.internal(e?.message ?? "Error al crear procedimiento")
  }
}

