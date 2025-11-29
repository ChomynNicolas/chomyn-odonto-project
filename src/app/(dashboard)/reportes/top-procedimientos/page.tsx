// src/app/(dashboard)/reportes/top-procedimientos/page.tsx
"use client"

/**
 * Top Procedures Ranking Report Page
 * Shows ranking of most frequent and highest revenue procedures.
 */

import { useState, useCallback } from "react"
import { ReportShell, ReportKpiCards, ReportFiltersForm, ReportExportButtons } from "@/components/reportes"
import { topProcedimientosFiltersSchema } from "@/lib/validation/reportes"
import {
  REPORT_CONFIGS,
  type TopProcedimientosFilters,
  type TopProcedimientosResponse,
} from "@/types/reportes"
import { toast } from "sonner"
import { Trophy, TrendingUp, DollarSign } from "lucide-react"

/** Format currency (PYG) */
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export default function TopProcedimientosReportPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<TopProcedimientosResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentFilters, setCurrentFilters] = useState<TopProcedimientosFilters | null>(null)

  const config = REPORT_CONFIGS["top-procedimientos"]

  const fetchReport = useCallback(async (filters: TopProcedimientosFilters) => {
    setIsLoading(true)
    setError(null)
    setCurrentFilters(filters)

    try {
      const response = await fetch("/api/reportes/top-procedimientos", {
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

  return (
    <ReportShell
      config={config}
      isLoading={isLoading}
      error={error}
      filters={
        <ReportFiltersForm
          schema={topProcedimientosFiltersSchema}
          onSubmit={fetchReport}
          isLoading={isLoading}
          hasDateRange
          defaultValues={{ limite: 10, ordenarPor: "cantidad" }}
        >
          {(form) => (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Cantidad de resultados
                </label>
                <select
                  {...form.register("limite", { valueAsNumber: true })}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                  <option value={20}>Top 20</option>
                  <option value={50}>Top 50</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ordenar por
                </label>
                <select
                  {...form.register("ordenarPor")}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <option value="cantidad">Cantidad (frecuencia)</option>
                  <option value="ingresos">Ingresos (valor)</option>
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
            reportType="top-procedimientos"
            title={config.name}
            description={config.description}
            metadata={data.metadata}
            kpis={data.kpis}
            tableColumns={[
              { label: "Ranking", key: "ranking" },
              { label: "Procedimiento", key: "procedimiento.nombre" },
              { label: "Código", key: "procedimiento.codigo" },
              { label: "Cantidad", key: "cantidad" },
              { label: "Ingresos", key: "ingresosTotalCents" },
            ]}
            tableData={data.data as unknown as Array<Record<string, unknown>>}
            filters={currentFilters as unknown as Record<string, unknown>}
            filterLabels={{
              startDate: "Fecha desde",
              endDate: "Fecha hasta",
              limite: "Cantidad de resultados",
              ordenarPor: "Ordenar por",
            }}
            scope="fullDataset"
            disabled={isLoading}
          />
        </div>
      )}
      {data ? (
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.data.map((item) => (
              <div
                key={item.ranking}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/50"
              >
                {/* Ranking badge */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 font-bold text-white shadow-sm">
                  {item.ranking <= 3 ? (
                    <Trophy className="h-5 w-5" />
                  ) : (
                    item.ranking
                  )}
                </div>

                {/* Procedure info */}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium text-gray-900 dark:text-gray-100">
                    {item.procedimiento.nombre}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {item.procedimiento.codigo || "Sin código"}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <div className="flex items-center justify-end gap-1 text-gray-500 dark:text-gray-400">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-xs">Cantidad</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {item.cantidad}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.porcentajeCantidad.toFixed(1)}% del total
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-end gap-1 text-gray-500 dark:text-gray-400">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-xs">Ingresos</span>
                    </div>
                    <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(item.ingresosTotalCents)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.porcentajeIngresos.toFixed(1)}% del total
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="hidden w-32 flex-col gap-1 lg:flex">
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${item.porcentajeCantidad}%` }}
                    />
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: `${item.porcentajeIngresos}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {data.data.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No hay procedimientos en el período seleccionado.
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-gray-500 dark:text-gray-400">
            Selecciona los filtros y haz clic en &quot;Generar&quot; para ver el ranking.
          </p>
        </div>
      )}
    </ReportShell>
  )
}

