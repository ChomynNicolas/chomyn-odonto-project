// src/components/kpis/KpiFiltersBar.tsx
"use client"

import { Calendar, Filter, X, Eye, EyeOff } from "lucide-react"
import { formatDateInTZ } from "@/lib/date-utils"
import { DateRangePreset } from "@/app/api/dashboard/kpi/_schemas";
import { useKpiFilters } from "@/lib/hooks/use-kpi-filters";

interface KpiFiltersBarProps {
  profesionales?: Array<{ id: number; nombre: string }>
  consultorios?: Array<{ id: number; nombre: string }>
  showAdvanced?: boolean
}

const DATE_PRESETS: Array<{ value: DateRangePreset; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "last7days", label: "Últimos 7 días" },
  { value: "last30days", label: "Últimos 30 días" },
  { value: "last90days", label: "Últimos 90 días" },
  { value: "currentMonth", label: "Mes actual" },
  { value: "custom", label: "Personalizado" },
]

export function KpiFiltersBar({ profesionales, consultorios, showAdvanced = false }: KpiFiltersBarProps) {
  const { filters, updateFilters, clearFilters, currentPreset } = useKpiFilters()

  // Contar filtros activos
  const activeFiltersCount = [
    filters.profesionalIds?.length,
    filters.consultorioIds?.length,
    filters.tipoCita?.length,
    filters.estadoCita?.length,
    filters.procedimientoIds?.length,
    filters.diagnosisIds?.length,
    filters.genero?.length,
    filters.edadMin !== undefined,
    filters.edadMax !== undefined,
    filters.pacienteNuevo,
  ].filter(Boolean).length

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      {/* Fila principal: Rango de fechas + Modo privacidad */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Selector de preset de fecha */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" aria-hidden="true" />
          <div className="flex gap-1 rounded-lg border border-gray-200 p-1 dark:border-gray-800">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => updateFilters({ preset: preset.value })}
                className={`
                  rounded-md px-3 py-1.5 text-sm font-medium transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                  ${
                    currentPreset === preset.value
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  }
                `}
                aria-current={currentPreset === preset.value ? "true" : undefined}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rango de fechas actual */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {formatDateInTZ(new Date(filters.startDate), { dateStyle: "short" })} -{" "}
          {formatDateInTZ(new Date(filters.endDate), { dateStyle: "short" })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Modo privacidad */}
          <button
            onClick={() => updateFilters({ privacyMode: !filters.privacyMode })}
            className={`
              flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
              ${
                filters.privacyMode
                  ? "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300 dark:hover:bg-gray-900"
              }
            `}
            aria-pressed={filters.privacyMode}
            aria-label={filters.privacyMode ? "Desactivar modo privacidad" : "Activar modo privacidad"}
          >
            {filters.privacyMode ? (
              <>
                <EyeOff className="h-4 w-4" aria-hidden="true" />
                Modo privado
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" aria-hidden="true" />
                Modo normal
              </>
            )}
          </button>

          {/* Limpiar filtros */}
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300 dark:hover:bg-gray-900"
              aria-label="Limpiar todos los filtros"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Limpiar ({activeFiltersCount})
            </button>
          )}
        </div>
      </div>

      {/* Filtros avanzados (opcional) */}
      {showAdvanced && (
        <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-4 dark:border-gray-800">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Filter className="h-4 w-4" aria-hidden="true" />
            Filtros avanzados:
          </div>

          {/* Profesionales */}
          {profesionales && profesionales.length > 0 && (
            <select
              multiple
              value={filters.profesionalIds?.map(String) || []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map((opt) => Number(opt.value))
                updateFilters({ profesionalIds: selected })
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-800 dark:bg-gray-950"
              aria-label="Filtrar por profesionales"
            >
              {profesionales.map((prof) => (
                <option key={prof.id} value={prof.id}>
                  {prof.nombre}
                </option>
              ))}
            </select>
          )}

          {/* Consultorios */}
          {consultorios && consultorios.length > 0 && (
            <select
              multiple
              value={filters.consultorioIds?.map(String) || []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map((opt) => Number(opt.value))
                updateFilters({ consultorioIds: selected })
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-800 dark:bg-gray-950"
              aria-label="Filtrar por consultorios"
            >
              {consultorios.map((cons) => (
                <option key={cons.id} value={cons.id}>
                  {cons.nombre}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Chips de filtros activos */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-3 dark:border-gray-800">
          {filters.profesionalIds && filters.profesionalIds.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              Profesionales: {filters.profesionalIds.length}
              <button
                onClick={() => updateFilters({ profesionalIds: [] })}
                className="ml-1 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800"
                aria-label="Quitar filtro de profesionales"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          )}

          {filters.consultorioIds && filters.consultorioIds.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
              Consultorios: {filters.consultorioIds.length}
              <button
                onClick={() => updateFilters({ consultorioIds: [] })}
                className="ml-1 rounded-full hover:bg-green-200 dark:hover:bg-green-800"
                aria-label="Quitar filtro de consultorios"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          )}

          {filters.privacyMode && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300">
              <EyeOff className="h-3 w-3" aria-hidden="true" />
              Modo privado
            </span>
          )}
        </div>
      )}
    </div>
  )
}
