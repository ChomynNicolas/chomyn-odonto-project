// src/components/kpis/sections/KpiPacientesSection.tsx
import { PacientesKpiDTO } from "@/app/api/dashboard/kpi/_dto"
import { Users, UserPlus, PieChart } from "lucide-react"

interface KpiPacientesSectionProps {
  pacientes: PacientesKpiDTO
}

export function KpiPacientesSection({ pacientes }: KpiPacientesSectionProps) {
  return (
    <section aria-labelledby="pacientes-section" className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        <h2 id="pacientes-section" className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Pacientes y Demografía
        </h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Pacientes nuevos */}
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Pacientes Nuevos
          </div>
          <div className="text-3xl font-semibold tabular-nums">{pacientes.pacientesNuevos.current}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {pacientes.pacientesNuevos.delta >= 0 ? "+" : ""}
            {pacientes.pacientesNuevos.deltaPercent.toFixed(1)}% vs período anterior
          </div>
        </div>

        {/* Pacientes activos */}
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Pacientes Activos Atendidos</div>
          <div className="text-3xl font-semibold tabular-nums">{pacientes.pacientesActivosAtendidos.current}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {pacientes.pacientesActivosAtendidos.delta >= 0 ? "+" : ""}
            {pacientes.pacientesActivosAtendidos.deltaPercent.toFixed(1)}% vs período anterior
          </div>
        </div>

        {/* Retención */}
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Tasa de Retención (90 días)</div>
          <div className="text-3xl font-semibold tabular-nums">{pacientes.retencionPercent.toFixed(1)}%</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Pacientes con 2+ consultas en 90 días</div>
        </div>
      </div>

      {/* Distribuciones */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Por edad */}
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <h3 className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <PieChart className="h-4 w-4" aria-hidden="true" />
            Distribución por Edad
          </h3>
          <div className="flex flex-col gap-2">
            {pacientes.distribucionPorEdad.map((grupo) => (
              <div key={grupo.grupo} className="flex items-center justify-between">
                <span className="text-sm">{grupo.grupo} años</span>
                <span className="font-semibold tabular-nums">{grupo.cantidad}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Por género */}
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <h3 className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <PieChart className="h-4 w-4" aria-hidden="true" />
            Distribución por Género
          </h3>
          <div className="flex flex-col gap-2">
            {pacientes.distribucionPorGenero.map((genero) => (
              <div key={genero.genero} className="flex items-center justify-between">
                <span className="text-sm capitalize">{genero.genero.toLowerCase().replace("_", " ")}</span>
                <span className="font-semibold tabular-nums">{genero.cantidad}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
