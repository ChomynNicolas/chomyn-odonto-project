// src/lib/hooks/use-report.ts
"use client"

/**
 * Custom hook for fetching report data with loading and error states.
 */

import { useState, useCallback, useRef } from "react"
import type { ReportType, ReportResponse, ReportFilters } from "@/types/reportes"
import { toast } from "sonner"

interface UseReportOptions<T extends ReportResponse> {
  reportType: ReportType
  onSuccess?: (data: T) => void
  onError?: (error: string) => void
}

interface UseReportReturn<TFilters, TResponse extends ReportResponse> {
  data: TResponse | null
  isLoading: boolean
  error: string | null
  filters: TFilters | null
  fetch: (filters: TFilters) => Promise<void>
  reset: () => void
  refetch: () => Promise<void>
}

/**
 * Hook for fetching report data from the API.
 */
export function useReport<
  TFilters extends ReportFilters,
  TResponse extends ReportResponse
>(options: UseReportOptions<TResponse>): UseReportReturn<TFilters, TResponse> {
  const { reportType, onSuccess, onError } = options

  const [data, setData] = useState<TResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<TFilters | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchReport = useCallback(async (newFilters: TFilters) => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)
    setFilters(newFilters)

    try {
      const response = await fetch(`/api/reportes/${reportType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters: newFilters }),
        signal: abortControllerRef.current.signal,
      })

      const result = await response.json()

      if (!result.ok) {
        throw new Error(result.error || "Error al generar el reporte")
      }

      setData(result.data as TResponse)
      onSuccess?.(result.data as TResponse)
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === "AbortError") {
        return
      }

      const message = err instanceof Error ? err.message : "Error desconocido"
      setError(message)
      onError?.(message)
      toast.error("Error al generar reporte", { description: message })
    } finally {
      setIsLoading(false)
    }
  }, [reportType, onSuccess, onError])

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setData(null)
    setError(null)
    setFilters(null)
    setIsLoading(false)
  }, [])

  const refetch = useCallback(async () => {
    if (filters) {
      await fetchReport(filters)
    }
  }, [filters, fetchReport])

  return {
    data,
    isLoading,
    error,
    filters,
    fetch: fetchReport,
    reset,
    refetch,
  }
}

/**
 * Hook for paginated reports with page change support.
 */
export function usePaginatedReport<
  TFilters extends ReportFilters & { page?: number; pageSize?: number },
  TResponse extends ReportResponse
>(options: UseReportOptions<TResponse>) {
  const report = useReport<TFilters, TResponse>(options)

  const changePage = useCallback((page: number) => {
    if (report.filters) {
      report.fetch({ ...report.filters, page })
    }
  }, [report])

  return {
    ...report,
    changePage,
  }
}

