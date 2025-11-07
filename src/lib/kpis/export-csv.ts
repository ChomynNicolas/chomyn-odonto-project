/**
 * Utilidades para exportación de datos a CSV
 * Respeta modo privacidad y permisos RBAC
 */

import { ofuscarNombre, ofuscarDocumento, ofuscarTelefono } from "./privacy"

export interface ExportColumn {
  key: string
  label: string
  format?: (value: any) => string
  sensitive?: boolean // Si es PII que debe ofuscarse en modo privacidad
}

export interface ExportOptions {
  filename: string
  columns: ExportColumn[]
  data: any[]
  privacyMode?: boolean
}

/**
 * Genera CSV desde datos estructurados
 */
export function generateCSV(options: ExportOptions): string {
  const { columns, data, privacyMode = false } = options

  // Header
  const header = columns.map((col) => escapeCSV(col.label)).join(",")

  // Rows
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        let value = row[col.key]

        // Aplicar formato si existe
        if (col.format && value !== null && value !== undefined) {
          value = col.format(value)
        }

        // Ofuscar si es sensible y modo privacidad está activo
        if (col.sensitive && privacyMode && typeof value === "string") {
          if (col.key.includes("nombre") || col.key.includes("paciente")) {
            value = ofuscarNombre(value)
          } else if (col.key.includes("documento") || col.key.includes("ci")) {
            value = ofuscarDocumento(value)
          } else if (col.key.includes("telefono") || col.key.includes("celular")) {
            value = ofuscarTelefono(value)
          }
        }

        return escapeCSV(String(value ?? ""))
      })
      .join(",")
  })

  return [header, ...rows].join("\n")
}

/**
 * Escapa valores para CSV (maneja comillas, comas, saltos de línea)
 */
function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Descarga CSV en el navegador
 */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }) // BOM para Excel
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Hook para exportar datos con auditoría
 */
export async function exportWithAudit(options: ExportOptions, userId: number, action: string): Promise<void> {
  const csv = generateCSV(options)
  downloadCSV(csv, options.filename)

  // Registrar en auditoría (llamada al servidor)
  try {
    await fetch("/api/audit/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        action,
        resource: options.filename,
        recordCount: options.data.length,
        privacyMode: options.privacyMode,
      }),
    })
  } catch (error) {
    console.error("Failed to log export audit:", error)
  }
}
