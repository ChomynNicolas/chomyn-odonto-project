// src/lib/hooks/use-report-export.ts
"use client"

/**
 * Custom hook for report export functionality.
 * Handles PDF and CSV export with full dataset fetching, audit logging, and error handling.
 */

import { useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import {
  generateReportPdf,
  downloadBlob,
  generateReportFilename,
  formatFiltersForExport,
  type PdfExportOptions,
  type ExportScope,
} from "@/lib/utils/report-export"
import {
  generateReportCsv,
  downloadCsv,
  generateCsvFilename,
  type CsvExportOptions,
} from "@/lib/utils/report-export-csv"
import { auditReportExport, auditReportPrint } from "@/lib/services/reportes/audit"
import type {
  ReportType,
  ReportFilters,
  ReportResponse,
} from "@/types/reportes"

/** Export format type */
export type ExportFormat = "pdf" | "csv"

/** Options for export hook */
export interface UseReportExportOptions<TFilters extends ReportFilters, TResponse extends ReportResponse> {
  reportType: ReportType
  title: string
  description?: string
  /** Current report data (for current page export) */
  currentData?: TResponse | null
  /** Current filters applied */
  currentFilters?: TFilters | null
  /** Filter labels for display in exports */
  filterLabels?: Record<string, string>
  /** Table columns definition */
  tableColumns?: Array<{ label: string; key: string }>
  /** Export scope - defaults to fullDataset */
  defaultScope?: ExportScope
  /** Callback to fetch full dataset (for full export) */
  fetchFullDataset?: (filters: TFilters) => Promise<TResponse>
}

/** Return type for useReportExport hook */
export interface UseReportExportReturn {
  /** Export to PDF */
  exportPdf: (scope?: ExportScope) => Promise<void>
  /** Export to CSV */
  exportCsv: (scope?: ExportScope) => Promise<void>
  /** Print report */
  printReport: () => void
  /** Whether export is in progress */
  isExporting: boolean
  /** Current export error */
  exportError: string | null
  /** Current export scope */
  currentScope: ExportScope
}

/**
 * Custom hook for report export functionality.
 */
export function useReportExport<TFilters extends ReportFilters, TResponse extends ReportResponse>(
  options: UseReportExportOptions<TFilters, TResponse>
): UseReportExportReturn {
  const { data: session } = useSession()
  const {
    reportType,
    title,
    description,
    currentData,
    currentFilters,
    filterLabels,
    tableColumns,
    defaultScope = "fullDataset",
    fetchFullDataset,
  } = options

  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [currentScope, setCurrentScope] = useState<ExportScope>(defaultScope)

  /**
   * Get data for export based on scope.
   */
  const getExportData = useCallback(
    async (scope: ExportScope): Promise<{ data: TResponse; isFull: boolean }> => {
      if (scope === "currentPage" && currentData) {
        return { data: currentData, isFull: false }
      }

      // For full dataset, fetch all records
      if (scope === "fullDataset" && fetchFullDataset && currentFilters) {
        const fullData = await fetchFullDataset(currentFilters)
        return { data: fullData, isFull: true }
      }

      // Fallback to current data if no fetch function
      if (currentData) {
        return { data: currentData, isFull: false }
      }

      throw new Error("No hay datos disponibles para exportar")
    },
    [currentData, currentFilters, fetchFullDataset]
  )

  /**
   * Extract table data from report response.
   */
  const extractTableData = useCallback((data: TResponse): Array<Record<string, unknown>> => {
    // Each report response has a `data` field with the table rows
    if ("data" in data && Array.isArray(data.data)) {
      return data.data as unknown as Array<Record<string, unknown>>
    }
    return []
  }, [])

  /**
   * Export to PDF.
   */
  const exportPdf = useCallback(
    async (scope: ExportScope = currentScope) => {
      if (!currentFilters) {
        toast.error("No hay filtros aplicados para exportar")
        return
      }

      setIsExporting(true)
      setExportError(null)
      setCurrentScope(scope)

      try {
        const { data: exportData, isFull } = await getExportData(scope)
        const metadata = exportData.metadata

        if (!metadata) {
          throw new Error("Metadatos no disponibles")
        }

        const tableData = extractTableData(exportData)
        const appliedFilters = formatFiltersForExport(
          currentFilters as unknown as Record<string, unknown>,
          filterLabels
        )

        const pdfOptions: PdfExportOptions = {
          title,
          description,
          metadata,
          kpis: exportData.kpis,
          tableColumns,
          tableData,
          appliedFilters,
          scope,
          totalRecords: isFull && "pagination" in exportData ? exportData.pagination?.totalItems : tableData.length,
        }

        const blob = await generateReportPdf(pdfOptions)
        const filename = generateReportFilename(reportType, "pdf")
        downloadBlob(blob, filename)

        // Audit log
        if (session?.user?.id) {
          await auditReportExport({
            userId: parseInt(session.user.id, 10),
            username: session.user.username || session.user.name || "unknown",
            role: (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP",
            reportType,
            filters: currentFilters as unknown as Record<string, unknown>,
            format: "pdf",
            headers: new Headers(),
          })
        }

        toast.success("PDF exportado exitosamente", {
          description: `${filename} (${tableData.length} registros)`,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido al exportar PDF"
        setExportError(message)
        console.error("[useReportExport] PDF export error:", error)
        toast.error("Error al exportar PDF", { description: message })
      } finally {
        setIsExporting(false)
      }
    },
    [
      currentFilters,
      currentScope,
      filterLabels,
      getExportData,
      extractTableData,
      reportType,
      session,
      tableColumns,
      title,
      description,
    ]
  )

  /**
   * Export to CSV.
   */
  const exportCsv = useCallback(
    async (scope: ExportScope = currentScope) => {
      if (!currentFilters) {
        toast.error("No hay filtros aplicados para exportar")
        return
      }

      if (!tableColumns || tableColumns.length === 0) {
        toast.error("No hay columnas definidas para exportar")
        return
      }

      setIsExporting(true)
      setExportError(null)
      setCurrentScope(scope)

      try {
        const { data: exportData } = await getExportData(scope)
        const tableData = extractTableData(exportData)

        if (tableData.length === 0) {
          toast.warning("No hay datos para exportar")
          return
        }

        const csvOptions: CsvExportOptions = {
          columns: tableColumns,
          data: tableData,
          reportTitle: reportType,
          includeBom: true,
        }

        const csvContent = generateReportCsv(csvOptions)
        const filename = generateCsvFilename(reportType)
        downloadCsv(csvContent, filename)

        // Audit log
        if (session?.user?.id) {
          await auditReportExport({
            userId: parseInt(session.user.id, 10),
            username: session.user.username || session.user.name || "unknown",
            role: (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP",
            reportType,
            filters: currentFilters as unknown as Record<string, unknown>,
            format: "csv",
            headers: new Headers(),
          })
        }

        toast.success("CSV exportado exitosamente", {
          description: `${filename} (${tableData.length} registros)`,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido al exportar CSV"
        setExportError(message)
        console.error("[useReportExport] CSV export error:", error)
        toast.error("Error al exportar CSV", { description: message })
      } finally {
        setIsExporting(false)
      }
    },
    [
      currentFilters,
      currentScope,
      getExportData,
      extractTableData,
      reportType,
      session,
      tableColumns,
    ]
  )

  /**
   * Print report.
   */
  const printReport = useCallback(() => {
    window.print()

    // Audit log
    if (session?.user?.id && currentFilters) {
      auditReportPrint({
        userId: parseInt(session.user.id, 10),
        username: session.user.username || session.user.name || "unknown",
        role: (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP",
        reportType,
        filters: currentFilters as unknown as Record<string, unknown>,
        headers: new Headers(),
      }).catch((err) => {
        console.error("[useReportExport] Print audit error:", err)
      })
    }

    toast.success("Ventana de impresión abierta")
  }, [currentFilters, reportType, session])

  return {
    exportPdf,
    exportCsv,
    printReport,
    isExporting,
    exportError,
    currentScope,
  }
}

