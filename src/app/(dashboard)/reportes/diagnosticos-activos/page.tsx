// src/app/(dashboard)/reportes/diagnosticos-activos/page.tsx
"use client"

/**
 * Active Diagnoses Report Page
 * Lists active diagnoses with patient and diagnosis information.
 */

import { useState, useCallback, useEffect } from "react"
import { ReportShell, ReportKpiCards, ReportTable, ReportFiltersForm, ReportExportButtons } from "@/components/reportes"
import { diagnosticosActivosFiltersSchema } from "@/lib/validation/reportes"
import {
  REPORT_CONFIGS,
  type DiagnosticosActivosFilters,
  type DiagnosticosActivosResponse,
  type DiagnosticoActivoRow,
} from "@/types/reportes"
import { toast } from "sonner"

/** Table columns for diagnoses */
const COLUMNS = [
  { key: "paciente.nombreCompleto", label: "Paciente" },
  { key: "paciente.documento", label: "Documento" },
  { key: "paciente.edad", label: "Edad", align: "center" as const },
  { key: "diagnostico.label", label: "Diagnóstico" },
  { key: "diagnostico.code", label: "Código" },
  { key: "diagnosisCatalog.name", label: "Catálogo" },
  { key: "diagnostico.notedAt", label: "Fecha Registro", format: "date" as const },
  { key: "antiguedadDias", label: "Antigüedad (días)", align: "center" as const },
  { key: "createdBy.nombreApellido", label: "Profesional" },
  { key: "consulta.fecha", label: "Consulta", format: "date" as const },
]

export default function DiagnosticosActivosReportPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<DiagnosticosActivosResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentFilters, setCurrentFilters] = useState<DiagnosticosActivosFilters | null>(null)
  

  const [diagnosisCatalogOptions, setDiagnosisCatalogOptions] = useState<Array<{ id: number; label: string }>>([])
  const [profesionalesOptions, setProfesionalesOptions] = useState<Array<{ id: number; label: string }>>([])
  const [loadingOptions, setLoadingOptions] = useState(false)

  const config = REPORT_CONFIGS["diagnosticos-activos"]

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

  const fetchReport = useCallback(async (filters: DiagnosticosActivosFilters) => {
    setIsLoading(true)
    setError(null)
    setCurrentFilters(filters)

    try {
      const response = await fetch("/api/reportes/diagnosticos-activos", {
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

  const renderCell = useCallback((column: { key: string; label: string }, row: DiagnosticoActivoRow) => {
    if (column.key === "paciente.edad") {
      return row.paciente.edad !== undefined ? `${row.paciente.edad} años` : "-"
    }
    if (column.key === "diagnostico.code") {
      return row.diagnostico.code || row.diagnosisCatalog?.code || "-"
    }
    if (column.key === "diagnostico.notedAt") {
      return new Date(row.diagnostico.notedAt).toLocaleDateString("es-PY")
    }
    if (column.key === "antiguedadDias") {
      const isOld = row.antiguedadDias > 90
      const isIntermediate = row.antiguedadDias >= 30 && row.antiguedadDias <= 90
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
          {row.antiguedadDias}
        </span>
      )
    }
    if (column.key === "consulta.fecha") {
      return row.consulta ? new Date(row.consulta.fecha).toLocaleDateString("es-PY") : "-"
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
          schema={diagnosticosActivosFiltersSchema}
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
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Profesional
                </label>
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

              {/* Search field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Búsqueda
                </label>
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
            reportType="diagnosticos-activos"
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
          emptyMessage="No se encontraron diagnósticos activos con los filtros seleccionados"
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

