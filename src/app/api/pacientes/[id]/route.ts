// src/app/api/pacientes/[id]/route.ts
import { type NextRequest } from "next/server"
import { requireRole } from "@/app/api/pacientes/_rbac"
import { pathParamsSchema, pacienteUpdateBodySchema, deleteQuerySchema } from "./_schemas"
import { getPacienteFicha } from "./_service.get"
import { updatePaciente } from "./_service.update"
import { deletePacienteById, DeletePacienteError } from "./_service.delete"
import { prisma as db } from "@/lib/prisma"
import z from "zod"
import { ok, errors } from "../../_http"

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const gate = await requireRole(["ADMIN", "RECEP", "ODONT"])
  if (!gate.ok) return errors.forbidden()

  try {
    const { id } = pathParamsSchema.parse(ctx.params)
    const ficha = await getPacienteFicha(id)
    if (!ficha) return errors.notFound("Paciente no encontrado")
    return ok(ficha)
  } catch (e: any) {
    if (e?.name === "ZodError") return errors.validation("Parámetros inválidos")
    return errors.internal(e?.message ?? "Error al obtener paciente")
  }
}

export async function PUT(req: NextRequest, ctx: { params: { id: string } }) {
  const gate = await requireRole(["ADMIN", "RECEP", "ODONT"])
  if (!gate.ok) return errors.forbidden()

  try {
    const { id } = pathParamsSchema.parse(ctx.params)
    const body = pacienteUpdateBodySchema.parse(await req.json())
    const result = await updatePaciente(id, body)
    return ok(result) // sobre estándar
  } catch (e: any) {
    if (e?.name === "ZodError") return errors.validation(e.issues?.[0]?.message ?? "Datos inválidos")
    if (e?.status === 404) return errors.notFound(e.message)
    if (e?.code === "P2002") return errors.conflict()
    return errors.internal(e?.message ?? "Error al actualizar paciente")
  }
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  const gate = await requireRole(["ADMIN", "RECEP", "ODONT"])
  if (!gate.ok) return errors.forbidden()

  try {
    const { id } = pathParamsSchema.parse(ctx.params)
    const query = deleteQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams))
    const role = gate.role!

    const result = await deletePacienteById({
      pacienteId: id,
      role,
      hard: query.hard,
      alsoInactivatePersona: true,
    })

    return ok({ mode: result.mode, result }) // sobre estándar
  } catch (e: any) {
    if (e?.name === "ZodError") return errors.validation("Parámetros inválidos")
    if (e instanceof DeletePacienteError) return errors.apiError?.(e.status, e.code, e.message) ?? errors.internal(e.message)
    if (e?.code === "P2003") return errors.fk("No se puede eliminar por restricciones de integridad")
    return errors.internal(e?.message ?? "Error al eliminar/inactivar paciente")
  }
}

const patchSchema = z.object({
  accion: z.enum(["INACTIVAR", "ACTIVAR"]),
  motivo: z.string().max(300).optional(),
})

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
