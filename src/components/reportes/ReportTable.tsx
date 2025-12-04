// src/components/reportes/ReportTable.tsx
"use client"

/**
 * Report Table Component
 * Generic data table with pagination for report data.
 */

import { ReactNode } from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import type { PaginationMeta } from "@/types/reportes"

/** Column definition for report tables */
interface TableColumn {
  key: string
  label: string
  sortable?: boolean
  align?: "left" | "center" | "right"
  format?: "text" | "number" | "currency" | "date" | "datetime" | "boolean"
  width?: string
}

interface ReportTableProps<T> {
  /** Column definitions */
  columns: TableColumn[]
  /** Data rows */
  data: T[]
  /** Pagination metadata */
  pagination?: PaginationMeta
  /** Callback when page changes */
  onPageChange?: (page: number) => void
  /** Loading state */
  isLoading?: boolean
  /** Empty state message */
  emptyMessage?: string
  /** Row key extractor */
  getRowKey: (row: T) => string | number
  /** Custom cell renderer */
  renderCell?: (column: TableColumn, row: T) => ReactNode
}

/**
 * Format cell value based on column format type.
 */
function formatCellValue(value: unknown, format?: string): string {
  if (value === null || value === undefined) return "-"

  switch (format) {
    case "number":
      return typeof value === "number"
        ? new Intl.NumberFormat("es-PY").format(value)
        : String(value)
    case "currency":
      // NOTA: El valor ya está en guaraníes (PYG), no dividir por 100
      return typeof value === "number"
        ? new Intl.NumberFormat("es-PY", {
            style: "currency",
            currency: "PYG",
            maximumFractionDigits: 0,
          }).format(value)
        : String(value)
    case "date":
      return value instanceof Date || typeof value === "string"
        ? new Date(value).toLocaleDateString("es-PY")
        : String(value)
    case "datetime":
      return value instanceof Date || typeof value === "string"
        ? new Date(value).toLocaleString("es-PY")
        : String(value)
    case "boolean":
      return value ? "Sí" : "No"
    default:
      return String(value)
  }
}

export function ReportTable<T>({
  columns,
  data,
  pagination,
  onPageChange,
  isLoading,
  emptyMessage = "No hay datos para mostrar",
  getRowKey,
  renderCell,
}: ReportTableProps<T>) {
  if (isLoading) {
    return <TableSkeleton columns={columns.length} rows={10} />
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 dark:border-gray-700 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`whitespace-nowrap px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400 ${
                    column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : ""
                  }`}
                  style={{ width: column.width }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-950">
            {data.map((row) => (
              <tr
                key={getRowKey(row)}
                className="hover:bg-gray-50 dark:hover:bg-gray-900/50"
              >
                {columns.map((column) => {
                  const value = getNestedValue(row, String(column.key))
                  const formattedValue = formatCellValue(value, column.format)

                  // Use renderCell if provided, but fallback to formattedValue if it returns null/undefined
                  const cellContent = renderCell ? renderCell(column, row) : null
                  const displayValue = cellContent != null ? cellContent : formattedValue

                  return (
                    <td
                      key={String(column.key)}
                      className={`whitespace-nowrap px-4 py-3 text-gray-900 dark:text-gray-100 ${
                        column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : ""
                      }`}
                    >
                      {displayValue}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && onPageChange && (
        <div className="flex items-center justify-between print:hidden">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Mostrando {(pagination.page - 1) * pagination.pageSize + 1} a{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} de{" "}
            {pagination.totalItems} resultados
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(1)}
              disabled={!pagination.hasPreviousPage}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
              aria-label="Primera página"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPreviousPage}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="px-3 text-sm text-gray-600 dark:text-gray-400">
              Página {pagination.page} de {pagination.totalPages}
            </span>

            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasNextPage}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onPageChange(pagination.totalPages)}
              disabled={!pagination.hasNextPage}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
              aria-label="Última página"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Get nested value from object using dot notation.
 */
function getNestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, obj)
}

/**
 * Table skeleton loader.
 */
function TableSkeleton({ columns, rows }: { columns: number; rows: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <div className="h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-950">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-3">
                  <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

