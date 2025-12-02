// src/app/api/reportes/[tipo]/route.ts
/**
 * Dynamic API Route for Reports
 * Handles all report generation requests through a single endpoint.
 * 
 * POST /api/reportes/[tipo]
 * Body: { filters: ReportFilters }
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { prisma } from "@/lib/prisma"
import { executeReport, checkReportAccess } from "@/lib/services/reportes/orchestrator"
import { reportTypeSchema } from "@/lib/validation/reportes"
import { auditReportAccess } from "@/lib/services/reportes/audit"
import type { ReportType, ReportUserContext } from "@/types/reportes"
import { REPORT_TYPES } from "@/types/reportes"

/**
 * POST handler for report generation.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tipo: string }> }
) {
  const startTime = performance.now()
  
  try {
    // 1. Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      return errors.forbidden("No autenticado")
    }

    const userId = parseInt(session.user.id, 10)
    if (isNaN(userId)) {
      return errors.forbidden("ID de usuario inválido")
    }

    // 2. Validate report type from URL
    const { tipo } = await params
    const typeValidation = reportTypeSchema.safeParse(tipo)
    
    if (!typeValidation.success) {
      return errors.validation(`Tipo de reporte inválido: ${tipo}. Tipos válidos: ${REPORT_TYPES.join(", ")}`)
    }

    const reportType = typeValidation.data as ReportType

    // 3. Build user context with RBAC info
    const userContext = await buildUserContext(userId, session.user)

    // 4. Check access permissions
    const accessCheck = checkReportAccess(reportType, userContext)
    if (!accessCheck.allowed) {
      // Audit failed access attempt
      await auditReportAccess({
        userId: userContext.userId,
        username: userContext.username,
        role: userContext.role,
        reportType,
        filters: {},
        success: false,
        errorMessage: accessCheck.reason,
        headers: req.headers,
      })

      return errors.forbidden(accessCheck.reason ?? "Acceso denegado al reporte")
    }

    // 5. Parse request body
    let filters: Record<string, unknown> = {}
    try {
      const body = await req.json()
      filters = body.filters ?? body ?? {}
    } catch {
      // Empty body is OK for some reports
      filters = {}
    }

    // 6. Execute report
    const result = await executeReport(reportType, filters, userContext)

    // 7. Log audit entry
    const executionTime = performance.now() - startTime
    await auditReportAccess({
      userId: userContext.userId,
      username: userContext.username,
      role: userContext.role,
      reportType,
      filters,
      success: result.success,
      errorMessage: !result.success ? result.error.message : undefined,
      executionTimeMs: Math.round(executionTime),
      headers: req.headers,
    })

    // 8. Return response
    if (!result.success) {
      // Map error codes to HTTP status and include details if available
      switch (result.error.code) {
        case "VALIDATION_ERROR": {
          // Include validation error details in the response for better debugging
          const errorDetails = result.error.details?.errors
          if (errorDetails) {
            // Return error with details as JSON (extending ApiError format)
            return NextResponse.json(
              {
                ok: false,
                code: "VALIDATION_ERROR",
                error: result.error.message,
                details: { errors: errorDetails },
              },
              { status: 400 }
            )
          }
          return errors.validation(result.error.message)
        }
        case "FORBIDDEN":
          return errors.forbidden(result.error.message)
        case "NOT_FOUND":
          return errors.notFound(result.error.message)
        default:
          return errors.internal(result.error.message)
      }
    }

    return ok(result.data)
  } catch (error) {
    console.error("[ReportAPI] Unexpected error:", error)
    return errors.internal("Error interno al generar el reporte")
  }
}

/**
 * GET handler - returns available reports for the authenticated user.
 */
export async function GET() {
  try {
    // 1. Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      return errors.forbidden("No autenticado")
    }

    const userId = parseInt(session.user.id, 10)
    if (isNaN(userId)) {
      return errors.forbidden("ID de usuario inválido")
    }

    // 2. Build user context
    const userContext = await buildUserContext(userId, session.user)

    // 3. Import getAvailableReports
    const { getAvailableReports } = await import("@/lib/services/reportes/orchestrator")

    // 4. Get available reports for user role
    const availableReports = getAvailableReports(userContext.role)

    return ok({
      reports: availableReports,
      user: {
        role: userContext.role,
        profesionalId: userContext.profesionalId,
      },
    })
  } catch (error) {
    console.error("[ReportAPI] Error fetching available reports:", error)
    return errors.internal("Error al obtener reportes disponibles")
  }
}

/**
 * Build user context with RBAC information.
 * For ODONT users, fetches their linked profesionalId for data scoping.
 */
async function buildUserContext(
  userId: number,
  sessionUser: { role?: string; username?: string; name?: string | null }
): Promise<ReportUserContext> {
  const role = (sessionUser.role ?? "RECEP") as ReportUserContext["role"]
  const username = sessionUser.username ?? sessionUser.name ?? "unknown"

  // For ODONT users, get their linked profesional ID
  let profesionalId: number | undefined

  if (role === "ODONT") {
    const profesional = await prisma.profesional.findUnique({
      where: { userId },
      select: { idProfesional: true },
    })
    profesionalId = profesional?.idProfesional
  }

  return {
    userId,
    username,
    role,
    profesionalId,
  }
}

