// src/components/reportes/ReportFiltersForm.tsx
"use client"

/**
 * Report Filters Form Component
 * Reusable filter form with date range and custom filters.
 */

import { ReactNode, useState } from "react"
import { useForm, UseFormReturn, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Calendar, Filter, Search, X, RefreshCw } from "lucide-react"
import { getDefaultDateRange } from "@/lib/validation/reportes"

interface DateRangePreset {
  label: string
  getValue: () => { startDate: string; endDate: string }
}

const DATE_PRESETS: DateRangePreset[] = [
  {
    label: "Hoy",
    getValue: () => {
      const today = new Date().toISOString().split("T")[0]
      return { startDate: today, endDate: today }
    },
  },
  {
    label: "Últimos 7 días",
    getValue: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 7)
      return {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
      }
    },
  },
  {
    label: "Últimos 30 días",
    getValue: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)
      return {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
      }
    },
  },
  {
    label: "Este mes",
    getValue: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
      }
    },
  },
  {
    label: "Últimos 90 días",
    getValue: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 90)
      return {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
      }
    },
  },
]

interface ReportFiltersFormProps<T extends z.ZodObject<z.ZodRawShape>> {
  /** Zod schema for the form */
  schema: T
  /** Default values */
  defaultValues?: Partial<z.infer<T>>
  /** Callback when filters are submitted */
  onSubmit: (filters: z.infer<T>) => void
  /** Whether date range is included */
  hasDateRange?: boolean
  /** Custom filter fields */
  children?: (form: UseFormReturn<z.infer<T>>) => ReactNode
  /** Loading state */
  isLoading?: boolean
}

export function ReportFiltersForm<T extends z.ZodObject<z.ZodRawShape>>({
  schema,
  defaultValues,
  onSubmit,
  hasDateRange = true,
  children,
  isLoading,
}: ReportFiltersFormProps<T>) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const defaults = getDefaultDateRange()

  const form = useForm<z.infer<T>>({
    resolver: zodResolver(schema) as unknown as Resolver<z.infer<T>>,
    defaultValues: {
      startDate: defaults.startDate,
      endDate: defaults.endDate,
      ...defaultValues,
    } as unknown as Parameters<typeof useForm<z.infer<T>>>[0] extends { defaultValues?: infer D } ? D : never,
  })

  const handlePresetClick = (preset: DateRangePreset) => {
    const { startDate, endDate } = preset.getValue()
    form.setValue("startDate" as unknown as Parameters<typeof form.setValue>[0], startDate as unknown as Parameters<typeof form.setValue>[1])
    form.setValue("endDate" as unknown as Parameters<typeof form.setValue>[0], endDate as unknown as Parameters<typeof form.setValue>[1])
  }

  const handleReset = () => {
    form.reset({
      startDate: defaults.startDate,
      endDate: defaults.endDate,
      ...defaultValues,
    } as z.infer<T>)
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit as unknown as Parameters<typeof form.handleSubmit>[0])}
      className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950"
    >
      {/* Date range row */}
      {hasDateRange && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Date preset buttons */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <div className="flex flex-wrap gap-1">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-blue-700 dark:hover:bg-blue-900/50 dark:hover:text-blue-400"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date inputs */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              {...form.register("startDate" as unknown as Parameters<typeof form.register>[0])}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
            <span className="text-gray-400">—</span>
            <input
              type="date"
              {...form.register("endDate" as unknown as Parameters<typeof form.register>[0])}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      )}

      {/* Advanced filters toggle and submit */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <Filter className="h-4 w-4" />
          {showAdvanced ? "Ocultar filtros" : "Más filtros"}
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
            Limpiar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Generar
              </>
            )}
          </button>
        </div>
      </div>

      {/* Advanced filters */}
      {showAdvanced && children && (
        <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
          {children(form as UseFormReturn<z.infer<T>>)}
        </div>
      )}
    </form>
  )
}

/**
 * Applied filters summary component.
 */
export function AppliedFiltersChips({
  filters,
  onClear,
  labels,
}: {
  filters: Record<string, unknown>
  onClear: (key: string) => void
  labels?: Record<string, string>
}) {
  const activeFilters = Object.entries(filters).filter(
    ([key, value]) =>
      value !== undefined &&
      value !== null &&
      value !== "" &&
      !["page", "pageSize", "startDate", "endDate"].includes(key) &&
      !(Array.isArray(value) && value.length === 0)
  )

  if (activeFilters.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-gray-500 dark:text-gray-400">Filtros:</span>
      {activeFilters.map(([key, value]) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
        >
          {labels?.[key] ?? key}: {formatFilterValue(value)}
          <button
            onClick={() => onClear(key)}
            className="ml-0.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800"
            aria-label={`Quitar filtro ${key}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  )
}

function formatFilterValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `${value.length} seleccionados`
  }
  if (typeof value === "boolean") {
    return value ? "Sí" : "No"
  }
  return String(value)
}

