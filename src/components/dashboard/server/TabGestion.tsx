import { auth } from "@/auth"
import { redirect } from "next/navigation"
import type { Rol } from "@/lib/rbac"
import { startOfMonth, endOfMonth } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { BarChart3, Users, Calendar, AlertTriangle } from "lucide-react"
import { buildKpiClinicoOverview } from "@/app/api/dashboard/kpi/_service"
import { KpiCard } from "@/components/kpis/KpiCard"

const TZ = "America/Asuncion"

export default async function TabGestion({ role }: { role: Rol }) {
  const session = await auth()
  if (!session) redirect("/signin")

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

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Gestión Operativa</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Métricas de eficiencia y utilización · {formatInTimeZone(startDate, TZ, "MMMM yyyy")}
          </p>
        </div>

        {/* Métricas de Agenda */}
        <section>
          <h3 className="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Gestión de Agenda
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label="Turnos Completados"
              value={data.agenda.turnosCompletados.current}
              comparison={data.agenda.turnosCompletados}
              variant="success"
            />
            <KpiCard
              label="Tasa de Reprogramación"
              value={`${data.agenda.reprogramacionRate.current.toFixed(1)}%`}
              comparison={data.agenda.reprogramacionRate}
              variant={data.agenda.reprogramacionRate.current <= 15 ? "success" : "warning"}
            />
            <KpiCard
              label="Cancelaciones Same-Day"
              value={data.agenda.sameDayCancellations}
              variant={data.agenda.sameDayCancellations <= 5 ? "success" : "danger"}
            />
            <KpiCard
              label="Conflictos de Agenda"
              value={data.utilizacion.conflictos}
              variant={data.utilizacion.conflictos === 0 ? "success" : "danger"}
            />
          </div>
        </section>

        {/* Utilización de Recursos */}
        <section>
          <h3 className="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Utilización de Recursos
          </h3>

          {/* Por Profesional */}
          {data.utilizacion.porProfesional.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm mb-4">
              <h4 className="text-sm font-medium text-foreground mb-3">Utilización por Profesional</h4>
              <div className="space-y-3">
                {data.utilizacion.porProfesional.slice(0, 5).map((prof) => (
                  <div key={prof.profesionalId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground truncate">{prof.nombreCompleto}</span>
                      <span className="text-sm font-medium text-muted-foreground ml-2">
                        {prof.utilizacionPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          prof.utilizacionPercent >= 80
                            ? "bg-emerald-500"
                            : prof.utilizacionPercent >= 60
                              ? "bg-blue-500"
                              : "bg-amber-500"
                        }`}
                        style={{ width: `${Math.min(prof.utilizacionPercent, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {prof.horasReales.toFixed(1)}h de {prof.horasCapacidad.toFixed(1)}h disponibles
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Por Consultorio */}
          {data.utilizacion.porConsultorio.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h4 className="text-sm font-medium text-foreground mb-3">Utilización por Consultorio</h4>
              <div className="space-y-3">
                {data.utilizacion.porConsultorio.map((cons) => (
                  <div key={cons.consultorioId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground">{cons.nombre}</span>
                      <span className="text-sm font-medium text-muted-foreground">
                        {cons.utilizacionPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          cons.utilizacionPercent >= 80
                            ? "bg-emerald-500"
                            : cons.utilizacionPercent >= 60
                              ? "bg-blue-500"
                              : "bg-amber-500"
                        }`}
                        style={{ width: `${Math.min(cons.utilizacionPercent, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {cons.horasReales.toFixed(1)}h de {cons.horasCapacidad.toFixed(1)}h disponibles
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Pipeline de Tratamientos */}
        <section>
          <h3 className="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Pipeline de Tratamientos
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KpiCard label="Pendientes" value={data.produccion.pipelineTratamiento.pending} variant="default" />
            <KpiCard label="Programados" value={data.produccion.pipelineTratamiento.scheduled} variant="default" />
            <KpiCard label="En Progreso" value={data.produccion.pipelineTratamiento.inProgress} variant="warning" />
            <KpiCard label="Completados" value={data.produccion.pipelineTratamiento.completed} variant="success" />
            <KpiCard label="Cancelados" value={data.produccion.pipelineTratamiento.cancelled} variant="danger" />
            <KpiCard label="Diferidos" value={data.produccion.pipelineTratamiento.deferred} variant="default" />
          </div>
        </section>

        {/* Alertas de Gestión */}
        {(data.utilizacion.conflictos > 0 || data.calidad.consultasEnDraftMasDeNHoras > 0) && (
          <section>
            <h3 className="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Alertas de Gestión
            </h3>
            <div className="space-y-3">
              {data.utilizacion.conflictos > 0 && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950/30">
                  <p className="text-sm font-medium text-rose-800 dark:text-rose-400">
                    ⚠️ {data.utilizacion.conflictos} conflictos de agenda detectados
                  </p>
                  <p className="text-xs text-rose-700 dark:text-rose-500 mt-1">
                    Revisar solapamientos de profesionales o consultorios
                  </p>
                </div>
              )}
              {data.calidad.consultasEnDraftMasDeNHoras > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                    ⚠️ {data.calidad.consultasEnDraftMasDeNHoras} consultas sin finalizar por más de{" "}
                    {data.calidad.thresholdHoras}h
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
                    Recordar a profesionales completar documentación
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    )
  } catch (error) {
    console.error("Error loading management KPIs:", error)
    return (
      <div className="rounded-xl border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">No se pudieron cargar los KPIs de gestión.</p>
      </div>
    )
  }
}
