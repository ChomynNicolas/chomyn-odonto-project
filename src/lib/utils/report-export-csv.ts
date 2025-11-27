// src/lib/utils/report-export-csv.ts
/**
 * CSV Export Utilities for Reports
 * Handles CSV generation with proper escaping, encoding, and Excel compatibility.
 */

import Papa from "papaparse"

/** Options for CSV export */
export interface CsvExportOptions {
  /** Column definitions with labels and keys */
  columns: Array<{ label: string; key: string }>
  /** Data rows to export */
  data: Array<Record<string, unknown>>
  /** Report title for filename */
  reportTitle?: string
  /** Include BOM for Excel UTF-8 compatibility */
  includeBom?: boolean
}

/**
 * Flatten nested object values (e.g., paciente.nombreCompleto → value)
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, obj as unknown)
}

/**
 * Format a value for CSV export.
 * Handles dates, numbers, booleans, and null/undefined.
 */
function formatCsvValue(value: unknown): string {
  if (value === null || value === undefined) return ""
  
  if (value instanceof Date) {
    return value.toLocaleString("es-PY")
  }
  
  if (typeof value === "boolean") {
    return value ? "Sí" : "No"
  }
  
  if (typeof value === "number") {
    return String(value)
  }
  
  // For objects/arrays, convert to JSON string
  if (typeof value === "object") {
    return JSON.stringify(value)
  }
  
  return String(value)
}

/**
 * Generate CSV content from report data.
 * Returns CSV string with proper escaping and encoding.
 */
export function generateReportCsv(options: CsvExportOptions): string {
  const { columns, data, includeBom = true } = options

  // Build header row
  const headers = columns.map((col) => col.label)

  // Build data rows
  const rows = data.map((row) => {
    return columns.map((col) => {
      const value = getNestedValue(row, col.key)
      return formatCsvValue(value)
    })
  })

  // Combine headers and rows
  const csvData = [headers, ...rows]

  // Generate CSV using PapaParse
  const csv = Papa.unparse(csvData, {
    delimiter: ",",
    newline: "\n",
    header: false, // We're providing headers manually
    quotes: true, // Quote fields that contain commas, quotes, or newlines
    escapeChar: '"',
  })

  // Add UTF-8 BOM for Excel compatibility (if requested)
  if (includeBom) {
    return "\uFEFF" + csv
  }

  return csv
}

/**
 * Download CSV as a file.
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Generate CSV filename for report export.
 */
export function generateCsvFilename(reportType: string): string {
  const date = new Date().toISOString().split("T")[0]
  return `reporte-${reportType}-${date}.csv`
}

/**
 * Export report data to CSV with automatic download.
 */
export async function exportReportToCsv(options: CsvExportOptions): Promise<void> {
  const csvContent = generateReportCsv(options)
  const filename = options.reportTitle
    ? generateCsvFilename(options.reportTitle)
    : `reporte-${new Date().toISOString().split("T")[0]}.csv`
  
  downloadCsv(csvContent, filename)
}

