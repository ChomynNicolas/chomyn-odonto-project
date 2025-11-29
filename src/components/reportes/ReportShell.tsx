// src/components/reportes/ReportShell.tsx
"use client"

/**
 * Report Shell Component
 * Provides consistent layout wrapper for all report pages.
 */

import { ReactNode } from "react"
import Link from "next/link"
import { ChevronLeft, FileText, Download } from "lucide-react"
import type { ReportConfig } from "@/types/reportes"

interface ReportShellProps {
  /** Report configuration */
  config: ReportConfig
  /** Filter form component */
  filters?: ReactNode
  /** Main content (table, charts, etc.) */
  children: ReactNode
  /** KPI cards section */
  kpis?: ReactNode
  /** Applied filters summary */
  appliedFilters?: ReactNode
  /** Loading state */
  isLoading?: boolean
  /** Error message */
  error?: string | null
  /** Callback for PDF export */
  onExportPdf?: () => void
  /** Export loading state */
  isExporting?: boolean
}

export function ReportShell({
  config,
  filters,
  children,
  kpis,
  appliedFilters,
  isLoading,
  error,
  onExportPdf,
  isExporting,
}: ReportShellProps) {
  return (
    <div className="flex flex-col gap-6 p-6 print:p-0">
      {/* Header - Hidden on print */}
      <header className="flex flex-col gap-4 print:hidden">
        {/* Back link and title */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Link
              href="/reportes"
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ChevronLeft className="h-4 w-4" />
              Volver a reportes
            </Link>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {config.name}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {config.description}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {onExportPdf && (
              <button
                onClick={onExportPdf}
                disabled={isLoading || isExporting}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span className="hidden sm:inline">Exportando...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Exportar PDF</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Filters section */}
      {filters && (
        <section className="print:hidden">
          {filters}
        </section>
      )}

      {/* Applied filters summary */}
      {appliedFilters && (
        <section className="print:mb-4">
          {appliedFilters}
        </section>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
            <p className="font-medium text-red-800 dark:text-red-200">
              Error al generar el reporte
            </p>
          </div>
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* KPIs section */}
      {kpis && !error && (
        <section className="print:mb-4">
          {kpis}
        </section>
      )}

      {/* Main content */}
      {!error && (
        <main className="flex-1">
          {children}
        </main>
      )}
    </div>
  )
}

