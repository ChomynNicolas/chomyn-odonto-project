// src/app/(dashboard)/reportes/estados-citas/page.tsx
"use client"

/**
 * Appointment Status Analysis Report Page
 * Analyzes appointment status distribution and trends over time.
 */

import { useState, useCallback } from "react"
import { ReportShell, ReportKpiCards, ReportFiltersForm, ReportExportButtons } from "@/components/reportes"
import { estadosCitasFiltersSchema } from "@/lib/validation/reportes"
import {
  REPORT_CONFIGS,
  type EstadosCitasFilters,
  type EstadosCitasResponse,
} from "@/types/reportes"
import { toast } from "sonner"

/** Status labels and colors */
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  SCHEDULED: { label: "Agendada", color: "#6B7280", bgColor: "bg-gray-100 dark:bg-gray-800" },
  CONFIRMED: { label: "Confirmada", color: "#3B82F6", bgColor: "bg-blue-100 dark:bg-blue-900/50" },
  CHECKED_IN: { label: "En espera", color: "#8B5CF6", bgColor: "bg-purple-100 dark:bg-purple-900/50" },
  IN_PROGRESS: { label: "En atención", color: "#F59E0B", bgColor: "bg-amber-100 dark:bg-amber-900/50" },
  COMPLETED: { label: "Completada", color: "#10B981", bgColor: "bg-green-100 dark:bg-green-900/50" },
  CANCELLED: { label: "Cancelada", color: "#EF4444", bgColor: "bg-red-100 dark:bg-red-900/50" },
  NO_SHOW: { label: "No asistió", color: "#F97316", bgColor: "bg-orange-100 dark:bg-orange-900/50" },
}

export default function EstadosCitasReportPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<EstadosCitasResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const config = REPORT_CONFIGS["estados-citas"]

  const fetchReport = useCallback(async (filters: EstadosCitasFilters) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/reportes/estados-citas", {
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

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  return (
    <ReportShell
      config={config}
      isLoading={isLoading}
      error={error}
      onPrint={handlePrint}
      filters={
        <ReportFiltersForm
          schema={estadosCitasFiltersSchema}
          onSubmit={fetchReport}
          isLoading={isLoading}
          hasDateRange
          defaultValues={{ agruparPor: "semana" }}
        >
          {(form) => (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Agrupar por
                </label>
                <select
                  {...form.register("agruparPor")}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <option value="dia">Día</option>
                  <option value="semana">Semana</option>
                  <option value="mes">Mes</option>
                </select>
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
            reportType="estados-citas"
            title={config.name}
            description={config.description}
            metadata={data.metadata}
            kpis={data.kpis}
            tableColumns={[
              { label: "Período", key: "periodo" },
              { label: "Total", key: "total" },
            ]}
            tableData={data.data.map((period) => ({
              periodo: period.periodo,
              total: period.total,
              ...period.estadisticas.reduce((acc, stat) => {
                acc[stat.estado] = `${stat.cantidad} (${stat.porcentaje.toFixed(1)}%)`
                return acc
              }, {} as Record<string, string>),
            })) as unknown as Array<Record<string, unknown>>}
            filters={{}}
            filterLabels={{
              startDate: "Fecha desde",
              endDate: "Fecha hasta",
              agruparPor: "Agrupar por",
            }}
            scope="fullDataset"
            disabled={isLoading}
          />
        </div>
      )}
      {data ? (
        <div className="flex flex-col gap-6">
          {/* Overall Summary */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Resumen General
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data.resumenGeneral.map((item) => {
                const cfg = STATUS_CONFIG[item.estado]
                return (
                  <div
                    key={item.estado}
                    className={`flex items-center justify-between rounded-lg p-3 ${cfg?.bgColor || "bg-gray-100"}`}
                  >
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {cfg?.label || item.estado}
                    </span>
                    <div className="text-right">
                      <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {item.cantidad}
                      </span>
                      <span className="ml-1 text-sm text-gray-500">
                        ({item.porcentaje.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Trend by Period */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Tendencia por Período
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                      Período
                    </th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-400">
                      Total
                    </th>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <th
                        key={key}
                        className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-400"
                      >
                        {cfg.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((period) => (
                    <tr
                      key={period.periodo}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">
                        {period.periodo}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold text-gray-900 dark:text-gray-100">
                        {period.total}
                      </td>
                      {Object.keys(STATUS_CONFIG).map((status) => {
                        const stat = period.estadisticas.find((s) => s.estado === status)
                        return (
                          <td key={status} className="px-3 py-2 text-center">
                            {stat ? (
                              <span className="text-gray-700 dark:text-gray-300">
                                {stat.cantidad}
                                <span className="ml-1 text-xs text-gray-400">
                                  ({stat.porcentaje.toFixed(0)}%)
                                </span>
                              </span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-gray-500 dark:text-gray-400">
            Selecciona los filtros y haz clic en &quot;Generar&quot; para ver el análisis.
          </p>
        </div>
      )}
    </ReportShell>
  )
}

