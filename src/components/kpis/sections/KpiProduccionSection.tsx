// src/components/kpis/sections/KpiProduccionSection.tsx
import { ProduccionClinicaDTO } from "@/app/api/dashboard/kpi/_dto"
import { formatCurrency } from "@/lib/kpis/format"
import { Activity, DollarSign, TrendingUp, AlertCircle } from "lucide-react"

interface KpiProduccionSectionProps {
  produccion: ProduccionClinicaDTO
  role: "ADMIN" | "ODONT" | "RECEP"
}

export function KpiProduccionSection({ produccion, role }: KpiProduccionSectionProps) {
  const mostrarIngresos = role !== "RECEP"

  return (
    <section aria-labelledby="produccion-section" className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-green-600 dark:text-green-400" aria-hidden="true" />
        <h2 id="produccion-section" className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Producción Clínica
        </h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Resumen de producción */}
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Resumen de Actividad</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Procedimientos Realizados</div>
              <div className="text-3xl font-semibold tabular-nums">
                {produccion.procedimientosRealizados.toLocaleString("es-PY")}
              </div>
            </div>
            {mostrarIngresos && (
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Ingresos Totales</div>
                <div className="text-3xl font-semibold tabular-nums">
                  {formatCurrency(produccion.ingresosClinicosTotal)}
                </div>
              </div>
            )}
          </div>

          {produccion.procedimientosSinPrecio > 0 && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {produccion.procedimientosSinPrecio} procedimiento(s) sin precio registrado fueron omitidos del cálculo
                de ingresos.
              </p>
            </div>
          )}
        </div>

        {/* Pipeline de tratamiento */}
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Pipeline de Tratamiento</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-2xl font-semibold text-gray-400">{produccion.pipelineTratamiento.pending}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Pendiente</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                {produccion.pipelineTratamiento.scheduled}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Agendado</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-amber-600 dark:text-amber-400">
                {produccion.pipelineTratamiento.inProgress}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">En Progreso</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-green-600 dark:text-green-400">
                {produccion.pipelineTratamiento.completed}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Completado</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-red-600 dark:text-red-400">
                {produccion.pipelineTratamiento.cancelled}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Cancelado</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-purple-600 dark:text-purple-400">
                {produccion.pipelineTratamiento.deferred}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Diferido</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top procedimientos */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Por volumen */}
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <h3 className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
            Top 10 por Volumen
          </h3>
          <div className="flex flex-col gap-2">
            {produccion.topProcedimientosPorVolumen.slice(0, 10).map((proc, idx) => (
              <div key={proc.procedimientoId} className="flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    {idx + 1}
                  </span>
                  <span className="truncate font-medium">{proc.nombre}</span>
                  <span className="text-xs text-gray-500">({proc.code})</span>
                </div>
                <span className="shrink-0 font-semibold tabular-nums">{proc.cantidad}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Por ingresos */}
        {mostrarIngresos && (
          <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <h3 className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <DollarSign className="h-4 w-4" aria-hidden="true" />
              Top 10 por Ingresos
            </h3>
            <div className="flex flex-col gap-2">
              {produccion.topProcedimientosPorIngresos.slice(0, 10).map((proc, idx) => (
                <div key={proc.procedimientoId} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                      {idx + 1}
                    </span>
                    <span className="truncate font-medium">{proc.nombre}</span>
                    <span className="text-xs text-gray-500">({proc.code})</span>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums">{formatCurrency(proc.ingresosCents)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
