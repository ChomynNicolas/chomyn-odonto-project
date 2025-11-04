// src/components/kpis/sections/KpiUtilizacionSection.tsx
import { UtilizacionDTO } from "@/app/api/dashboard/kpi/_dto"
import { BarChart3, AlertCircle } from "lucide-react"

interface KpiUtilizacionSectionProps {
  utilizacion: UtilizacionDTO
}

export function KpiUtilizacionSection({ utilizacion }: KpiUtilizacionSectionProps) {
  return (
    <section aria-labelledby="utilizacion-section" className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
        <h2 id="utilizacion-section" className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Utilización y Capacidad
        </h2>
      </div>

      {/* Conflictos */}
      {utilizacion.conflictos > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
          <div>
            <h3 className="font-medium text-red-900 dark:text-red-100">Conflictos de Agenda Detectados</h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">
              Se detectaron {utilizacion.conflictos} solapamiento(s) de citas en el período.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Por profesional */}
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Utilización por Profesional</h3>
          <div className="flex flex-col gap-3">
            {utilizacion.porProfesional.map((prof) => (
              <div key={prof.profesionalId} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{prof.nombreCompleto}</span>
                  <span className="font-semibold tabular-nums">{prof.utilizacionPercent.toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <span>{prof.horasReales.toFixed(1)}h reales</span>
                  <span>/</span>
                  <span>{prof.horasCapacidad.toFixed(1)}h capacidad</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                  <div
                    className={`h-full transition-all ${
                      prof.utilizacionPercent >= 80
                        ? "bg-green-600 dark:bg-green-400"
                        : prof.utilizacionPercent >= 60
                          ? "bg-amber-600 dark:bg-amber-400"
                          : "bg-red-600 dark:bg-red-400"
                    }`}
                    style={{ width: `${Math.min(prof.utilizacionPercent, 100)}%` }}
                    role="progressbar"
                    aria-valuenow={prof.utilizacionPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Utilización de ${prof.nombreCompleto}: ${prof.utilizacionPercent.toFixed(1)}%`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Por consultorio */}
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Utilización por Consultorio</h3>
          <div className="flex flex-col gap-3">
            {utilizacion.porConsultorio.map((cons) => (
              <div key={cons.consultorioId} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{cons.nombre}</span>
                  <span className="font-semibold tabular-nums">{cons.utilizacionPercent.toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <span>{cons.horasReales.toFixed(1)}h reales</span>
                  <span>/</span>
                  <span>{cons.horasCapacidad.toFixed(1)}h capacidad</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                  <div
                    className={`h-full transition-all ${
                      cons.utilizacionPercent >= 80
                        ? "bg-cyan-600 dark:bg-cyan-400"
                        : cons.utilizacionPercent >= 60
                          ? "bg-amber-600 dark:bg-amber-400"
                          : "bg-red-600 dark:bg-red-400"
                    }`}
                    style={{ width: `${Math.min(cons.utilizacionPercent, 100)}%` }}
                    role="progressbar"
                    aria-valuenow={cons.utilizacionPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Utilización de ${cons.nombre}: ${cons.utilizacionPercent.toFixed(1)}%`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
