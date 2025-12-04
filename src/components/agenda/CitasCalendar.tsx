"use client"

import type React from "react"
import { useRef, useState, useCallback, useEffect } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import esLocale from "@fullcalendar/core/locales/es"
import type { DateSelectArg, EventApi, EventClickArg, EventContentArg } from "@fullcalendar/core"

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { CitaDrawer } from "./CitaDrawer"
import { AgendaTopbar } from "./AgendaTopbar"
import { useCitasCalendarSource } from "@/hooks/useCitasCalendarSource"
import type { CurrentUser, AgendaFilters, EstadoCita } from "@/types/agenda"
import { cn } from "@/lib/utils"
import { NuevaCitaSheet } from "./NuevaCitaSheet"

// Tipo para las propiedades extendidas de los eventos de FullCalendar
type CitaEventExtendedProps = {
  consultorioColorHex?: string
  estado?: EstadoCita
  urgencia?: boolean
  primeraVez?: boolean
  planActivo?: boolean
  tieneAlergias?: boolean
  saldoPendiente?: boolean
  profesionalNombre?: string
  profesionalId?: number
  consultorioNombre?: string
}

// Constantes de horario laboral (local)
const WORK_START = "08:00"
const WORK_END = "16:00"

function isWithinWorkingHours(start: Date, end: Date) {
  const [sh, sm] = WORK_START.split(":").map(Number)
  const [eh, em] = WORK_END.split(":").map(Number)

  const s = new Date(start)
  const e = new Date(end)

  const startMinutes = s.getHours() * 60 + s.getMinutes()
  const endMinutes = e.getHours() * 60 + e.getMinutes()
  const workStartMinutes = sh * 60 + (sm || 0)
  const workEndMinutes = eh * 60 + (em || 0)

  // Misma fecha calendario
  const sameYMD = s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth() && s.getDate() === e.getDate()

  if (!sameYMD) return false
  // Debe iniciar >= 08:00 y terminar <= 16:00
  return startMinutes >= workStartMinutes && endMinutes <= workEndMinutes
}

export default function CitasCalendar({
  currentUser,
}: {
  currentUser?: CurrentUser
}) {
  const calendarRef = useRef<FullCalendar>(null)

  // Auto-initialize filters for ODONT users: automatically filter by their professional ID
  const [filters, setFilters] = useState<AgendaFilters>(() => {
    if (currentUser?.role === "ODONT" && currentUser.profesionalId) {
      return {
        profesionalId: currentUser.profesionalId,
      }
    }
    return {}
  })

  // Ensure filters stay locked for ODONT users (prevent manual changes)
  const handleFiltersChange = useCallback((newFilters: AgendaFilters) => {
    if (currentUser?.role === "ODONT" && currentUser.profesionalId) {
      // For ODONT users, always enforce their professional ID
      setFilters({
        ...newFilters,
        profesionalId: currentUser.profesionalId,
      })
    } else {
      setFilters(newFilters)
    }
  }, [currentUser])

  const events = useCitasCalendarSource(filters)

  // Drawer de detalle
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)
  // Estado para controlar el montaje del Sheet (permite animación de cierre)
  const [shouldMountSheet, setShouldMountSheet] = useState(false)

  const [nuevaCitaOpen, setNuevaCitaOpen] = useState(false)
  const [nuevaCitaDefaults, setNuevaCitaDefaults] = useState<{
    inicio?: Date
    fin?: Date
  }>({})

  const openDrawer = useCallback((eventId: number) => {
    setSelectedEventId(eventId)
    setShouldMountSheet(true) // Montar el Sheet
    setDrawerOpen(true) // Abrir el Sheet (React batch las actualizaciones)
  }, [])

  // Función centralizada para cerrar el drawer de forma consistente
  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    // Nota: selectedEventId y shouldMountSheet se limpian en el useEffect
    // después de que la animación de cierre termine completamente
  }, [])

  // Limpiar estados después de que el drawer se cierre completamente
  // La animación de cierre dura 300ms, esperamos 400ms para asegurar que termine
  useEffect(() => {
    if (!drawerOpen && shouldMountSheet) {
      const timer = setTimeout(() => {
        // Limpiar todo después de que la animación termine
        setSelectedEventId(null)
        setShouldMountSheet(false)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [drawerOpen, shouldMountSheet])

  function roundToMinutes(d: Date, stepMin = 15) {
    const ms = stepMin * 60_000
    return new Date(Math.round(d.getTime() / ms) * ms)
  }

  const onSelectDate = useCallback((arg: DateSelectArg) => {
    const start = roundToMinutes(arg.start, 15)
    const end = arg.end ? roundToMinutes(arg.end, 15) : new Date(start.getTime() + 30 * 60_000)

    setNuevaCitaDefaults({ inicio: start, fin: end })
    setNuevaCitaOpen(true)

    // Limpia la selección visual del calendario
    arg.view.calendar.unselect?.()
  }, [])

  const onEventClick = useCallback(
    (arg: EventClickArg) => {
      const id = Number(arg.event.id)
      if (!Number.isNaN(id)) openDrawer(id)
    },
    [openDrawer],
  )

  const handleAfterChange = useCallback(() => {
    calendarRef.current?.getApi().refetchEvents()
  }, [])

  const eventDidMountA11y = useCallback(
    (arg: { el: HTMLElement; event: EventApi }) => {
      arg.el.setAttribute("role", "button")
      arg.el.setAttribute("tabindex", "0")
      arg.el.setAttribute("aria-label", `Cita ${arg.event.title ?? ""} ${arg.event.start?.toLocaleString() ?? ""}`)

      arg.el.addEventListener("keydown", (ev: KeyboardEvent) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault()
          const id = Number(arg.event.id)
          if (!Number.isNaN(id)) openDrawer(id)
        }
      })

      const ext = arg.event.extendedProps as CitaEventExtendedProps
      if (ext?.consultorioColorHex) {
        arg.el.style.borderLeft = `4px solid ${ext.consultorioColorHex}`
      }

      if (ext?.estado) {
        arg.el.classList.add(`fc-event--estado-${ext.estado.toLowerCase()}`)
      }
    },
    [openDrawer],
  )

  return (
    <div className="flex flex-col h-full">
      <AgendaTopbar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onNuevaCita={() => {
          setNuevaCitaDefaults({})
          setNuevaCitaOpen(true)
        }}
        currentUser={currentUser}
      />

      {/* Calendario */}
      <div className="flex-1 rounded-2xl border border-border bg-background overflow-hidden">
        <div className="custom-calendar h-full">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            locales={[esLocale]}
            locale="es"
            timeZone="local"
            initialView="timeGridWeek"
            slotMinTime={WORK_START}
            slotMaxTime={WORK_END}
            businessHours={{
              // Lunes a sábado (ajusta si trabajas otros días)
              daysOfWeek: [1, 2, 3, 4, 5, 6],
              startTime: WORK_START,
              endTime: WORK_END,
            }}
            slotDuration="00:15:00"
            scrollTime="08:00:00"
            nowIndicator
            expandRows
            height="100%"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            selectable
            selectMirror
            selectAllow={(si) => isWithinWorkingHours(si.start, si.end)}
            select={onSelectDate}
            eventClick={onEventClick}
            displayEventEnd
            eventTimeFormat={{
              hour: "2-digit",
              minute: "2-digit",
              meridiem: false,
              hour12: false,
            }}
            slotLabelFormat={{
              hour: "2-digit",
              minute: "2-digit",
              meridiem: false,
              hour12: false,
            }}
            events={events}
            eventDidMount={eventDidMountA11y}
            eventContent={renderEventContent}
          />
        </div>
      </div>

      {shouldMountSheet && (
        <Sheet 
          open={drawerOpen} 
          onOpenChange={(open) => {
            // Manejar el cambio de estado del Sheet de forma robusta
            setDrawerOpen(open)
            // Nota: selectedEventId y shouldMountSheet se limpian automáticamente
            // en el useEffect cuando drawerOpen cambia a false, después de la animación
          }}
        >
          <SheetContent side="right" className={cn("w-full p-0", "sm:max-w-md", "md:max-w-lg")}>
            <SheetTitle className="sr-only">
              {selectedEventId ? `Detalles de cita #${selectedEventId}` : "Detalles de cita"}
            </SheetTitle>
            {selectedEventId && (
              <CitaDrawer
                idCita={selectedEventId}
                currentUser={currentUser}
                onAfterChange={handleAfterChange}
                onClose={closeDrawer}
              />
            )}
          </SheetContent>
        </Sheet>
      )}

      <NuevaCitaSheet
        key={nuevaCitaDefaults.inicio?.getTime() ?? 0}
        open={nuevaCitaOpen}
        onOpenChange={setNuevaCitaOpen}
        defaults={nuevaCitaDefaults}
        currentUser={currentUser}
        onSuccess={handleAfterChange}
      />
    </div>
  )
}

function renderEventContent(arg: EventContentArg) {
  const ext = arg.event.extendedProps as CitaEventExtendedProps
  const estado: EstadoCita = ext?.estado ?? "SCHEDULED"

  // Chip de estado con color + patrón accesible
  const estadoUI = getEstadoUI(estado)
  const chip = (
    <span
      className={cn("ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium", estadoUI.className)}
      aria-label={`Estado: ${estadoUI.label}`}
    >
      {estadoUI.icon && <span className="mr-0.5">{estadoUI.icon}</span>}
      {estadoUI.labelShort}
    </span>
  )

  const badges: React.ReactNode[] = []
  if (ext?.urgencia) badges.push(<Badge key="urg" text="URG" variant="urgent" />)
  if (ext?.primeraVez) badges.push(<Badge key="1ra" text="1ª" variant="info" />)
  if (ext?.planActivo) badges.push(<Badge key="plan" text="Plan" variant="success" />)
  if (ext?.tieneAlergias) badges.push(<Badge key="alergia" text="⚠" variant="warning" />)
  if (ext?.saldoPendiente) badges.push(<Badge key="saldo" text="$" variant="alert" />)

  const visibleBadges = badges.slice(0, 3)
  const hiddenCount = badges.length - 3

  return (
    <div className="flex flex-col gap-0.5 px-1.5 py-1 text-xs leading-tight">
      {/* Línea 1: Hora + chip estado */}
      <div className="flex items-center gap-1">
        <span className="tabular-nums font-medium">{arg.timeText}</span>
        {chip}
      </div>

      {/* Línea 2: Título (paciente — motivo) */}
      <div className="text-[13px] font-semibold truncate">{arg.event.title}</div>

      {/* Línea 3: Profesional + consultorio */}
      <div className="text-[11px] opacity-80 truncate">
        {ext?.profesionalNombre ? `Dr/a. ${ext.profesionalNombre}` : `Prof. #${ext?.profesionalId}`}
        {ext?.consultorioNombre && (
          <>
            {" · "}
            <span className="inline-flex items-center gap-1">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: ext.consultorioColorHex ?? "#888" }}
                aria-hidden
              />
              {ext.consultorioNombre}
            </span>
          </>
        )}
      </div>

      {/* Badges */}
      {visibleBadges.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {visibleBadges}
          {hiddenCount > 0 && (
            <span
              className="text-[10px] px-1 py-[1px] rounded border border-border opacity-70"
              title={`+${hiddenCount} más`}
            >
              +{hiddenCount}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function Badge({
  text,
  variant = "default",
}: { text: string; variant?: "default" | "urgent" | "info" | "success" | "warning" | "alert" }) {
  const variantClasses = {
    default: "border-border text-foreground",
    urgent: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
    info: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    alert: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  }

  return (
    <span className={cn("text-[10px] px-1 py-[1px] rounded border font-medium", variantClasses[variant])}>{text}</span>
  )
}

function getEstadoUI(estado: EstadoCita): {
  label: string
  labelShort: string
  className: string
  icon?: string
} {
  switch (estado) {
    case "SCHEDULED":
      return {
        label: "Agendada",
        labelShort: "AGE",
        className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30",
        icon: "○",
      }
    case "CONFIRMED":
      return {
        label: "Confirmada",
        labelShort: "CNF",
        className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
        icon: "✓",
      }
    case "CHECKED_IN":
      return {
        label: "Check-in",
        labelShort: "CHK",
        className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
        icon: "◐",
      }
    case "IN_PROGRESS":
      return {
        label: "En curso",
        labelShort: "CUR",
        className: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30",
        icon: "●",
      }
    case "COMPLETED":
      return {
        label: "Completada",
        labelShort: "OK",
        className: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 border border-zinc-500/30",
        icon: "✓✓",
      }
    case "CANCELLED":
      return {
        label: "Cancelada",
        labelShort: "CAN",
        className: "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30",
        icon: "✕",
      }
    case "NO_SHOW":
      return {
        label: "No asistió",
        labelShort: "N/A",
        className: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30",
        icon: "⊘",
      }
    default:
      return {
        label: String(estado),
        labelShort: "?",
        className: "bg-muted text-foreground/70",
      }
  }
}
