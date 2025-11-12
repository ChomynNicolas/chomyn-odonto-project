import { auth } from "@/auth"
import { redirect } from "next/navigation"
import type { Rol } from "@/lib/rbac"
import { startOfMonth, endOfMonth } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { DollarSign, TrendingUp, FileText, AlertCircle } from "lucide-react"
import { buildKpiClinicoOverview } from "@/app/api/dashboard/kpi/_service"
import { KpiCard } from "@/components/kpis/KpiCard"

const TZ = "America/Asuncion"

export default async function TabFinanzas({ role }: { role: Rol }) {
  const session = await auth()
  if (!session) redirect("/signin")

  // Solo ADMIN y ODONT (propios) pueden ver finanzas
  if (role === "RECEP") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
        <p className="text-sm text-amber-800 dark:text-amber-400">
          No tienes permisos para ver información financiera.
        </p>
      </div>
    )
  }

  const userId = session.user.id ? Number.parseInt(session.user.id, 10) : 0

  const now = new Date()
  const startDate = startOfMonth(now)
  const endDate = endOfMonth(now)

  try {
    const data = await buildKpiClinicoOverview(
      {
        startDate: formatInTimeZone(startDate, TZ, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
        endDate: formatInTimeZone(endDate, TZ, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
        privacyMode: false,
      },
      role,
      userId,
    )

    const ingresosTotal = data.produccion.ingresosClinicosTotal / 100
    const procedimientosRealizados = data.produccion.procedimientosRealizados
    const ticketPromedio = procedimientosRealizados > 0 ? ingresosTotal / procedimientosRealizados : 0

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Resumen Financiero</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Ingresos y producción · {formatInTimeZone(startDate, TZ, "MMMM yyyy")}
          </p>
          {role === "ODONT" && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Mostrando solo tus ingresos propios</p>
          )}
        </div>

        {/* KPIs Financieros Principales */}
        <section>
          <h3 className="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Ingresos Clínicos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 p-6 shadow-sm">
              <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">Ingresos Totales</p>
              <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100 mt-2">
                ₲ {ingresosTotal.toLocaleString("es-PY")}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                {procedimientosRealizados} procedimientos
              </p>
            </div>

            <KpiCard
              label="Ticket Promedio"
              value={`₲ ${ticketPromedio.toLocaleString("es-PY", { maximumFractionDigits: 0 })}`}
              variant="neutral"
            />

            <KpiCard label="Procedimientos Realizados" value={procedimientosRealizados} variant="neutral" />
          </div>
        </section>

        {/* Top Procedimientos por Ingresos */}
        {data.produccion.topProcedimientosPorIngresos.length > 0 && (
          <section>
            <h3 className="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top Procedimientos por Ingresos
            </h3>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="space-y-3">
                {data.produccion.topProcedimientosPorIngresos.slice(0, 10).map((proc, idx) => {
                  const ingresos = proc.ingresosCents / 100
                  const porcentaje = (proc.ingresosCents / data.produccion.ingresosClinicosTotal) * 100

                  return (
                    <div key={proc.procedimientoId}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-xs font-medium text-muted-foreground w-6 flex-shrink-0">
                            #{idx + 1}
                          </span>
                          <span className="text-sm text-foreground truncate">{proc.nombre}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-muted-foreground">{porcentaje.toFixed(1)}%</span>
                          <span className="text-sm font-semibold text-foreground min-w-[100px] text-right">
                            ₲ {ingresos.toLocaleString("es-PY")}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* Análisis de Producción */}
        <section>
          <h3 className="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Análisis de Producción
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label="Turnos Completados"
              value={data.agenda.turnosCompletados.current}
              comparison={data.agenda.turnosCompletados.comparison}
              variant="success"
            />
            <KpiCard
              label="Tasa de Completitud"
              value={`${((data.agenda.turnosCompletados.current / data.agenda.turnosProgramados.current) * 100).toFixed(1)}%`}
              variant="success"
            />
            <KpiCard
              label="Pacientes Atendidos"
              value={data.pacientes.pacientesActivosAtendidos.current}
              comparison={data.pacientes.pacientesActivosAtendidos.comparison}
              variant="neutral"
            />
            <KpiCard
              label="Pacientes Nuevos"
              value={data.pacientes.pacientesNuevos.current}
              comparison={data.pacientes.pacientesNuevos.comparison}
              variant="neutral"
            />
          </div>
        </section>

        {/* Alertas Financieras */}
        {data.produccion.procedimientosSinPrecio > 0 && (
          <section>
            <h3 className="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Alertas Financieras
            </h3>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                ⚠️ {data.produccion.procedimientosSinPrecio} procedimientos sin precio registrado
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
                Estos procedimientos no están incluidos en el cálculo de ingresos. Revisar catálogo de precios.
              </p>
            </div>
          </section>
        )}

        {/* Nota informativa */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
          <p className="text-xs text-blue-700 dark:text-blue-400">
            <strong>Nota:</strong> Los ingresos mostrados corresponden a procedimientos realizados en el período. Para
            análisis de facturación y cobros, consultar el módulo de finanzas completo.
          </p>
        </div>
      </div>
    )
  } catch (error) {
    console.error("Error loading financial KPIs:", error)
    return (
      <div className="rounded-xl border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">No se pudieron cargar los KPIs financieros.</p>
      </div>
    )
  }
}
