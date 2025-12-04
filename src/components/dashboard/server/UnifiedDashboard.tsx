// src/components/dashboard/server/UnifiedDashboard.tsx
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import type { Rol } from "@/lib/rbac"
import { formatInTimeZone } from "date-fns-tz"
import { buildDashboardKpi, buildKpiClinicoOverview } from "@/app/api/dashboard/kpi/_service"
import { formatDateRangeSpanish, formatDateSpanishFull } from "@/lib/kpis/date-formatters"
import { KpiCard } from "@/components/kpis/KpiCard"
import FlujoAtencionEnhanced from "@/components/dashboard/FlujoAtencionEnhanced"
import PeriodSelector from "@/components/dashboard/PeriodSelector"
import { getPeriodDates, type PeriodPreset } from "@/lib/kpis/period-utils"
import { PeriodInfo } from "@/components/dashboard/PeriodInfo"
import {
  Activity,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  BarChart3,
  AlertCircle,
  Calendar,
} from "lucide-react"

const TZ = "America/Asuncion"

export default async function UnifiedDashboard({
  role,
  period = "currentMonth",
}: {
  role: Rol
  period?: PeriodPreset
}) {
  const session = await auth()
  if (!session) redirect("/signin")

  const userId = session.user.id ? Number.parseInt(session.user.id, 10) : 0

  // Calcular rango según período seleccionado
  const { start: startDate, end: endDate } = getPeriodDates(period)
  const now = new Date()

  // Fetch data in parallel with error handling
  try {
    const [dailyData, monthlyData] = await Promise.all([
      buildDashboardKpi({ slotMin: 30 }, role),
      buildKpiClinicoOverview(
        {
          startDate: formatInTimeZone(startDate, TZ, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
          endDate: formatInTimeZone(endDate, TZ, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
          privacyMode: false,
        },
        role,
        userId,
      ),
    ])

    if (!dailyData.ok) {
      return (
        <div className="rounded-xl border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">No se pudo cargar los KPIs del dashboard.</p>
        </div>
      )
    }

    const daily = dailyData.data
    const monthly = monthlyData

    // Financial calculations
    // NOTA: ingresosClinicosTotal ya está en guaraníes (PYG), no en centavos
    const ingresosTotal = monthly.produccion.ingresosClinicosTotal
    const procedimientosRealizados = monthly.produccion.procedimientosRealizados
    const ticketPromedio = procedimientosRealizados > 0 ? ingresosTotal / procedimientosRealizados : 0

    return (
      <div className="space-y-8">
        {/* Header with improved styling */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Dashboard Clínico</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Resumen operativo · {formatDateRangeSpanish(startDate, endDate)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/5 border border-primary/20">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {formatDateSpanishFull(now)}
              </span>
            </div>
            <PeriodSelector currentPeriod={period} />
          </div>
        </div>

        {/* Flow of Attention - Moved to top as most important */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Flujo de Atención</h2>
              <p className="text-xs text-muted-foreground">Estado actual de pacientes en clínica</p>
            </div>
          </div>
          <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/50 dark:to-card p-6 shadow-lg">
            <FlujoAtencionEnhanced tiempos={daily.tiempos} colas={daily.colas} />
          </div>
        </section>

        {/* Period Info */}
        <PeriodInfo period={period} />

        {/* Daily Operations KPIs - Enhanced Design */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Operaciones del Día</h2>
              <p className="text-xs text-muted-foreground">Métricas de actividad diaria</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KpiCard
              label="Citas Hoy"
              value={daily.kpis.total}
              variant="default"
              size="md"
            />
            <KpiCard
              label="Confirmadas"
              value={daily.kpis.confirmadas}
              comparison={monthly.agenda.confirmacionRate}
              variant={daily.kpis.confirmRate >= 80 ? "success" : "warning"}
              format="number"
              size="md"
            />
            <KpiCard
              label="Tasa Confirmación"
              value={daily.kpis.confirmRate}
              comparison={monthly.agenda.confirmacionRate}
              variant={daily.kpis.confirmRate >= 80 ? "success" : "warning"}
              format="percent"
              decimals={1}
              size="md"
            />
            <KpiCard
              label="Canceladas"
              value={daily.kpis.canceladas}
              comparison={monthly.agenda.cancelacionRate}
              variant={daily.kpis.cancelRate <= 10 ? "success" : "danger"}
              format="number"
              size="md"
            />
            <KpiCard
              label="No-Show"
              value={daily.kpis.noShow}
              comparison={monthly.agenda.noShowRate}
              variant={daily.kpis.noShowRate <= 5 ? "success" : "danger"}
              format="number"
              size="md"
            />
            <KpiCard
              label="Tiempo Promedio"
              value={daily.tiempos.promedioMin ?? 0}
              variant="default"
              format="time"
              size="md"
            />
          </div>
        </section>

        {/* Clinical Metrics - Enhanced Design */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Métricas Clínicas</h2>
              <p className="text-xs text-muted-foreground">Indicadores de calidad y eficiencia clínica</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiCard
              label="Tasa de Confirmación"
              value={monthly.agenda.confirmacionRate.current}
              comparison={monthly.agenda.confirmacionRate}
              variant={monthly.agenda.confirmacionRate.current >= 80 ? "success" : "warning"}
              format="percent"
              decimals={1}
              size="md"
            />
            <KpiCard
              label="Tasa de Cancelación"
              value={monthly.agenda.cancelacionRate.current}
              comparison={monthly.agenda.cancelacionRate}
              variant={monthly.agenda.cancelacionRate.current <= 10 ? "success" : "danger"}
              format="percent"
              decimals={1}
              size="md"
            />
            <KpiCard
              label="Tasa de No-Show"
              value={monthly.agenda.noShowRate.current}
              comparison={monthly.agenda.noShowRate}
              variant={monthly.agenda.noShowRate.current <= 5 ? "success" : "danger"}
              format="percent"
              decimals={1}
              size="md"
            />
          </div>

          {role !== "RECEP" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <KpiCard
                label="Procedimientos Realizados"
                value={monthly.produccion.procedimientosRealizados}
                variant="default"
                size="md"
              />
              <KpiCard
                label="Documentación Completa"
                value={monthly.calidad.documentacionCompletaPercent}
                variant={monthly.calidad.documentacionCompletaPercent >= 95 ? "success" : "warning"}
                format="percent"
                decimals={1}
                size="md"
              />
            </div>
          )}
        </section>

        {/* Financial Metrics - Only for ADMIN and ODONT - Enhanced Design */}
        {(role === "ADMIN" || role === "ODONT") && (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Métricas Financieras</h2>
                <p className="text-xs text-muted-foreground">Ingresos y producción del mes</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-50 dark:from-emerald-950 dark:via-emerald-900 dark:to-emerald-950 p-6 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                    Ingresos Totales
                  </p>
                  <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-4xl font-bold text-emerald-900 dark:text-emerald-100 mt-3">
                  ₲ {ingresosTotal.toLocaleString("es-PY")}
                </p>
                <div className="mt-4 pt-4 border-t border-emerald-200 dark:border-emerald-800">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    {procedimientosRealizados} procedimientos realizados
                  </p>
                </div>
              </div>
              <KpiCard
                label="Ticket Promedio"
                value={ticketPromedio}
                variant="default"
                format="currency"
                decimals={0}
                size="md"
              />
              <KpiCard
                label="Procedimientos Realizados"
                value={procedimientosRealizados}
                variant="default"
                size="md"
              />
            </div>

            {/* Top Procedures by Revenue - Enhanced */}
            {monthly.produccion.topProcedimientosPorIngresos.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 rounded-md bg-emerald-500/10">
                    <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">Top 5 Procedimientos por Ingresos</h3>
                </div>
                <div className="space-y-3">
                  {monthly.produccion.topProcedimientosPorIngresos.slice(0, 5).map((proc, idx) => {
                    // NOTA: ingresosCents ya está en guaraníes (PYG), no en centavos
                    const ingresos = proc.ingresosCents
                    const porcentaje = (proc.ingresosCents / monthly.produccion.ingresosClinicosTotal) * 100

                    return (
                      <div key={proc.procedimientoId} className="group">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center">
                              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                {idx + 1}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-foreground truncate">{proc.nombre}</span>
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                              {porcentaje.toFixed(1)}%
                            </span>
                            <span className="text-sm font-bold text-foreground min-w-[120px] text-right">
                              ₲ {ingresos.toLocaleString("es-PY")}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                            style={{ width: `${porcentaje}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Financial Alerts */}
            {monthly.produccion.procedimientosSinPrecio > 0 && (
              <div className="rounded-lg border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                      Procedimientos sin precio registrado
                    </p>
                    <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                      {monthly.produccion.procedimientosSinPrecio} procedimiento{monthly.produccion.procedimientosSinPrecio > 1 ? "s" : ""} no {monthly.produccion.procedimientosSinPrecio > 1 ? "están" : "está"} incluido{monthly.produccion.procedimientosSinPrecio > 1 ? "s" : ""} en el cálculo de ingresos
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Management Metrics - Simplified */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Gestión Operativa</h2>
              <p className="text-xs text-muted-foreground">Indicadores de eficiencia operativa</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <KpiCard
              label="Turnos Completados"
              value={monthly.agenda.turnosCompletados.current}
              comparison={monthly.agenda.turnosCompletados}
              variant="success"
              size="md"
            />
            <KpiCard
              label="Tasa de Reprogramación"
              value={monthly.agenda.reprogramacionRate.current}
              comparison={monthly.agenda.reprogramacionRate}
              variant={monthly.agenda.reprogramacionRate.current <= 15 ? "success" : "warning"}
              format="percent"
              decimals={1}
              size="md"
            />
          </div>
        </section>


        {/* Quality Alerts - Enhanced */}
        {monthly.calidad.consultasEnDraftMasDeNHoras > 0 && (
          <div className="rounded-lg border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  Consultas pendientes de finalización
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                  {monthly.calidad.consultasEnDraftMasDeNHoras} consulta{monthly.calidad.consultasEnDraftMasDeNHoras > 1 ? "s" : ""} en borrador por más de{" "}
                  {monthly.calidad.thresholdHoras} horas. Se recomienda completar la documentación.
                </p>
              </div>
            </div>
          </div>
        )}
    </div>
    )
  } catch (error) {
    console.error("Error loading dashboard data:", error)
    return (
      <div className="rounded-xl border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">No se pudieron cargar los datos del dashboard.</p>
        <p className="text-xs text-muted-foreground mt-1">Por favor, intenta recargar la página.</p>
      </div>
    )
  }
}

