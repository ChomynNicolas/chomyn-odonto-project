// src/app/api/reportes/[tipo]/export/route.ts
/**
 * Export API Route for Reports
 * Returns full dataset for export (bypasses pagination limits).
 * 
 * POST /api/reportes/[tipo]/export
 * Body: { filters: ReportFilters }
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { prisma } from "@/lib/prisma"
import { executeReport, checkReportAccess } from "@/lib/services/reportes/orchestrator"
import { reportTypeSchema, safeValidateReportFilters } from "@/lib/validation/reportes"
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

    // 6. Clean filters before validation: remove pagination fields and empty arrays
    const cleanedFilters: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(filters)) {
      // Skip pagination fields - we'll set them ourselves
      if (key === "page" || key === "pageSize") {
        continue
      }
      
      // Remove null values
      if (value === null) {
        continue
      }
      
      // Remove empty arrays (convert to undefined for optional fields)
      if (Array.isArray(value) && value.length === 0) {
        continue
      }
      
      // Keep other values
      cleanedFilters[key] = value
    }

    // 7. Validate filters WITHOUT pageSize (to avoid validation errors with large pageSize)
    // We'll add pageSize after validation
    const validationResult = safeValidateReportFilters(reportType, cleanedFilters)
    if (!validationResult.success) {
      const flattenedErrors = validationResult.error.flatten()
      const fieldErrors = Object.entries(flattenedErrors.fieldErrors || {})
        .map(([field, messages]) => {
          const msgArray = Array.isArray(messages) ? messages : [messages]
          return `${field}: ${msgArray.join(", ")}`
        })
      
      const formErrors = flattenedErrors.formErrors || []
      
      let errorMessage = "Filtros inválidos"
      if (fieldErrors.length > 0) {
        errorMessage += `. Errores: ${fieldErrors.join("; ")}`
      } else if (formErrors.length > 0) {
        errorMessage += `. ${formErrors.join("; ")}`
      }
      
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          error: errorMessage,
          details: { errors: flattenedErrors },
        },
        { status: 400 }
      )
    }

    // 8. Prepare export filters with validated data + large pageSize
    // The orchestrator will handle pageSize > 100 specially (export mode)
    const validatedFilters = validationResult.data as Record<string, unknown>
    
    // Create export filters with large pageSize
    // The orchestrator will detect pageSize > 100 and skip validation for it (export mode)
    const exportFilters = {
      ...validatedFilters,
      page: 1,
      pageSize: 10000, // Large pageSize for export - orchestrator will handle this specially
    }

    // 9. Execute report with export mode (pageSize > 100 bypasses validation)
    const result = await executeReport(reportType, exportFilters, userContext)

    // 10. Log audit entry for export
    await auditReportExport({
      userId: userContext.userId,
      username: userContext.username,
      role: userContext.role,
      reportType,
      filters,
      format: "export", // Generic export format
      headers: req.headers,
    })

    // 11. Return response
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

    // Add export metadata
    // Calculate total records: use pagination if available, otherwise use data length
    const totalRecords = 
      "pagination" in result.data && result.data.pagination
        ? result.data.pagination.totalItems
        : Array.isArray(result.data.data)
        ? result.data.data.length
        : 0

    const exportData = {
      ...result.data,
      metadata: {
        ...result.data.metadata,
        exportMode: true,
        totalRecords,
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

