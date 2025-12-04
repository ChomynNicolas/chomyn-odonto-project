// src/app/(dashboard)/reportes/diagnosticos-pendientes-seguimiento/page.tsx
"use client"

/**
 * Pending Follow-up Diagnoses Report Page
 * Lists diagnoses with status UNDER_FOLLOW_UP with patient information,
 * days in follow-up, last evaluation, next appointment, and evolution notes.
 */

import { useState, useCallback, useEffect } from "react"
import { ReportShell, ReportKpiCards, ReportTable, ReportFiltersForm, ReportExportButtons } from "@/components/reportes"
import { diagnosticosPendientesSeguimientoFiltersSchema } from "@/lib/validation/reportes"
import {
  REPORT_CONFIGS,
  type DiagnosticosPendientesSeguimientoFilters,
  type DiagnosticosPendientesSeguimientoResponse,
  type DiagnosticoPendienteSeguimientoRow,
} from "@/types/reportes"
import { toast } from "sonner"

/** Table columns for pending follow-up diagnoses */
const COLUMNS = [
  { key: "paciente.nombreCompleto", label: "Paciente" },
  { key: "paciente.documento", label: "Documento" },
  { key: "paciente.edad", label: "Edad", align: "center" as const },
  { key: "diagnostico.label", label: "Diagnóstico" },
  { key: "diagnostico.code", label: "Código" },
  { key: "diagnosisCatalog.name", label: "Catálogo" },
  { key: "diasEnSeguimiento", label: "Días en Seguimiento", align: "center" as const },
  { key: "ultimaEvaluacion.fecha", label: "Última Evaluación", format: "date" as const },
  { key: "proximaCitaSugerida.fecha", label: "Próxima Cita", format: "datetime" as const },
  { key: "notasEvolucion.0.nota", label: "Última Nota" },
]

export default function DiagnosticosPendientesSeguimientoReportPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<DiagnosticosPendientesSeguimientoResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentFilters, setCurrentFilters] = useState<DiagnosticosPendientesSeguimientoFilters | null>(null)

  const [diagnosisCatalogOptions, setDiagnosisCatalogOptions] = useState<Array<{ id: number; label: string }>>([])
  const [profesionalesOptions, setProfesionalesOptions] = useState<Array<{ id: number; label: string }>>([])
  const [loadingOptions, setLoadingOptions] = useState(false)

  const config = REPORT_CONFIGS["diagnosticos-pendientes-seguimiento"]

  // Load filter options
  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true)
      try {
        // Load diagnosis catalog - fetch all pages if needed
        const catalogItems: Array<{ idDiagnosisCatalog: number; name: string; code: string }> = []
        let catalogPage = 1
        let hasMoreCatalog = true

        while (hasMoreCatalog) {
          const catalogRes = await fetch(
            `/api/diagnosis-catalog?isActive=true&limit=100&page=${catalogPage}&sortBy=code&sortOrder=asc`
          )
          if (catalogRes.ok) {
            const catalogData = await catalogRes.json()
            if (catalogData.ok && Array.isArray(catalogData.data)) {
              catalogItems.push(...catalogData.data)
              hasMoreCatalog = catalogData.meta.hasNext
              catalogPage++
            } else {
              hasMoreCatalog = false
            }
          } else {
            hasMoreCatalog = false
          }
        }

        setDiagnosisCatalogOptions(
          catalogItems.map((item) => ({
            id: item.idDiagnosisCatalog,
            label: `${item.code} - ${item.name}`,
          }))
        )

        // Load professionals - fetch all pages if needed
        const profItems: Array<{ idProfesional: number; persona: { nombres: string; apellidos: string } }> = []
        let profPage = 1
        let hasMoreProf = true

        while (hasMoreProf) {
          const profRes = await fetch(
            `/api/profesionales?estaActivo=true&limit=100&page=${profPage}&sortBy=nombre&sortOrder=asc`
          )
          if (profRes.ok) {
            const profData = await profRes.json()
            if (profData.ok && Array.isArray(profData.data)) {
              profItems.push(...profData.data)
              hasMoreProf = profData.meta.hasNext
              profPage++
            } else {
              hasMoreProf = false
            }
          } else {
            hasMoreProf = false
          }
        }

        setProfesionalesOptions(
          profItems.map((item) => ({
            id: item.idProfesional,
            label: `${item.persona.nombres} ${item.persona.apellidos}`,
          }))
        )
      } catch (err) {
        console.error("Error loading filter options:", err)
        toast.error("Error al cargar opciones de filtros", {
          description: err instanceof Error ? err.message : "Error desconocido",
        })
      } finally {
        setLoadingOptions(false)
      }
    }

    loadOptions()
  }, [])

  const fetchReport = useCallback(async (filters: DiagnosticosPendientesSeguimientoFilters) => {
    setIsLoading(true)
    setError(null)
    setCurrentFilters(filters)

    try {
      const response = await fetch("/api/reportes/diagnosticos-pendientes-seguimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters }),
      })

      const result = await response.json()

      if (!result.ok) {
        throw new Error(result.error || "Error al generar el reporte")
      }

      setData(result.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      setError(message)
      toast.error("Error al generar reporte", { description: message })
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handlePageChange = useCallback((page: number) => {
    if (currentFilters) {
      fetchReport({ ...currentFilters, page })
    }
  }, [currentFilters, fetchReport])

  const renderCell = useCallback((column: { key: string; label: string }, row: DiagnosticoPendienteSeguimientoRow) => {
    if (column.key === "paciente.edad") {
      return row.paciente.edad !== undefined ? `${row.paciente.edad} años` : "-"
    }
    if (column.key === "diagnostico.code") {
      return row.diagnostico.code || row.diagnosisCatalog?.code || "-"
    }
    if (column.key === "diasEnSeguimiento") {
      const isOld = row.diasEnSeguimiento > 90
      const isIntermediate = row.diasEnSeguimiento >= 30 && row.diasEnSeguimiento <= 90
      return (
        <span
          className={
            isOld
              ? "font-medium text-red-600 dark:text-red-400"
              : isIntermediate
                ? "font-medium text-amber-600 dark:text-amber-400"
                : ""
          }
        >
          {row.diasEnSeguimiento}
        </span>
      )
    }
    if (column.key === "ultimaEvaluacion.fecha") {
      if (!row.ultimaEvaluacion) return "-"
      const fecha = new Date(row.ultimaEvaluacion.fecha)
      return (
        <div className="flex flex-col">
          <span>{fecha.toLocaleDateString("es-PY")}</span>
          {row.ultimaEvaluacion.profesional && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{row.ultimaEvaluacion.profesional}</span>
          )}
        </div>
      )
    }
    if (column.key === "proximaCitaSugerida.fecha") {
      if (!row.proximaCitaSugerida) return "-"
      const fecha = new Date(row.proximaCitaSugerida.fecha)
      return (
        <div className="flex flex-col">
          <span>{fecha.toLocaleDateString("es-PY")}</span>
          {row.proximaCitaSugerida.hora && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{row.proximaCitaSugerida.hora}</span>
          )}
          {row.proximaCitaSugerida.profesional && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{row.proximaCitaSugerida.profesional}</span>
          )}
        </div>
      )
    }
    if (column.key === "notasEvolucion.0.nota") {
      const ultimaNota = row.notasEvolucion && row.notasEvolucion.length > 0 ? row.notasEvolucion[0] : null
      if (!ultimaNota) return "-"
      return (
        <div className="max-w-md">
          <p className="truncate text-sm">{ultimaNota.nota}</p>
          {ultimaNota.fecha && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(ultimaNota.fecha).toLocaleDateString("es-PY")}
            </p>
          )}
        </div>
      )
    }
    if (column.key === "diagnosisCatalog.name") {
      return row.diagnosisCatalog?.name || "-"
    }
    return null
  }, [])

  return (
    <ReportShell
      config={config}
      isLoading={isLoading}
      error={error}
      filters={
        <ReportFiltersForm
          schema={diagnosticosPendientesSeguimientoFiltersSchema}
          onSubmit={fetchReport}
          isLoading={isLoading}
          hasDateRange={true}
        >
          {(form) => (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Diagnosis Catalog filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Catálogo de Diagnósticos
                </label>
                <select
                  multiple
                  {...form.register("diagnosisCatalogIds", { valueAsNumber: true })}
                  className="h-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  disabled={loadingOptions}
                >
                  {diagnosisCatalogOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Professional filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Profesional</label>
                <select
                  multiple
                  {...form.register("profesionalIds", { valueAsNumber: true })}
                  className="h-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  disabled={loadingOptions}
                >
                  {profesionalesOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Days range filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Días en Seguimiento
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    {...form.register("diasMinimos", { valueAsNumber: true })}
                    className="w-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    placeholder="Mín"
                    min={0}
                  />
                  <span className="text-gray-500">—</span>
                  <input
                    type="number"
                    {...form.register("diasMaximos", { valueAsNumber: true })}
                    className="w-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    placeholder="Máx"
                    min={0}
                  />
                </div>
              </div>

              {/* Search field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Búsqueda</label>
                <input
                  type="text"
                  {...form.register("busqueda")}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  placeholder="Nombre, documento o código..."
                />
              </div>
            </div>
          )}
        </ReportFiltersForm>
      }
      kpis={data && <ReportKpiCards kpis={data.kpis} isLoading={isLoading} />}
    >
      {data && (
        <div className="mb-4 flex items-center justify-end print:hidden">
          <ReportExportButtons
            reportType="diagnosticos-pendientes-seguimiento"
            title={config.name}
            description={config.description}
            metadata={data.metadata}
            kpis={data.kpis}
            tableColumns={COLUMNS.map((col) => ({ label: col.label, key: col.key }))}
            tableData={data.data as unknown as Array<Record<string, unknown>>}
            filters={currentFilters as unknown as Record<string, unknown>}
            filterLabels={{
              startDate: "Fecha desde",
              endDate: "Fecha hasta",
              diagnosisCatalogIds: "Catálogo de diagnósticos",
              profesionalIds: "Profesional",
              busqueda: "Búsqueda",
              diasMinimos: "Días mínimos",
              diasMaximos: "Días máximos",
            }}
            scope="fullDataset"
            totalRecords={data.pagination?.totalItems}
            disabled={isLoading}
          />
        </div>
      )}
      {data ? (
        <ReportTable
          columns={COLUMNS}
          data={data.data}
          pagination={data.pagination}
          onPageChange={handlePageChange}
          isLoading={isLoading}
          emptyMessage="No se encontraron diagnósticos pendientes de seguimiento con los filtros seleccionados"
          getRowKey={(row) => row.idPatientDiagnosis}
          renderCell={renderCell}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-gray-500 dark:text-gray-400">
            Selecciona los filtros y haz clic en &quot;Generar&quot; para ver el reporte.
          </p>
        </div>
      )}
    </ReportShell>
  )
}

