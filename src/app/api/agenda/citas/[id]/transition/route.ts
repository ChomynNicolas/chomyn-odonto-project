import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/app/api/_lib/auth"
import { TransitionRequestSchema } from "./_schemas"
import { executeCitaTransition } from "./_service"
import { errorResponse, successResponse } from "@/app/api/_lib/responses"
import { ZodError } from "zod"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const citaId = Number.parseInt(id)

    if (isNaN(citaId)) {
      return errorResponse("ID de cita inválido", 400)
    }

    const session = await getServerSession()
    if (!session?.user?.id) {
      return errorResponse("No autenticado", 401)
    }

    const body = await req.json()
    const validated = TransitionRequestSchema.parse(body)

    const result = await executeCitaTransition({
      citaId,
      action: validated.action,
      usuarioId: session.user.id,
      notas: validated.notas,
      motivoCancelacion: validated.motivoCancelacion,
      ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    })

    return successResponse(result)
  } catch (error: any) {
    console.error("[v0] Error in cita transition:", error)

    // Errores de consentimiento
    if (error.status === 422 && error.code) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: 422 },
      )
    }

    // Errores de validación Zod
    if (error instanceof ZodError) {
      return errorResponse("Datos inválidos", 400, error.errors)
    }

    // Otros errores
    return errorResponse(error.message || "Error en transición de cita", 500)
  }
}
