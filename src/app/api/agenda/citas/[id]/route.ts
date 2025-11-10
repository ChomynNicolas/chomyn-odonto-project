// src/app/api/agenda/citas/[id]/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "../../../_http"               // ⬅️ usa servicio Prisma
import { getCitaConsentimientoStatus } from "./_dto"
import { z } from "zod"
import { getCitaDetail } from "./_service"

const Params = z.object({ id: z.coerce.number().int().positive() })

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const parsed = Params.safeParse(await ctx.params)         // Next 15: await params
    if (!parsed.success) return errors.validation("ID de cita inválido")
    const { id } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = ((session.user as any)?.rol ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    const dto = await getCitaDetail(id, rol)
    if (!dto) return errors.notFound("Cita no encontrada")

    const consentimientoStatus = await getCitaConsentimientoStatus(id)
    return ok({ ...dto, consentimientoStatus })
  } catch (e: any) {
    console.error("[GET /api/agenda/citas/[id]]", e)
    return errors.internal(e?.message ?? "Error al obtener cita")
  }
}
