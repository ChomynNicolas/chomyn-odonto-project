"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { ExportColumn, generateCSV, downloadCSV } from "@/lib/kpis/export-csv"

interface ExportButtonProps {
  data: Record<string, unknown>[]
  columns: ExportColumn[]
  filename: string
  privacyMode?: boolean
  userId?: number
  disabled?: boolean
}

export default function ExportButton({
  data,
  columns,
  filename,
  privacyMode = false,
  userId,
  disabled = false,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  async function handleExport() {
    if (disabled || isExporting) return

    setIsExporting(true)

    try {
      // Generar CSV
      const csv = generateCSV({
        filename,
        columns,
        data,
        privacyMode,
      })

      // Descargar
      downloadCSV(csv, filename)

      // Registrar auditoría si hay userId
      if (userId) {
        await fetch("/api/audit/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            action: "EXPORT_CSV",
            resource: filename,
            recordCount: data.length,
            privacyMode,
          }),
        }).catch((err) => console.error("Failed to log export:", err))
      }
    } catch (error) {
      console.error("Export failed:", error)
      alert("Error al exportar datos. Por favor intenta nuevamente.")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={disabled || isExporting || data.length === 0}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`Exportar ${data.length} registros a CSV`}
    >
      <Download className="w-4 h-4" />
      {isExporting ? "Exportando..." : "Exportar CSV"}
    </button>
  )
}
