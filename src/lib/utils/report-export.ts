// src/lib/utils/report-export.ts
/**
 * Report Export Utilities
 * Handles PDF generation and export functionality for reports.
 */

import type { ReportKpi, ReportMetadata } from "@/types/reportes"

/** Export scope options */
export type ExportScope = "currentPage" | "fullDataset"

/** Options for PDF generation */
export interface PdfExportOptions {
  title: string
  description?: string
  clinicName?: string
  metadata: ReportMetadata
  kpis?: ReportKpi[]
  tableColumns?: Array<{ label: string; key: string }>
  tableData?: Array<Record<string, unknown>>
  appliedFilters?: Record<string, string>
  /** Export scope - defaults to fullDataset */
  scope?: ExportScope
  /** Total count of records (for full dataset exports) */
  totalRecords?: number
}

/** Format a filter value for display */
function formatFilterValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return ""
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : ""
  }
  if (typeof value === "boolean") return value ? "Sí" : "No"
  if (key.includes("Date") && typeof value === "string") {
    return new Date(value).toLocaleDateString("es-PY")
  }
  return String(value)
}

/**
 * Generate PDF from report data using jsPDF.
 * Dynamically imports jsPDF to avoid SSR issues.
 */
export async function generateReportPdf(options: PdfExportOptions): Promise<Blob> {
  const { jsPDF } = await import("jspdf")
  
  const {
    title,
    description,
    clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME || "Clínica Dental",
    metadata,
    kpis,
    tableColumns,
    tableData,
    appliedFilters,
  } = options

  // Create PDF document (A4 size)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let yPos = margin

  // Helper to add new page if needed
  const checkPageBreak = (neededHeight: number) => {
    if (yPos + neededHeight > pageHeight - margin) {
      doc.addPage()
      yPos = margin
      return true
    }
    return false
  }

  // ============== HEADER ==============
  // Clinic name
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(clinicName, margin, yPos)
  
  // Generation date (right aligned)
  const dateStr = new Date(metadata.generatedAt).toLocaleString("es-PY")
  doc.text(dateStr, pageWidth - margin, yPos, { align: "right" })
  yPos += 8

  // Report title
  doc.setFontSize(18)
  doc.setTextColor(30, 30, 30)
  doc.text(title, margin, yPos)
  yPos += 7

  // Description
  if (description) {
    doc.setFontSize(10)
    doc.setTextColor(80, 80, 80)
    const splitDesc = doc.splitTextToSize(description, pageWidth - 2 * margin)
    doc.text(splitDesc, margin, yPos)
    yPos += splitDesc.length * 5 + 3
  }

  // Separator line
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 8

  // ============== APPLIED FILTERS ==============
  if (appliedFilters && Object.keys(appliedFilters).length > 0) {
    doc.setFontSize(11)
    doc.setTextColor(30, 30, 30)
    doc.text("Filtros aplicados:", margin, yPos)
    yPos += 6

    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    Object.entries(appliedFilters).forEach(([key, value]) => {
      if (value) {
        checkPageBreak(5)
        doc.text(`• ${key}: ${value}`, margin + 5, yPos)
        yPos += 5
      }
    })
    yPos += 5
  }

  // ============== KPIs ==============
  if (kpis && kpis.length > 0) {
    checkPageBreak(30)
    doc.setFontSize(11)
    doc.setTextColor(30, 30, 30)
    doc.text("Indicadores Clave:", margin, yPos)
    yPos += 6

    // Grid layout for KPIs (3 per row)
    const kpiWidth = (pageWidth - 2 * margin - 10) / 3
    const kpiHeight = 18
    
    kpis.forEach((kpi, index) => {
      const col = index % 3
      const row = Math.floor(index / 3)
      
      if (col === 0 && row > 0) {
        checkPageBreak(kpiHeight + 5)
      }
      
      const x = margin + col * (kpiWidth + 5)
      const y = yPos + row * (kpiHeight + 3)

      // KPI box
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(x, y, kpiWidth, kpiHeight, 2, 2, "F")

      // KPI label
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(kpi.label, x + 3, y + 5)

      // KPI value
      doc.setFontSize(14)
      doc.setTextColor(30, 30, 30)
      const formattedValue = formatKpiValue(kpi)
      doc.text(formattedValue, x + 3, y + 13)
    })

    // Update yPos based on number of KPI rows
    const kpiRows = Math.ceil(kpis.length / 3)
    yPos += kpiRows * (kpiHeight + 3) + 10
  }

  // ============== TABLE ==============
  if (tableColumns && tableData && tableData.length > 0) {
    checkPageBreak(30)
    doc.setFontSize(11)
    doc.setTextColor(30, 30, 30)
    doc.text("Datos:", margin, yPos)
    yPos += 6

    // Calculate column widths
    const tableWidth = pageWidth - 2 * margin
    const colWidth = tableWidth / tableColumns.length
    const rowHeight = 7
    const headerHeight = 8

    // Table header
    doc.setFillColor(240, 240, 240)
    doc.rect(margin, yPos, tableWidth, headerHeight, "F")
    doc.setFontSize(8)
    doc.setTextColor(60, 60, 60)

    tableColumns.forEach((col, i) => {
      const x = margin + i * colWidth + 2
      doc.text(col.label, x, yPos + 5, { maxWidth: colWidth - 4 })
    })
    yPos += headerHeight

    // Table rows
    doc.setFontSize(8)
    doc.setTextColor(30, 30, 30)

    const scope = options.scope ?? "fullDataset"
    const dataToExport = scope === "fullDataset" ? tableData : tableData.slice(0, 50)

    dataToExport.forEach((row, rowIndex) => {
      if (checkPageBreak(rowHeight)) {
        // Re-draw header on new page
        doc.setFillColor(240, 240, 240)
        doc.rect(margin, yPos, tableWidth, headerHeight, "F")
        doc.setTextColor(60, 60, 60)
        tableColumns.forEach((col, i) => {
          const x = margin + i * colWidth + 2
          doc.text(col.label, x, yPos + 5, { maxWidth: colWidth - 4 })
        })
        yPos += headerHeight
        doc.setTextColor(30, 30, 30)
      }

      // Alternate row background
      if (rowIndex % 2 === 1) {
        doc.setFillColor(250, 250, 250)
        doc.rect(margin, yPos, tableWidth, rowHeight, "F")
      }

      // Cell values
      tableColumns.forEach((col, i) => {
        const x = margin + i * colWidth + 2
        const value = getNestedValue(row, col.key)
        const text = value !== null && value !== undefined ? String(value) : "-"
        doc.text(text, x, yPos + 5, { maxWidth: colWidth - 4 })
      })
      yPos += rowHeight
    })

    // Note about export scope
    if (scope === "currentPage" && tableData.length > 50) {
      yPos += 3
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(`* Mostrando 50 de ${tableData.length} registros (página actual)`, margin, yPos)
    } else if (scope === "fullDataset" && options.totalRecords && options.totalRecords > tableData.length) {
      yPos += 3
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(`* Mostrando ${tableData.length} de ${options.totalRecords} registros filtrados`, margin, yPos)
    }
  }

  // ============== FOOTER ==============
  const totalPages = doc.internal.pages.length - 1
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    )
    doc.text(
      `Generado por ${metadata.generatedBy.username} (${metadata.generatedBy.role})`,
      margin,
      pageHeight - 10
    )
  }

  return doc.output("blob")
}

/**
 * Format KPI value for display in PDF.
 */
function formatKpiValue(kpi: ReportKpi): string {
  const value = kpi.value
  if (typeof value === "string") return value

  switch (kpi.format) {
    case "percent":
      return `${value.toFixed(kpi.decimals ?? 1)}%`
    case "currency":
      // NOTA: El valor ya está en guaraníes (PYG), no dividir por 100
      return new Intl.NumberFormat("es-PY", {
        style: "currency",
        currency: "PYG",
        maximumFractionDigits: 0,
      }).format(value)
    case "time":
      return `${Math.round(value)} min`
    default:
      return new Intl.NumberFormat("es-PY", {
        maximumFractionDigits: kpi.decimals ?? 0,
      }).format(value)
  }
}

/**
 * Get nested value from object.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, obj as unknown)
}

/**
 * Download a blob as a file.
 */
export function downloadBlob(blob: Blob, filename: string): void {
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
 * Generate filename for report export.
 */
export function generateReportFilename(
  reportType: string,
  format: "pdf" | "csv" = "pdf"
): string {
  const date = new Date().toISOString().split("T")[0]
  return `reporte-${reportType}-${date}.${format}`
}

/**
 * Normalize filters for export by:
 * - Removing empty arrays (converting to undefined)
 * - Removing page and pageSize fields (backend will set these)
 * - Converting null values to undefined
 * - Ensuring proper types
 */
export function normalizeFiltersForExport(
  filters: Record<string, unknown>
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(filters)) {
    // Skip pagination fields - they will be set by the backend
    if (key === "page" || key === "pageSize") {
      continue
    }

    // Convert null to undefined
    if (value === null) {
      continue
    }

    // Remove empty arrays (convert to undefined for optional fields)
    if (Array.isArray(value) && value.length === 0) {
      continue
    }

    // Keep other values as-is
    normalized[key] = value
  }

  return normalized
}

/**
 * Format filters for display in exports.
 */
export function formatFiltersForExport(
  filters: Record<string, unknown>,
  labels?: Record<string, string>
): Record<string, string> {
  const formatted: Record<string, string> = {}

  for (const [key, value] of Object.entries(filters)) {
    // Skip internal/pagination fields
    if (["page", "pageSize"].includes(key)) continue
    if (value === undefined || value === null) continue
    if (Array.isArray(value) && value.length === 0) continue

    const label = labels?.[key] || key
    formatted[label] = formatFilterValue(key, value)
  }

  return formatted
}

