// src/components/kpis/sections/KpiCalidadSection.tsx
import { CalidadDTO } from "@/app/api/dashboard/kpi/_dto"
import { CheckCircle, FileText, Image, AlertTriangle } from "lucide-react"

interface KpiCalidadSectionProps {
  calidad: CalidadDTO
}

export function KpiCalidadSection({ calidad }: KpiCalidadSectionProps) {
  return (
    <section aria-labelledby="calidad-section" className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
        <h2 id="calidad-section" className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Calidad y Cumplimiento
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Cobertura de vitales */}
        <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="text-xs text-gray-600 dark:text-gray-400">Cobertura de Vitales</div>
          <div className="text-3xl font-semibold tabular-nums">{calidad.coberturaVitalesPercent.toFixed(1)}%</div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div
              className="h-full bg-purple-600 transition-all dark:bg-purple-400"
              style={{ width: `${Math.min(calidad.coberturaVitalesPercent, 100)}%` }}
              role="progressbar"
              aria-valuenow={calidad.coberturaVitalesPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Documentación completa */}
        <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <FileText className="h-3 w-3" aria-hidden="true" />
            Documentación Completa
          </div>
          <div className="text-3xl font-semibold tabular-nums">{calidad.documentacionCompletaPercent.toFixed(1)}%</div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div
              className="h-full bg-blue-600 transition-all dark:bg-blue-400"
              style={{ width: `${Math.min(calidad.documentacionCompletaPercent, 100)}%` }}
              role="progressbar"
              aria-valuenow={calidad.documentacionCompletaPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Consultas con adjuntos */}
        <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <Image className="h-3 w-3" aria-hidden="true" />
            Consultas con Adjuntos
          </div>
          <div className="text-3xl font-semibold tabular-nums">{calidad.consultasConAdjuntos}</div>
        </div>

        {/* Tiempo de cierre */}
        <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="text-xs text-gray-600 dark:text-gray-400">Tiempo de Cierre</div>
          <div className="text-3xl font-semibold tabular-nums">{calidad.tiempoCierrePromedioHoras.toFixed(1)}h</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Promedio</div>
        </div>
      </div>

      {/* Alerta de consultas en draft */}
      {calidad.consultasEnDraftMasDeNHoras > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <div>
            <h3 className="font-medium text-amber-900 dark:text-amber-100">Consultas pendientes de cierre</h3>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              Hay {calidad.consultasEnDraftMasDeNHoras} consulta(s) en estado DRAFT con más de {calidad.thresholdHoras}{" "}
              horas desde su inicio.
            </p>
          </div>
        </div>
      )}

      {/* Adjuntos por tipo */}
      {calidad.adjuntosPorTipo.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Adjuntos por Tipo</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {calidad.adjuntosPorTipo.map((adj) => (
              <div
                key={adj.tipo}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-800"
              >
                <span className="text-sm font-medium">{adj.tipo}</span>
                <span className="text-lg font-semibold tabular-nums">{adj.cantidad}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
