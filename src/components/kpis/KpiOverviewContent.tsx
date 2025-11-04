// src/components/kpis/KpiOverviewContent.tsx

import { KpiCard } from "./KpiCard"
import { KpiAgendaSection } from "./sections/KpiAgendaSection"
import { KpiProduccionSection } from "./sections/KpiProduccionSection"
import { KpiCalidadSection } from "./sections/KpiCalidadSection"
import { KpiPacientesSection } from "./sections/KpiPacientesSection"
import { KpiUtilizacionSection } from "./sections/KpiUtilizacionSection"
import { AlertCircle } from "lucide-react"
import { kpiFiltersSchema } from "@/app/api/dashboard/kpi/_schemas"
import { buildKpiClinicoOverview } from "@/app/api/dashboard/kpi/_service"

interface KpiOverviewContentProps {
  role: "ADMIN" | "ODONT" | "RECEP"
  userId: number
}

export async function KpiOverviewContent({ role, userId }: KpiOverviewContentProps) {
  try {
    // Parsear filtros desde searchParams (en el servidor)
    // Nota: En un componente server, necesitamos acceder a searchParams de otra forma
    // Por simplicidad, usamos valores por defecto aquí
    const filters = kpiFiltersSchema.parse({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
    })

    const kpis = await buildKpiClinicoOverview(filters, role, userId)

    return (
      <div className="flex flex-col gap-8">
        {/* KPIs principales en cards */}
        <section aria-labelledby="kpis-principales">
          <h2 id="kpis-principales" className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">
            Resumen Ejecutivo
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              label="Turnos Programados"
              value={kpis.agenda.turnosProgramados.current}
              comparison={kpis.agenda.turnosProgramados}
              format="number"
              helpText="Total de citas programadas en el período"
            />
            <KpiCard
              label="Tasa de Confirmación"
              value={kpis.agenda.confirmacionRate.current}
              comparison={kpis.agenda.confirmacionRate}
              format="percent"
              decimals={1}
              variant={
                kpis.agenda.confirmacionRate.current >= 80
                  ? "success"
                  : kpis.agenda.confirmacionRate.current >= 60
                    ? "warning"
                    : "danger"
              }
              helpText="Porcentaje de citas confirmadas antes del inicio"
            />
            <KpiCard
              label="Tasa de Cancelación"
              value={kpis.agenda.cancelacionRate.current}
              comparison={kpis.agenda.cancelacionRate}
              format="percent"
              decimals={1}
              variant={
                kpis.agenda.cancelacionRate.current <= 10
                  ? "success"
                  : kpis.agenda.cancelacionRate.current <= 20
                    ? "warning"
                    : "danger"
              }
              helpText="Porcentaje de citas canceladas"
            />
            <KpiCard
              label="Tasa de No-Show"
              value={kpis.agenda.noShowRate.current}
              comparison={kpis.agenda.noShowRate}
              format="percent"
              decimals={1}
              variant={
                kpis.agenda.noShowRate.current <= 5
                  ? "success"
                  : kpis.agenda.noShowRate.current <= 10
                    ? "warning"
                    : "danger"
              }
              helpText="Porcentaje de pacientes que no asistieron"
            />
            <KpiCard
              label="Turnos Completados"
              value={kpis.agenda.turnosCompletados.current}
              comparison={kpis.agenda.turnosCompletados}
              format="number"
              helpText="Total de citas finalizadas exitosamente"
            />
            <KpiCard
              label="Lead Time Promedio"
              value={kpis.agenda.leadTimeDiasPromedio.current}
              comparison={kpis.agenda.leadTimeDiasPromedio}
              format="number"
              decimals={1}
              unit="días"
              helpText="Días promedio entre creación de cita e inicio"
            />
            <KpiCard
              label="Espera Promedio"
              value={kpis.agenda.esperaMinutosPromedio.current}
              comparison={kpis.agenda.esperaMinutosPromedio}
              format="time"
              variant={
                kpis.agenda.esperaMinutosPromedio.current <= 15
                  ? "success"
                  : kpis.agenda.esperaMinutosPromedio.current <= 30
                    ? "warning"
                    : "danger"
              }
              helpText="Tiempo promedio entre check-in e inicio de atención"
            />
            <KpiCard
              label="Utilización Promedio"
              value={
                kpis.utilizacion.porProfesional.length > 0
                  ? kpis.utilizacion.porProfesional.reduce((sum, p) => sum + p.utilizacionPercent, 0) /
                    kpis.utilizacion.porProfesional.length
                  : 0
              }
              format="percent"
              decimals={1}
              helpText="Porcentaje promedio de utilización de profesionales"
            />
          </div>
        </section>

        {/* Secciones detalladas */}
        <KpiAgendaSection agenda={kpis.agenda} />

        {role !== "RECEP" && <KpiProduccionSection produccion={kpis.produccion} role={role} />}

        <KpiCalidadSection calidad={kpis.calidad} />

        <KpiPacientesSection pacientes={kpis.pacientes} />

        <KpiUtilizacionSection utilizacion={kpis.utilizacion} />
      </div>
    )
  } catch (error) {
    console.error("[KPI Overview] Error:", error)
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-red-200 bg-red-50 p-8 dark:border-red-800 dark:bg-red-950">
        <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" aria-hidden="true" />
        <div className="text-center">
          <h3 className="text-lg font-medium text-red-900 dark:text-red-100">Error al cargar KPIs</h3>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
            No se pudieron calcular las métricas. Por favor, intenta nuevamente.
          </p>
        </div>
      </div>
    )
  }
}
