// src/components/reportes/ReportExportButtons.tsx
"use client"

/**
 * Report Export Buttons Component
 * Provides PDF export, CSV export, and print functionality for reports.
 */

import { useState, useCallback } from "react"
import { Download, Printer, Loader2, FileText, FileSpreadsheet, ChevronDown } from "lucide-react"
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
import { useSession } from "next-auth/react"
import type { ReportType, ReportKpi, ReportMetadata } from "@/types/reportes"
import { toast } from "sonner"
import { ExportScopeBadge } from "./ExportScopeBadge"

interface ReportExportButtonsProps {
  reportType: ReportType
  title: string
  description?: string
  metadata?: ReportMetadata
  kpis?: ReportKpi[]
  tableColumns?: Array<{ label: string; key: string }>
  tableData?: Array<Record<string, unknown>>
  filters?: Record<string, unknown>
  filterLabels?: Record<string, string>
  disabled?: boolean
  /** Export scope - defaults to fullDataset */
  scope?: ExportScope
  /** Total records count (for full dataset) */
  totalRecords?: number
  onExportStart?: () => void
  onExportEnd?: () => void
}

export function ReportExportButtons({
  reportType,
  title,
  description,
  metadata,
  kpis,
  tableColumns,
  tableData,
  filters,
  filterLabels,
  disabled,
  scope = "fullDataset",
  totalRecords,
  onExportStart,
  onExportEnd,
}: ReportExportButtonsProps) {
  const { data: session } = useSession()
  const [isExporting, setIsExporting] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const handleExportPdf = useCallback(async () => {
    if (!metadata || !filters) {
      toast.error("No hay datos o filtros para exportar")
      return
    }

    setIsExporting(true)
    onExportStart?.()
    setShowExportMenu(false)

    try {
      let exportData = tableData
      let exportMetadata = metadata
      let exportKpis = kpis
      let recordCount = tableData?.length ?? 0

      // For full dataset, fetch all records from export endpoint
      if (scope === "fullDataset") {
        toast.info("Obteniendo todos los registros...", { duration: 2000 })
        const response = await fetch(`/api/reportes/${reportType}/export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filters }),
        })

        const result = await response.json()
        if (!result.ok) {
          throw new Error(result.error || "Error al obtener datos para exportar")
        }

        exportData = result.data.data as unknown as Array<Record<string, unknown>>
        exportMetadata = result.data.metadata
        exportKpis = result.data.kpis
        recordCount = exportData.length
      }

      if (!exportData || exportData.length === 0) {
        toast.warning("No hay datos para exportar")
        return
      }

      const exportOptions: PdfExportOptions = {
        title,
        description,
        metadata: exportMetadata,
        kpis: exportKpis,
        tableColumns,
        tableData: exportData,
        appliedFilters: formatFiltersForExport(filters, filterLabels),
        scope,
        totalRecords: scope === "fullDataset" ? recordCount : totalRecords,
      }

      const blob = await generateReportPdf(exportOptions)
      const filename = generateReportFilename(reportType, "pdf")
      downloadBlob(blob, filename)

      // Audit log
      if (session?.user?.id) {
        await auditReportExport({
          userId: parseInt(session.user.id, 10),
          username: session.user.username || session.user.name || "unknown",
          role: (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP",
          reportType,
          filters,
          format: "pdf",
          scope,
          recordCount,
          fileSizeBytes: blob.size,
          headers: new Headers(),
        })
      }

      toast.success("PDF exportado exitosamente", {
        description: `${filename} (${recordCount} registros)`,
      })
    } catch (error) {
      console.error("[ReportExport] PDF generation error:", error)
      toast.error("Error al generar PDF", {
        description: error instanceof Error ? error.message : "Error desconocido",
      })
    } finally {
      setIsExporting(false)
      onExportEnd?.()
    }
  }, [
    title,
    description,
    metadata,
    kpis,
    tableColumns,
    tableData,
    filters,
    filterLabels,
    reportType,
    scope,
    totalRecords,
    session,
    onExportStart,
    onExportEnd,
  ])

  const handleExportCsv = useCallback(async () => {
    if (!metadata || !tableColumns || tableColumns.length === 0 || !filters) {
      toast.error("No hay datos, columnas o filtros para exportar")
      return
    }

    setIsExporting(true)
    onExportStart?.()
    setShowExportMenu(false)

    try {
      let exportData = tableData
      let recordCount = tableData?.length ?? 0

      // For full dataset, fetch all records from export endpoint
      if (scope === "fullDataset") {
        toast.info("Obteniendo todos los registros...", { duration: 2000 })
        const response = await fetch(`/api/reportes/${reportType}/export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filters }),
        })

        const result = await response.json()
        if (!result.ok) {
          throw new Error(result.error || "Error al obtener datos para exportar")
        }

        exportData = result.data.data as unknown as Array<Record<string, unknown>>
        recordCount = exportData.length
      }

      if (!exportData || exportData.length === 0) {
        toast.warning("No hay datos para exportar")
        return
      }

      const csvOptions: CsvExportOptions = {
        columns: tableColumns,
        data: exportData,
        reportTitle: reportType,
        includeBom: true,
      }

      const csvContent = generateReportCsv(csvOptions)
      const filename = generateCsvFilename(reportType)
      downloadCsv(csvContent, filename)

      // Audit log
      if (session?.user?.id) {
        const blob = new Blob([csvContent], { type: "text/csv" })
        await auditReportExport({
          userId: parseInt(session.user.id, 10),
          username: session.user.username || session.user.name || "unknown",
          role: (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP",
          reportType,
          filters,
          format: "csv",
          scope,
          recordCount,
          fileSizeBytes: blob.size,
          headers: new Headers(),
        })
      }

      toast.success("CSV exportado exitosamente", {
        description: `${filename} (${recordCount} registros)`,
      })
    } catch (error) {
      console.error("[ReportExport] CSV generation error:", error)
      toast.error("Error al generar CSV", {
        description: error instanceof Error ? error.message : "Error desconocido",
      })
    } finally {
      setIsExporting(false)
      onExportEnd?.()
    }
  }, [
    metadata,
    tableColumns,
    tableData,
    reportType,
    session,
    filters,
    scope,
    onExportStart,
    onExportEnd,
  ])

  const handlePrint = useCallback(() => {
    window.print()

    // Audit log
    if (session?.user?.id && filters) {
      auditReportPrint({
        userId: parseInt(session.user.id, 10),
        username: session.user.username || session.user.name || "unknown",
        role: (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP",
        reportType,
        filters,
        headers: new Headers(),
      }).catch((err) => {
        console.error("[ReportExport] Print audit error:", err)
      })
    }

    toast.success("Ventana de impresión abierta")
  }, [session, filters, reportType])

  const hasData = metadata && tableData && tableData.length > 0
  const recordCount = tableData?.length

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Export Scope Badge */}
      {hasData && (
        <ExportScopeBadge
          scope={scope}
          recordCount={recordCount}
          totalRecords={totalRecords}
        />
      )}

      {/* Print Button */}
      <button
        onClick={handlePrint}
        disabled={disabled || !metadata}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        title="Imprimir reporte (Ctrl+P)"
      >
        <Printer className="h-4 w-4" />
        <span className="hidden sm:inline">Imprimir</span>
      </button>

      {/* Export Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowExportMenu(!showExportMenu)}
          disabled={disabled || isExporting || !hasData}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          title="Exportar reporte (todos los registros filtrados)"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="hidden sm:inline">Exportando...</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar</span>
              <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>

        {/* Dropdown Menu */}
        {showExportMenu && !isExporting && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowExportMenu(false)}
            />
            <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
              <button
                onClick={handleExportPdf}
                className="flex w-full items-center gap-2 rounded-t-lg px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                title="Exportar a PDF (todos los registros filtrados)"
              >
                <FileText className="h-4 w-4" />
                <span>Exportar PDF</span>
              </button>
              <button
                onClick={handleExportCsv}
                className="flex w-full items-center gap-2 rounded-b-lg px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                title="Exportar a CSV (todos los registros filtrados)"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Exportar CSV</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

