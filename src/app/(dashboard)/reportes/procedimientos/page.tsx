// src/app/(dashboard)/reportes/procedimientos/page.tsx
"use client"

/**
 * Performed Procedures Report Page
 * Detailed listing of clinical procedures with monetary values.
 */

import { useState, useCallback } from "react"
import { ReportShell, ReportKpiCards, ReportTable, ReportFiltersForm, ReportExportButtons } from "@/components/reportes"
import { procedimientosFiltersSchema } from "@/lib/validation/reportes"
import {
  REPORT_CONFIGS,
  type ProcedimientosFilters,
  type ProcedimientosResponse,
  type ProcedimientoRealizadoRow,
} from "@/types/reportes"
import { toast } from "sonner"

/** Table columns for procedures */
const COLUMNS = [
  { key: "fecha", label: "Fecha", format: "date" as const },
  { key: "procedimiento.codigo", label: "Código" },
  { key: "procedimiento.nombre", label: "Procedimiento" },
  { key: "paciente.nombreCompleto", label: "Paciente" },
  { key: "profesional.nombreCompleto", label: "Profesional" },
  { key: "cantidad", label: "Cant.", align: "center" as const },
  { key: "diente", label: "Diente", align: "center" as const },
  { key: "totalCents", label: "Total", format: "currency" as const, align: "right" as const },
]

export default function ProcedimientosReportPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<ProcedimientosResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentFilters, setCurrentFilters] = useState<ProcedimientosFilters | null>(null)

  const config = REPORT_CONFIGS["procedimientos"]

  const fetchReport = useCallback(async (filters: ProcedimientosFilters) => {
    setIsLoading(true)
    setError(null)
    setCurrentFilters(filters)

    try {
      const response = await fetch("/api/reportes/procedimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters }),
      })

      const result = await response.json()

      if (!result.ok) {
        throw new Error(result.error || "Error al generar el reporte")
      }

      setData(result.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      setError(message)
      toast.error("Error al generar reporte", { description: message })
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handlePageChange = useCallback((page: number) => {
    if (currentFilters) {
      fetchReport({ ...currentFilters, page })
    }
  }, [currentFilters, fetchReport])

  const renderCell = useCallback((column: { key: string; label: string }, row: ProcedimientoRealizadoRow) => {
    if (column.key === "fecha") {
      return new Date(row.fecha).toLocaleDateString("es-PY")
    }
    if (column.key === "procedimiento.codigo") {
      return row.procedimiento.codigo || "-"
    }
    if (column.key === "procedimiento.nombre") {
      return row.procedimiento.nombre
    }
    if (column.key === "paciente.nombreCompleto") {
      return row.paciente.nombreCompleto
    }
    if (column.key === "profesional.nombreCompleto") {
      return row.profesional.nombreCompleto
    }
    if (column.key === "diente") {
      return row.diente || "-"
    }
    if (column.key === "totalCents") {
      if (!row.totalCents) return "-"
      // NOTA: totalCents ya está en guaraníes (PYG), no dividir por 100
      return new Intl.NumberFormat("es-PY", {
        style: "currency",
        currency: "PYG",
        maximumFractionDigits: 0,
      }).format(row.totalCents)
    }
    return null
  }, [])

  return (
    <ReportShell
      config={config}
      isLoading={isLoading}
      error={error}
      filters={
        <ReportFiltersForm
          schema={procedimientosFiltersSchema}
          onSubmit={fetchReport}
          isLoading={isLoading}
          hasDateRange
        >
          {(form) => (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="soloConValor"
                  {...form.register("soloConValor")}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label
                  htmlFor="soloConValor"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  Solo con valor monetario
                </label>
              </div>
            </div>
          )}
        </ReportFiltersForm>
      }
      kpis={data && <ReportKpiCards kpis={data.kpis} isLoading={isLoading} />}
    >
      {data && (
        <div className="mb-4 flex items-center justify-end print:hidden">
          <ReportExportButtons
            reportType="procedimientos"
            title={config.name}
            description={config.description}
            metadata={data.metadata}
            kpis={data.kpis}
            tableColumns={COLUMNS.map((col) => ({ label: col.label, key: col.key }))}
            tableData={data.data as unknown as Array<Record<string, unknown>>}
            filters={currentFilters as unknown as Record<string, unknown>}
            filterLabels={{
              startDate: "Fecha desde",
              endDate: "Fecha hasta",
              soloConValor: "Solo con valor monetario",
            }}
            scope="fullDataset"
            totalRecords={data.pagination?.totalItems}
            disabled={isLoading}
          />
        </div>
      )}
      {data ? (
        <ReportTable
          columns={COLUMNS}
          data={data.data}
          pagination={data.pagination}
          onPageChange={handlePageChange}
          isLoading={isLoading}
          emptyMessage="No se encontraron procedimientos con los filtros seleccionados"
          getRowKey={(row) => row.idConsultaProcedimiento}
          renderCell={renderCell}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-gray-500 dark:text-gray-400">
            Selecciona los filtros y haz clic en &quot;Generar&quot; para ver el reporte.
          </p>
        </div>
      )}
    </ReportShell>
  )
}

