// src/components/header/CurrentPatientInfo.tsx
"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { useCurrentPatientFlow } from "@/lib/hooks/use-current-patient-flow"
import { Stethoscope, Clock, ChevronRight } from "lucide-react"
import { differenceInMinutes } from "date-fns"

export function CurrentPatientInfo() {
  const { data: session } = useSession()
  const { data, isLoading } = useCurrentPatientFlow()

  // No mostrar si no hay datos o está cargando
  if (isLoading || !data || (!data.enAtencion && !data.siguienteTurno)) {
    return null
  }

  const role = session?.user?.role

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* Paciente en Atención */}
      {data.enAtencion && (
        <Link
          href={`/pacientes/${data.enAtencion.pacienteId}`}
          className="group flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors"
          title={`Ver ficha de ${data.enAtencion.paciente}`}
        >
          <div className="relative flex-shrink-0">
            <Stethoscope className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full animate-pulse" />
          </div>
          <div className="flex flex-col min-w-0 hidden sm:flex">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 truncate max-w-[100px] lg:max-w-[120px]">
              {data.enAtencion.paciente}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
              En atención
            </span>
          </div>
          {role === "ODONT" && (
            <Link
              href={`/agenda/citas/${data.enAtencion.idCita}/consulta`}
              onClick={(e) => e.stopPropagation()}
              className="ml-0.5 sm:ml-1 p-0.5 sm:p-1 rounded hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors flex-shrink-0"
              title="Ir a consulta clínica"
            >
              <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400" />
            </Link>
          )}
        </Link>
      )}

      {/* Siguiente Turno */}
      {data.siguienteTurno && (
        <Link
          href={`/pacientes/${data.siguienteTurno.pacienteId}`}
          className="group flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
          title={`Ver ficha de ${data.siguienteTurno.paciente}`}
        >
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="flex flex-col min-w-0 hidden sm:flex">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-300 truncate max-w-[100px] lg:max-w-[120px]">
              {data.siguienteTurno.paciente}
            </span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400">
              {getTimeLabel(data.siguienteTurno.hora)}
            </span>
          </div>
        </Link>
      )}
    </div>
  )
}

function getTimeLabel(hora: string): string {
  const appointmentTime = new Date(hora)
  const now = new Date()
  const minutesDiff = differenceInMinutes(appointmentTime, now)

  if (minutesDiff > 0) {
    if (minutesDiff < 60) {
      return `En ${minutesDiff} min`
    } else {
      const hours = Math.floor(minutesDiff / 60)
      const mins = minutesDiff % 60
      if (mins === 0) {
        return `En ${hours}h`
      } else {
        return `En ${hours}h ${mins}m`
      }
    }
  } else if (minutesDiff === 0) {
    return "Ahora"
  } else {
    const minsAtras = Math.abs(minutesDiff)
    if (minsAtras < 60) {
      return `Hace ${minsAtras}m`
    } else {
      const hours = Math.floor(minsAtras / 60)
      return `Hace ${hours}h`
    }
  }
}

