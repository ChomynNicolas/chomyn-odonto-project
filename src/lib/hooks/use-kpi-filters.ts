// src/lib/hooks/use-kpi-filters.ts
"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useCallback, useMemo } from "react"
import { getDateRangeFromPreset } from "@/lib/kpis/date-range"
import { KpiFilters } from "@/app/api/dashboard/kpi/_dto"
import { DateRangePreset } from "@/app/api/dashboard/kpi/_schemas"

/**
 * Hook para gestionar filtros de KPIs con sincronización URL
 */
export function useKpiFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Parsear filtros desde URL
  const filters = useMemo<KpiFilters>(() => {
    const preset = (searchParams.get("preset") as DateRangePreset) || "last30days"
    const customStart = searchParams.get("startDate")
    const customEnd = searchParams.get("endDate")

    let dateRange
    if (preset === "custom" && customStart && customEnd) {
      dateRange = getDateRangeFromPreset("custom", new Date(customStart), new Date(customEnd))
    } else {
      dateRange = getDateRangeFromPreset(preset)
    }

    return {
      startDate: dateRange.start.toISOString(),
      endDate: dateRange.end.toISOString(),
      profesionalIds: searchParams.get("profesionalIds")?.split(",").map(Number).filter(Boolean),
      consultorioIds: searchParams.get("consultorioIds")?.split(",").map(Number).filter(Boolean),
      tipoCita: searchParams.get("tipoCita")?.split(",").filter(Boolean),
      estadoCita: searchParams.get("estadoCita")?.split(",").filter(Boolean),
      procedimientoIds: searchParams.get("procedimientoIds")?.split(",").map(Number).filter(Boolean),
      diagnosisIds: searchParams.get("diagnosisIds")?.split(",").map(Number).filter(Boolean),
      genero: searchParams.get("genero")?.split(",").filter(Boolean),
      edadMin: searchParams.get("edadMin") ? Number(searchParams.get("edadMin")) : undefined,
      edadMax: searchParams.get("edadMax") ? Number(searchParams.get("edadMax")) : undefined,
      pacienteNuevo: searchParams.get("pacienteNuevo") === "true",
      privacyMode: searchParams.get("privacyMode") === "true",
    }
  }, [searchParams])

  // Actualizar filtros en URL
  const updateFilters = useCallback(
    (updates: Partial<KpiFilters> & { preset?: DateRangePreset }) => {
      const params = new URLSearchParams(searchParams.toString())

      // Preset de fecha
      if (updates.preset) {
        params.set("preset", updates.preset)
        if (updates.preset !== "custom") {
          params.delete("startDate")
          params.delete("endDate")
        }
      }

      // Fechas custom
      if (updates.startDate) params.set("startDate", updates.startDate)
      if (updates.endDate) params.set("endDate", updates.endDate)

      // Arrays
      if (updates.profesionalIds !== undefined) {
        if (updates.profesionalIds.length > 0) {
          params.set("profesionalIds", updates.profesionalIds.join(","))
        } else {
          params.delete("profesionalIds")
        }
      }

      if (updates.consultorioIds !== undefined) {
        if (updates.consultorioIds.length > 0) {
          params.set("consultorioIds", updates.consultorioIds.join(","))
        } else {
          params.delete("consultorioIds")
        }
      }

      if (updates.tipoCita !== undefined) {
        if (updates.tipoCita.length > 0) {
          params.set("tipoCita", updates.tipoCita.join(","))
        } else {
          params.delete("tipoCita")
        }
      }

      if (updates.estadoCita !== undefined) {
        if (updates.estadoCita.length > 0) {
          params.set("estadoCita", updates.estadoCita.join(","))
        } else {
          params.delete("estadoCita")
        }
      }

      if (updates.procedimientoIds !== undefined) {
        if (updates.procedimientoIds.length > 0) {
          params.set("procedimientoIds", updates.procedimientoIds.join(","))
        } else {
          params.delete("procedimientoIds")
        }
      }

      if (updates.diagnosisIds !== undefined) {
        if (updates.diagnosisIds.length > 0) {
          params.set("diagnosisIds", updates.diagnosisIds.join(","))
        } else {
          params.delete("diagnosisIds")
        }
      }

      if (updates.genero !== undefined) {
        if (updates.genero.length > 0) {
          params.set("genero", updates.genero.join(","))
        } else {
          params.delete("genero")
        }
      }

      // Números
      if (updates.edadMin !== undefined) {
        params.set("edadMin", String(updates.edadMin))
      }
      if (updates.edadMax !== undefined) {
        params.set("edadMax", String(updates.edadMax))
      }

      // Booleanos
      if (updates.pacienteNuevo !== undefined) {
        params.set("pacienteNuevo", String(updates.pacienteNuevo))
      }
      if (updates.privacyMode !== undefined) {
        params.set("privacyMode", String(updates.privacyMode))
      }

      router.push(`${pathname}?${params.toString()}`)
    },
    [searchParams, router, pathname],
  )

  // Limpiar todos los filtros
  const clearFilters = useCallback(() => {
    router.push(pathname)
  }, [router, pathname])

  // Preset actual
  const currentPreset = (searchParams.get("preset") as DateRangePreset) || "last30days"

  return {
    filters,
    updateFilters,
    clearFilters,
    currentPreset,
  }
}
