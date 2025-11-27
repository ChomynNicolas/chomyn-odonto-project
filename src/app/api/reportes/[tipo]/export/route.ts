// src/app/api/reportes/[tipo]/export/route.ts
/**
 * Export API Route for Reports
 * Returns full dataset for export (bypasses pagination limits).
 * 
 * POST /api/reportes/[tipo]/export
 * Body: { filters: ReportFilters }
 */

import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { prisma } from "@/lib/prisma"
import { executeReport, checkReportAccess } from "@/lib/services/reportes/orchestrator"
import { reportTypeSchema } from "@/lib/validation/reportes"
import { auditReportExport } from "@/lib/services/reportes/audit"
import type { ReportType, ReportUserContext } from "@/types/reportes"
import { REPORT_TYPES } from "@/types/reportes"

/**
 * POST handler for report export (full dataset).
 * Always returns full dataset with maximum page size.
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

    // 6. Set export mode: large page size, no pagination limits
    const exportFilters = {
      ...filters,
      page: 1,
      pageSize: 10000, // Maximum reasonable limit for export
    }

    // 7. Execute report with export mode
    const result = await executeReport(reportType, exportFilters, userContext)

    // 8. Log audit entry for export
    const executionTime = performance.now() - startTime
    await auditReportExport({
      userId: userContext.userId,
      username: userContext.username,
      role: userContext.role,
      reportType,
      filters,
      format: "export", // Generic export format
      headers: req.headers,
    })

    // 9. Return response
    if (!result.success) {
      // Map error codes to HTTP status
      switch (result.error.code) {
        case "VALIDATION_ERROR":
          return errors.validation(result.error.message)
        case "FORBIDDEN":
          return errors.forbidden(result.error.message)
        case "NOT_FOUND":
          return errors.notFound(result.error.message)
        default:
          return errors.internal(result.error.message)
      }
    }

    // Add export metadata
    const exportData = {
      ...result.data,
      metadata: {
        ...result.data.metadata,
        exportMode: true,
        totalRecords: result.data.pagination?.totalItems ?? result.data.data?.length ?? 0,
      },
    }

    return ok(exportData)
  } catch (error) {
    console.error("[ReportExportAPI] Unexpected error:", error)
    return errors.internal("Error interno al exportar el reporte")
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

