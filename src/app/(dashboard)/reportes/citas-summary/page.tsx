// src/app/(dashboard)/reportes/citas-summary/page.tsx
"use client"

/**
 * Citas Summary Report Page
 * Displays appointment summary with KPIs and detailed listing.
 */

import { useState, useCallback } from "react"
import { ReportShell, ReportKpiCards, ReportTable, ReportFiltersForm, ReportExportButtons } from "@/components/reportes"
import { citasSummaryFiltersSchema } from "@/lib/validation/reportes"
import { REPORT_CONFIGS, type CitasSummaryFilters, type CitasSummaryResponse, type CitaSummaryRow } from "@/types/reportes"
import { toast } from "sonner"

/** Table columns for citas */
const COLUMNS = [
  { key: "inicio", label: "Fecha/Hora", format: "datetime" as const },
  { key: "paciente.nombreCompleto", label: "Paciente" },
  { key: "profesional.nombreCompleto", label: "Profesional" },
  { key: "tipo", label: "Tipo" },
  { key: "estado", label: "Estado" },
  { key: "consultorio.nombre", label: "Consultorio" },
  { key: "motivo", label: "Motivo" },
]

/** Status badge colors */
const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  CONFIRMED: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  CHECKED_IN: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  IN_PROGRESS: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  NO_SHOW: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
}

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendada",
  CONFIRMED: "Confirmada",
  CHECKED_IN: "En espera",
  IN_PROGRESS: "En atención",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
}

export default function CitasSummaryReportPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<CitasSummaryResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentFilters, setCurrentFilters] = useState<CitasSummaryFilters | null>(null)

  const config = REPORT_CONFIGS["citas-summary"]

  const fetchReport = useCallback(async (filters: CitasSummaryFilters) => {
    setIsLoading(true)
    setError(null)
    setCurrentFilters(filters)

    try {
      const response = await fetch("/api/reportes/citas-summary", {
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

  const renderCell = useCallback((column: { key: string; label: string }, row: CitaSummaryRow) => {
    if (column.key === "estado") {
      return (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[row.estado]}`}>
          {STATUS_LABELS[row.estado] || row.estado}
        </span>
      )
    }
    if (column.key === "inicio") {
      return new Date(row.inicio).toLocaleString("es-PY", {
        dateStyle: "short",
        timeStyle: "short",
      })
    }
    if (column.key === "paciente.nombreCompleto") {
      return row.paciente.nombreCompleto
    }
    if (column.key === "profesional.nombreCompleto") {
      return row.profesional.nombreCompleto
    }
    if (column.key === "consultorio.nombre") {
      return row.consultorio?.nombre || "-"
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
          schema={citasSummaryFiltersSchema}
          onSubmit={fetchReport}
          isLoading={isLoading}
          hasDateRange
        >
          {(form) => (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Estados
                </label>
                <select
                  multiple
                  {...form.register("estados")}
                  className="h-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tipo de Cita
                </label>
                <select
                  multiple
                  {...form.register("tipos")}
                  className="h-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <option value="CONSULTA">Consulta</option>
                  <option value="LIMPIEZA">Limpieza</option>
                  <option value="ENDODONCIA">Endodoncia</option>
                  <option value="EXTRACCION">Extracción</option>
                  <option value="URGENCIA">Urgencia</option>
                  <option value="ORTODONCIA">Ortodoncia</option>
                  <option value="CONTROL">Control</option>
                  <option value="OTRO">Otro</option>
                </select>
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
            reportType="citas-summary"
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
              estados: "Estados",
              tipos: "Tipos de cita",
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
          emptyMessage="No se encontraron citas con los filtros seleccionados"
          getRowKey={(row) => row.idCita}
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

