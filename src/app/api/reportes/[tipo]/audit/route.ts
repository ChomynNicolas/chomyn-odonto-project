// src/app/api/reportes/[tipo]/audit/route.ts
/**
 * Audit API Route for Report Exports
 * Handles audit logging for client-side report exports (PDF/CSV).
 * 
 * POST /api/reportes/[tipo]/audit
 * Body: { userId, username, role, reportType, filters, format, scope, recordCount, fileSizeBytes }
 */

import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { auditReportExport } from "@/lib/services/reportes/audit"
import { reportTypeSchema } from "@/lib/validation/reportes"
import type { ReportType, ReportRole } from "@/types/reportes"
import { REPORT_TYPES } from "@/types/reportes"

interface AuditRequestBody {
  userId: number
  username: string
  role: ReportRole
  reportType: ReportType
  filters: Record<string, unknown>
  format: "pdf" | "csv" | "excel" | "export"
  scope?: "currentPage" | "fullDataset"
  recordCount?: number
  fileSizeBytes?: number
}

/**
 * POST handler for report export audit logging.
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

    // 3. Parse and validate request body
    let body: AuditRequestBody
    try {
      body = await req.json()
    } catch {
      return errors.validation("Body inválido")
    }

    // 4. Validate that the user ID in body matches session
    if (body.userId !== userId) {
      return errors.forbidden("ID de usuario no coincide con la sesión")
    }

    // 5. Validate report type matches URL parameter
    if (body.reportType !== reportType) {
      return errors.validation("Tipo de reporte no coincide con la URL")
    }

    // 6. Log audit entry
    await auditReportExport({
      userId: body.userId,
      username: body.username,
      role: body.role,
      reportType: body.reportType,
      filters: body.filters || {},
      format: body.format,
      headers: req.headers,
      scope: body.scope,
      recordCount: body.recordCount,
      fileSizeBytes: body.fileSizeBytes,
    })

    // 7. Return success response
    return ok({ message: "Auditoría registrada correctamente" })
  } catch (e) {
    console.error("[POST /api/reportes/[tipo]/audit]", e)
    return errors.internal("Error al registrar auditoría")
  }
}

