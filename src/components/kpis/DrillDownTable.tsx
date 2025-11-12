"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { ExportColumn } from "@/lib/kpis/export-csv"
import ExportButton from "./ExportButton"


interface DrillDownTableProps {
  endpoint: string
  filters: Record<string, unknown>
  columns: Array<{
    key: string
    label: string
    format?: (value: unknown) => string
    sortable?: boolean
  }>
  exportColumns: ExportColumn[]
  exportFilename: string
  privacyMode?: boolean
  userId?: number
}

interface PaginationState {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export default function DrillDownTable({
  endpoint,
  filters,
  columns,
  exportColumns,
  exportFilename,
  privacyMode = false,
  userId,
}: DrillDownTableProps) {
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  })
  const [sortBy, setSortBy] = useState<string | undefined>()
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      // Agregar filtros
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          params.set(key, String(value))
        }
      })
      params.set("page", String(pagination.page))
      params.set("pageSize", String(pagination.pageSize))
      if (sortBy) {
        params.set("sortBy", sortBy)
        params.set("sortOrder", sortOrder)
      }

      const response = await fetch(`${endpoint}?${params}`)
      const result = await response.json()

      if (!result.ok) {
        throw new Error(result.error || "Error al cargar datos")
      }

      setData(result.data)
      setPagination((prev) => ({
        ...prev,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
      }))
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error al cargar datos"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [endpoint, filters, pagination.page, pagination.pageSize, sortBy, sortOrder])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function handleSort(key: string) {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(key)
      setSortOrder("asc")
    }
  }

  function goToPage(page: number) {
    setPagination((prev) => ({ ...prev, page }))
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header con exportación */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? "Cargando..." : `${pagination.total} registros encontrados`}
        </p>
        <ExportButton
          data={data}
          columns={exportColumns}
          filename={exportFilename}
          privacyMode={privacyMode}
          userId={userId}
          disabled={loading || data.length === 0}
        />
      </div>

      {/* Tabla */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={`px-4 py-3 text-left font-medium text-foreground ${
                      col.sortable ? "cursor-pointer hover:bg-accent" : ""
                    }`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-2">
                      {col.label}
                      {col.sortable && sortBy === col.key && (
                        <span className="text-xs">{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                    Cargando datos...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                    No hay datos para mostrar
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-accent/50 transition-colors">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-foreground">
                        {col.format ? col.format(row[col.key]) : (row[col.key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {pagination.page} de {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(1)}
              disabled={pagination.page === 1}
              className="p-2 rounded-lg border border-border bg-card hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Primera página"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-2 rounded-lg border border-border bg-card hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="p-2 rounded-lg border border-border bg-card hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => goToPage(pagination.totalPages)}
              disabled={pagination.page === pagination.totalPages}
              className="p-2 rounded-lg border border-border bg-card hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Última página"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
