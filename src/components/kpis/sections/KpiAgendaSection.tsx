// src/components/kpis/sections/KpiAgendaSection.tsx

import { AgendaKpiDTO } from "@/app/api/dashboard/kpi/_dto"
import { Calendar, Clock, AlertTriangle } from "lucide-react"

interface KpiAgendaSectionProps {
  agenda: AgendaKpiDTO
}

export function KpiAgendaSection({ agenda }: KpiAgendaSectionProps) {
  return (
    <section aria-labelledby="agenda-section" className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
        <h2 id="agenda-section" className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Agenda y Flujo Asistencial
        </h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Métricas de tiempo */}
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <h3 className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Clock className="h-4 w-4" aria-hidden="true" />
            Tiempos Operativos
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Puntualidad</div>
              <div className="text-2xl font-semibold tabular-nums">
                {agenda.puntualidadMinutosPromedio.current > 0 ? "+" : ""}
                {Math.round(agenda.puntualidadMinutosPromedio.current)} min
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {agenda.puntualidadMinutosPromedio.current > 0 ? "Retraso promedio" : "Inicio anticipado"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Duración Real vs Estimada</div>
              <div className="text-2xl font-semibold tabular-nums">
                {agenda.duracionRealVsEstimadaMinutos.diferencia > 0 ? "+" : ""}
                {agenda.duracionRealVsEstimadaMinutos.diferencia} min
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Real: {agenda.duracionRealVsEstimadaMinutos.realPromedio} min | Est:{" "}
                {agenda.duracionRealVsEstimadaMinutos.estimadaPromedio} min
              </div>
            </div>
          </div>
        </div>

        {/* Alertas */}
        {agenda.sameDayCancellations > 0 && (
          <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-800 dark:bg-amber-950">
            <h3 className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-100">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Cancelaciones Same-Day
            </h3>
            <div className="text-3xl font-semibold text-amber-700 dark:text-amber-300">
              {agenda.sameDayCancellations}
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300">Citas canceladas el mismo día del turno</p>
          </div>
        )}
      </div>
    </section>
  )
}
