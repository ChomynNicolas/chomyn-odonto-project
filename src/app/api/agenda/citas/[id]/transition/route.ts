import { type NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { TransitionRequestSchema } from "./_schemas"
import { executeCitaTransition } from "./_service"

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const citaId = Number(id)
    if (!Number.isInteger(citaId)) return errors.validation("ID de cita inválido")

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")

    const body = await req.json().catch(() => ({}))
    const validated = TransitionRequestSchema.parse(body)

    const result = await executeCitaTransition({
      citaId,
      action: validated.action,
      usuarioId: Number(session.user.id),
      notas: validated.notas,
      motivoCancelacion: validated.motivoCancelacion,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    })

    return ok(result)
  } catch (error: unknown) {
    // Errores "esperados" 422 (consentimiento, etc.)
    if (error && typeof error === "object" && "status" in error && error.status === 422) {
      const errorObj = error as { code?: string; message?: string; details?: unknown }
      return NextResponse.json(
        { ok: false, code: errorObj.code ?? "CONSENT_ERROR", error: errorObj.message ?? "Error", details: errorObj.details },
        { status: 422 }
      )
    }
    // Errores Zod
    if (error instanceof ZodError) {
      return errors.validation("Datos inválidos")
    }
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("[v0] Error in cita transition:", error)
    return errors.internal(errorMessage || "Error en transición de cita")
  }
}
