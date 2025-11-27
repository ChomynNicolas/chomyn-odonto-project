// src/app/(dashboard)/reportes/pacientes-activos/page.tsx
"use client"

/**
 * Active Patients Report Page
 * Lists active patients with demographics and activity status.
 */

import { useState, useCallback } from "react"
import { ReportShell, ReportKpiCards, ReportTable, ReportFiltersForm, ReportExportButtons } from "@/components/reportes"
import { pacientesActivosFiltersSchema } from "@/lib/validation/reportes"
import {
  REPORT_CONFIGS,
  type PacientesActivosFilters,
  type PacientesActivosResponse,
  type PacienteActivoRow,
} from "@/types/reportes"
import { toast } from "sonner"
import { AlertTriangle } from "lucide-react"

/** Table columns for patients */
const COLUMNS = [
  { key: "nombreCompleto", label: "Nombre Completo" },
  { key: "documento", label: "Documento" },
  { key: "edad", label: "Edad", align: "center" as const },
  { key: "genero", label: "Género" },
  { key: "telefono", label: "Teléfono" },
  { key: "ultimaCita.fecha", label: "Última Cita", format: "date" as const },
  { key: "diasDesdeUltimaCita", label: "Días Inactivo", align: "center" as const },
  { key: "totalCitas", label: "Total Citas", align: "center" as const },
  { key: "tieneAlertas", label: "Alertas", align: "center" as const },
]

const GENDER_LABELS: Record<string, string> = {
  MASCULINO: "Masculino",
  FEMENINO: "Femenino",
  OTRO: "Otro",
  NO_ESPECIFICADO: "No especificado",
}

export default function PacientesActivosReportPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<PacientesActivosResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentFilters, setCurrentFilters] = useState<PacientesActivosFilters | null>(null)

  const config = REPORT_CONFIGS["pacientes-activos"]

  const fetchReport = useCallback(async (filters: PacientesActivosFilters) => {
    setIsLoading(true)
    setError(null)
    setCurrentFilters(filters)

    try {
      const response = await fetch("/api/reportes/pacientes-activos", {
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

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const renderCell = useCallback((column: { key: string; label: string }, row: PacienteActivoRow) => {
    if (column.key === "genero") {
      return row.genero ? GENDER_LABELS[row.genero] || row.genero : "-"
    }
    if (column.key === "ultimaCita.fecha") {
      return row.ultimaCita
        ? new Date(row.ultimaCita.fecha).toLocaleDateString("es-PY")
        : "Sin citas"
    }
    if (column.key === "diasDesdeUltimaCita") {
      if (row.diasDesdeUltimaCita === undefined) return "-"
      const isInactive = row.diasDesdeUltimaCita > 90
      return (
        <span className={isInactive ? "font-medium text-red-600 dark:text-red-400" : ""}>
          {row.diasDesdeUltimaCita}
        </span>
      )
    }
    if (column.key === "tieneAlertas") {
      return row.tieneAlertas ? (
        <AlertTriangle className="mx-auto h-4 w-4 text-amber-500" />
      ) : (
        "-"
      )
    }
    if (column.key === "edad") {
      return row.edad !== undefined ? `${row.edad} años` : "-"
    }
    return null
  }, [])

  return (
    <ReportShell
      config={config}
      isLoading={isLoading}
      error={error}
      onPrint={handlePrint}
      filters={
        <ReportFiltersForm
          schema={pacientesActivosFiltersSchema}
          onSubmit={fetchReport}
          isLoading={isLoading}
          hasDateRange={false}
        >
          {(form) => (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Edad Mínima
                </label>
                <input
                  type="number"
                  min="0"
                  max="150"
                  {...form.register("edadMin", { valueAsNumber: true })}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Edad Máxima
                </label>
                <input
                  type="number"
                  min="0"
                  max="150"
                  {...form.register("edadMax", { valueAsNumber: true })}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  placeholder="150"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Género
                </label>
                <select
                  multiple
                  {...form.register("generos")}
                  className="h-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  {Object.entries(GENDER_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Inactivos desde (días)
                </label>
                <input
                  type="number"
                  min="0"
                  {...form.register("inactivosDesdeDias", { valueAsNumber: true })}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  placeholder="90"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Búsqueda
                </label>
                <input
                  type="text"
                  {...form.register("busqueda")}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  placeholder="Nombre o documento..."
                />
              </div>
              <div className="flex items-center gap-2 self-end">
                <input
                  type="checkbox"
                  id="soloConCitasPendientes"
                  {...form.register("soloConCitasPendientes")}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label
                  htmlFor="soloConCitasPendientes"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  Solo con citas pendientes
                </label>
              </div>
            </div>
          )}
        </ReportFiltersForm>
      }
      kpis={data && <ReportKpiCards kpis={data.kpis} isLoading={isLoading} />}
      onPrint={handlePrint}
    >
      {data && (
        <div className="mb-4 flex items-center justify-end print:hidden">
          <ReportExportButtons
            reportType="pacientes-activos"
            title={config.name}
            description={config.description}
            metadata={data.metadata}
            kpis={data.kpis}
            tableColumns={COLUMNS.map((col) => ({ label: col.label, key: col.key }))}
            tableData={data.data as unknown as Array<Record<string, unknown>>}
            filters={currentFilters as unknown as Record<string, unknown>}
            filterLabels={{
              edadMin: "Edad mínima",
              edadMax: "Edad máxima",
              generos: "Géneros",
              inactivosDesdeDias: "Inactivos desde (días)",
              busqueda: "Búsqueda",
              soloConCitasPendientes: "Solo con citas pendientes",
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
          emptyMessage="No se encontraron pacientes con los filtros seleccionados"
          getRowKey={(row) => row.idPaciente}
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

