import { auth } from "@/auth"
import { redirect } from "next/navigation"
import type { Rol } from "@/lib/rbac"
import { startOfMonth, endOfMonth } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { Activity, Users, TrendingUp, Clock, CheckCircle2 } from "lucide-react"
import { buildKpiClinicoOverview } from "@/app/api/dashboard/kpi/_service"
import { KpiCard } from "@/components/kpis/KpiCard"

const TZ = "America/Asuncion"

export default async function TabClinico({ role }: { role: Rol }) {
  const session = await auth()
  if (!session) redirect("/signin")

  const userId = session.user.id ? Number.parseInt(session.user.id, 10) : 0

  // Calcular rango del mes actual
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

    return (
      <div className="space-y-6">
        {/* Header con link a vista completa */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Resumen Clínico</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Métricas del mes actual · {formatInTimeZone(startDate, TZ, "MMMM yyyy")}
            </p>
          </div>
          <a
            href="/dashboard/clinico/kpis"
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
          >
            Ver análisis completo
          </a>
        </div>

        {/* KPIs de Agenda */}
        <section>
          <h3 className="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Agenda y Flujo Asistencial
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label="Turnos Programados"
              value={data.agenda.turnosProgramados.current}
              comparison={data.agenda.turnosProgramados.comparison}
              variant="neutral"
            />
            <KpiCard
              label="Tasa de Confirmación"
              value={`${data.agenda.confirmacionRate.current.toFixed(1)}%`}
              comparison={data.agenda.confirmacionRate.comparison}
              variant={data.agenda.confirmacionRate.current >= 80 ? "success" : "warning"}
            />
            <KpiCard
              label="Tasa de Cancelación"
              value={`${data.agenda.cancelacionRate.current.toFixed(1)}%`}
              comparison={data.agenda.cancelacionRate.comparison}
              variant={data.agenda.cancelacionRate.current <= 10 ? "success" : "danger"}
            />
            <KpiCard
              label="Tasa de No-Show"
              value={`${data.agenda.noShowRate.current.toFixed(1)}%`}
              comparison={data.agenda.noShowRate.comparison}
              variant={data.agenda.noShowRate.current <= 5 ? "success" : "danger"}
            />
          </div>
        </section>

        {/* KPIs de Producción */}
        {role !== "RECEP" && (
          <section>
            <h3 className="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Producción Clínica
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <KpiCard
                label="Procedimientos Realizados"
                value={data.produccion.procedimientosRealizados}
                variant="neutral"
              />
              {role === "ADMIN" && (
                <KpiCard
                  label="Ingresos Clínicos"
                  value={`₲ ${(data.produccion.ingresosClinicosTotal / 100).toLocaleString()}`}
                  variant="success"
                />
              )}
              <KpiCard
                label="Tratamientos Completados"
                value={data.produccion.pipelineTratamiento.completed}
                variant="success"
              />
            </div>

            {/* Top Procedimientos */}
            {data.produccion.topProcedimientosPorVolumen.length > 0 && (
              <div className="mt-4 rounded-xl border border-border bg-card p-4 shadow-sm">
                <h4 className="text-sm font-medium text-foreground mb-3">Top 5 Procedimientos</h4>
                <div className="space-y-2">
                  {data.produccion.topProcedimientosPorVolumen.slice(0, 5).map((proc) => (
                    <div key={proc.procedimientoId} className="flex items-center justify-between">
                      <span className="text-sm text-foreground truncate">{proc.nombre}</span>
                      <span className="text-sm font-medium text-muted-foreground ml-2">{proc.cantidad}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* KPIs de Calidad */}
        <section>
          <h3 className="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Calidad y Documentación
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label="Cobertura de Vitales"
              value={`${data.calidad.coberturaVitalesPercent.toFixed(1)}%`}
              variant={data.calidad.coberturaVitalesPercent >= 90 ? "success" : "warning"}
            />
            <KpiCard
              label="Documentación Completa"
              value={`${data.calidad.documentacionCompletaPercent.toFixed(1)}%`}
              variant={data.calidad.documentacionCompletaPercent >= 95 ? "success" : "warning"}
            />
            <KpiCard label="Consultas con Adjuntos" value={data.calidad.consultasConAdjuntos} variant="neutral" />
            <KpiCard
              label="Tiempo Cierre Promedio"
              value={`${data.calidad.tiempoCierrePromedioHoras.toFixed(1)}h`}
              variant={data.calidad.tiempoCierrePromedioHoras <= 2 ? "success" : "warning"}
            />
          </div>

          {/* Alerta de consultas en draft */}
          {data.calidad.consultasEnDraftMasDeNHoras > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                ⚠️ {data.calidad.consultasEnDraftMasDeNHoras} consultas en borrador por más de{" "}
                {data.calidad.thresholdHoras} horas
              </p>
            </div>
          )}
        </section>

        {/* KPIs de Pacientes */}
        <section>
          <h3 className="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Pacientes
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KpiCard
              label="Pacientes Nuevos"
              value={data.pacientes.pacientesNuevos.current}
              comparison={data.pacientes.pacientesNuevos.comparison}
              variant="neutral"
            />
            <KpiCard
              label="Pacientes Activos"
              value={data.pacientes.pacientesActivosAtendidos.current}
              comparison={data.pacientes.pacientesActivosAtendidos.comparison}
              variant="neutral"
            />
            <KpiCard
              label="Retención (90 días)"
              value={`${data.pacientes.retencionPercent.toFixed(1)}%`}
              variant={data.pacientes.retencionPercent >= 70 ? "success" : "warning"}
            />
          </div>

          {/* Distribución por edad */}
          {data.pacientes.distribucionPorEdad.length > 0 && (
            <div className="mt-4 rounded-xl border border-border bg-card p-4 shadow-sm">
              <h4 className="text-sm font-medium text-foreground mb-3">Distribución por Edad</h4>
              <div className="space-y-2">
                {data.pacientes.distribucionPorEdad.map((grupo) => (
                  <div key={grupo.grupo} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{grupo.grupo}</span>
                    <span className="text-sm font-medium text-muted-foreground">{grupo.cantidad}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* KPIs de Tiempos */}
        <section>
          <h3 className="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Tiempos y Eficiencia
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label="Lead Time Promedio"
              value={`${data.agenda.leadTimeDiasPromedio.current.toFixed(1)} días`}
              comparison={data.agenda.leadTimeDiasPromedio.comparison}
              variant="neutral"
            />
            <KpiCard
              label="Puntualidad"
              value={`${data.agenda.puntualidadMinutosPromedio.current.toFixed(0)} min`}
              comparison={data.agenda.puntualidadMinutosPromedio.comparison}
              variant={Math.abs(data.agenda.puntualidadMinutosPromedio.current) <= 5 ? "success" : "warning"}
            />
            <KpiCard
              label="Espera en Clínica"
              value={`${data.agenda.esperaMinutosPromedio.current.toFixed(0)} min`}
              comparison={data.agenda.esperaMinutosPromedio.comparison}
              variant={data.agenda.esperaMinutosPromedio.current <= 15 ? "success" : "warning"}
            />
            <KpiCard
              label="Duración Real vs Estimada"
              value={`${data.agenda.duracionRealVsEstimadaMinutos.diferencia > 0 ? "+" : ""}${data.agenda.duracionRealVsEstimadaMinutos.diferencia} min`}
              variant={Math.abs(data.agenda.duracionRealVsEstimadaMinutos.diferencia) <= 10 ? "success" : "warning"}
            />
          </div>
        </section>
      </div>
    )
  } catch (error) {
    console.error("Error loading clinical KPIs:", error)
    return (
      <div className="rounded-xl border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">No se pudieron cargar los KPIs clínicos.</p>
      </div>
    )
  }
}
