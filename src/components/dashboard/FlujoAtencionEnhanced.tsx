"use client"

import type { KpiTiemposDTO, ColaDTO } from "@/app/api/dashboard/kpi/_dto"
import { Clock, Users, Stethoscope, Building2 } from "lucide-react"
import { differenceInMinutes } from "date-fns"

interface PatientCardProps {
  idCita: number
  hora: string
  paciente: string
  consultorio?: string | null
  profesional?: string
  tipo: "checkIn" | "inProgress"
}

function PatientCard({  hora, paciente, consultorio, profesional, tipo }: PatientCardProps) {
  const appointmentTime = new Date(hora)
  const now = new Date()
  const minutesDiff = differenceInMinutes(appointmentTime, now)
  
  // Calcular tiempo relativo en español
  let timeLabel = ""
  if (tipo === "checkIn") {
    // Para pacientes en sala, mostrar cuánto falta para su turno
    if (minutesDiff > 0) {
      if (minutesDiff < 60) {
        timeLabel = `En ${minutesDiff} minuto${minutesDiff !== 1 ? "s" : ""}`
      } else {
        const hours = Math.floor(minutesDiff / 60)
        const mins = minutesDiff % 60
        if (mins === 0) {
          timeLabel = `En ${hours} hora${hours !== 1 ? "s" : ""}`
        } else {
          timeLabel = `En ${hours} hora${hours !== 1 ? "s" : ""} y ${mins} minuto${mins !== 1 ? "s" : ""}`
        }
      }
    } else if (minutesDiff === 0) {
      timeLabel = "Turno ahora"
    } else {
      // Turno ya pasó
      const minsAtras = Math.abs(minutesDiff)
      if (minsAtras < 60) {
        timeLabel = `Hace ${minsAtras} minuto${minsAtras !== 1 ? "s" : ""}`
      } else {
        const hours = Math.floor(minsAtras / 60)
        const mins = minsAtras % 60
        if (mins === 0) {
          timeLabel = `Hace ${hours} hora${hours !== 1 ? "s" : ""}`
        } else {
          timeLabel = `Hace ${hours} hora${hours !== 1 ? "s" : ""} y ${mins} minuto${mins !== 1 ? "s" : ""}`
        }
      }
    }
  } else {
    // Para pacientes en atención, mostrar hace cuánto empezó
    const minsAtras = Math.abs(differenceInMinutes(now, appointmentTime))
    if (minsAtras < 1) {
      timeLabel = "Recién iniciado"
    } else if (minsAtras < 60) {
      timeLabel = `Hace ${minsAtras} minuto${minsAtras !== 1 ? "s" : ""}`
    } else {
      const hours = Math.floor(minsAtras / 60)
      const mins = minsAtras % 60
      if (mins === 0) {
        timeLabel = `Hace ${hours} hora${hours !== 1 ? "s" : ""}`
      } else {
        timeLabel = `Hace ${hours} hora${hours !== 1 ? "s" : ""} y ${mins} minuto${mins !== 1 ? "s" : ""}`
      }
    }
  }

  return (
    <div className="block p-4 rounded-lg border-2 border-border bg-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-2 h-2 rounded-full ${
                tipo === "inProgress" ? "bg-emerald-500 animate-pulse" : "bg-blue-500"
              }`}
            />
            <span className="text-xs font-medium text-muted-foreground">{timeLabel}</span>
          </div>
          <h4 className="font-semibold text-foreground truncate">
            {paciente}
          </h4>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {consultorio && (
              <div className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                <span>{consultorio}</span>
              </div>
            )}
            {profesional && (
              <div className="flex items-center gap-1">
                <Stethoscope className="w-3 h-3" />
                <span>{profesional}</span>
              </div>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-bold text-foreground">
            {appointmentTime.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FlujoAtencionEnhanced({ tiempos, colas }: { tiempos: KpiTiemposDTO; colas: ColaDTO }) {
  const totalEnSistema = colas.checkIn.length + colas.enAtencion.length

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Total en Sistema</span>
          </div>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{totalEnSistema}</p>
        </div>
        <div className="rounded-lg border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">En Sala</span>
          </div>
          <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{colas.checkIn.length}</p>
        </div>
        <div className="rounded-lg border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Stethoscope className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">En Atención</span>
          </div>
          <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{colas.enAtencion.length}</p>
        </div>
        <div className="rounded-lg border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-medium text-purple-700 dark:text-purple-400">Tiempo Promedio</span>
          </div>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {tiempos.promedioMin ?? "—"} min
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* En Sala */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">En Sala de Espera</h3>
                <p className="text-xs text-muted-foreground">Pacientes esperando atención</p>
              </div>
            </div>
            <div className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700">
              <span className="text-sm font-bold text-amber-900 dark:text-amber-100">{colas.checkIn.length}</span>
            </div>
          </div>

          {colas.checkIn.length > 0 ? (
            <div className="space-y-3">
              {colas.checkIn.map((c) => (
                <PatientCard
                  key={c.idCita}
                  idCita={c.idCita}
                  hora={c.hora}
                  paciente={c.paciente}
                  consultorio={c.consultorio}
                  tipo="checkIn"
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium text-muted-foreground">No hay pacientes en sala de espera</p>
            </div>
          )}
        </div>

        {/* En Atención */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Stethoscope className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">En Atención</h3>
                <p className="text-xs text-muted-foreground">Pacientes siendo atendidos</p>
              </div>
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700">
              <span className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                {colas.enAtencion.length}
              </span>
            </div>
          </div>

          {colas.enAtencion.length > 0 ? (
            <div className="space-y-3">
              {colas.enAtencion.map((c) => (
                <PatientCard
                  key={c.idCita}
                  idCita={c.idCita}
                  hora={c.hora}
                  paciente={c.paciente}
                  profesional={c.profesional}
                  tipo="inProgress"
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 text-center">
              <Stethoscope className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium text-muted-foreground">No hay pacientes en atención</p>
            </div>
          )}
        </div>
      </div>

      {/* Additional Stats */}
      {tiempos.atencionesHoy > 0 && (
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Atenciones con Tiempo</p>
            <p className="text-lg font-semibold text-foreground">{tiempos.atencionesHoy}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Mediana</p>
            <p className="text-lg font-semibold text-foreground">{tiempos.medianaMin ?? "—"} min</p>
          </div>
        </div>
      )}
    </div>
  )
}

