"use client";

import React, { useMemo, useRef, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import type {
  DateSelectArg,
  EventApi,
  EventClickArg,
  EventContentArg,
} from "@fullcalendar/core";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CalendarTopbar } from "./CalendarTopbar";
import { CalendarLegend } from "./CalendarLegend";
import { CitaDrawer } from "./CitaDrawer";
import { useCalendarFilters } from "@/hooks/useCalendarFilters";
import { useCitasCalendarSource } from "@/hooks/useCitasCalendarSource";
import { apiCreateCita } from "@/lib/api/agenda/citas";
import { isRole } from "@/lib/rbac";

// ====== Enums locales (alineados a tu Prisma) ======
export type EstadoCita =
  | "SCHEDULED"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type TipoCita =
  | "CONSULTA"
  | "LIMPIEZA"
  | "ENDODONCIA"
  | "EXTRACCION"
  | "URGENCIA"
  | "ORTODONCIA"
  | "CONTROL"
  | "OTRO";

export type CalendarRange = "HOY" | "SEMANA" | "MES";

export type CalendarFilters = {
  profesionalIds: number[];
  consultorioIds: number[];
  estados: EstadoCita[];
  tipos: TipoCita[];
  range: CalendarRange;
};

// Podés inyectar user/rol desde tu sesión (NextAuth)
type CurrentUser = {
  idUsuario: number;
  rol: "ADMIN" | "ODONT" | "RECEP";
  profesionalId?: number | null;
};

export default function CitasCalendar({
  currentUser,
  clinicAllowsCrossView = true,
}: {
  currentUser?: CurrentUser;
  clinicAllowsCrossView?: boolean;
}) {
  const calendarRef = useRef<FullCalendar>(null);

  // ===== Filtros persistentes (URL + localStorage) =====
  const {
    filters,
    setFilters,
    applyFiltersToUrl,
    clearFilters,
    initialRangeNavigation,
  } = useCalendarFilters({ currentUser, clinicAllowsCrossView });

  // ===== Fuente dinámica por rango + filtros =====
  const events = useCitasCalendarSource(filters);

  // ===== Modal/Drawer estado =====
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  const openDrawer = useCallback((eventId: number) => {
    setSelectedEventId(eventId);
    setDrawerOpen(true);
  }, []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // ====== Creación rápida (smoke) ======
  const [quick, setQuick] = useState({
    pacienteId: "",
    profesionalId: "",
    consultorioId: "",
    motivo: "",
    inicio: "",
    fin: "",
  });

  const onSelectDate = (arg: DateSelectArg) => {
    setQuick((f) => ({
      ...f,
      inicio: toLocalDT(arg.start),
      fin: toLocalDT(arg.end ?? arg.start),
    }));
    // Abro un mini modal nativo (temporal) o podrías usar un Dialog bien bonito.
    const ok = window.confirm(
      "Crear cita rápida en el rango seleccionado?\nLuego podrás editarla."
    );
    if (ok) {
      // Si hay profesional por defecto en filtros, úsalo
      const profId =
        quick.profesionalId ||
        (filters.profesionalIds[0] ? String(filters.profesionalIds[0]) : "");
      setQuick((f) => ({ ...f, profesionalId: profId }));
      onCreate();
    }
  };

  const onEventClick = (arg: EventClickArg) => {
    const id = Number(arg.event.id);
    if (!Number.isNaN(id)) openDrawer(id);
  };

  const onCreate = async () => {
    try {
      if (!quick.pacienteId || !quick.profesionalId || !quick.inicio || !quick.fin) {
        alert("Faltan datos mínimos: paciente, profesional, inicio y fin.");
        return;
      }
      const body = {
        pacienteId: Number(quick.pacienteId),
        profesionalId: Number(quick.profesionalId),
        consultorioId: quick.consultorioId ? Number(quick.consultorioId) : undefined,
        motivo: quick.motivo || "Cita",
        inicio: new Date(quick.inicio).toISOString(),
        fin: new Date(quick.fin).toISOString(),
      };
      await apiCreateCita(body);
      calendarRef.current?.getApi().refetchEvents();
      setQuick({
        pacienteId: "",
        profesionalId: "",
        consultorioId: "",
        motivo: "",
        inicio: "",
        fin: "",
      });
    } catch (e: any) {
      alert(e?.message ?? "Error creando cita");
    }
  };

  // ====== A11y: permitir Enter para abrir; Esc para cerrar ======
  const eventDidMountA11y = useCallback((arg: { el: HTMLElement; event: EventApi }) => {
    arg.el.setAttribute("role", "button");
    arg.el.setAttribute(
      "aria-label",
      `Cita ${arg.event.title ?? ""} ${arg.event.start?.toLocaleString() ?? ""}`
    );
    arg.el.tabIndex = 0;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Enter") {
        const id = Number(arg.event.id);
        if (!Number.isNaN(id)) openDrawer(id);
      }
    };
    arg.el.addEventListener("keydown", onKey);
  }, [openDrawer]);

  // ===== Navegación inicial según rango rápido (al montar / al cambiar) =====
  const onCalendarReady = useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    initialRangeNavigation(api, filters.range);
  }, [filters.range, initialRangeNavigation]);

  // ===== Cambiar vista según range =====
  const onRangeChange = useCallback(
    (range: CalendarRange) => {
      setFilters((f) => ({ ...f, range }));
      const api = calendarRef.current?.getApi();
      if (!api) return;
      if (range === "HOY") {
        api.changeView("timeGridDay");
        api.today();
      } else if (range === "SEMANA") {
        api.changeView("timeGridWeek");
        api.today();
      } else {
        api.changeView("dayGridMonth");
        api.today();
      }
    },
    [setFilters]
  );

  return (
    <div className="rounded-2xl border border-border bg-background">
      {/* Topbar de filtros persistentes */}
      <div className="p-3 sm:p-4 border-b border-border">
        <CalendarTopbar
          filters={filters}
          setFilters={setFilters}
          onApply={() => {
            applyFiltersToUrl();
            calendarRef.current?.getApi().refetchEvents();
          }}
          onClear={() => {
            clearFilters();
            calendarRef.current?.getApi().refetchEvents();
          }}
          onRangeChange={onRangeChange}
          currentUser={currentUser}
        />
      </div>

      {/* Leyenda de colorimetría / estados */}
      <CalendarLegend className="px-3 sm:px-4 py-2" />

      {/* Calendario */}
      <div className="custom-calendar">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          locales={[esLocale]}
          locale="es"
          timeZone="local"
          initialView="timeGridWeek"
          slotMinTime="07:00:00"
          slotMaxTime="21:00:00"
          slotDuration="00:15:00"
          scrollTime="08:00:00"
          nowIndicator
          expandRows
          height="auto"
          headerToolbar={{
            left: "prev,next today addEventButton",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          selectable
          selectMirror
          select={onSelectDate}
          eventClick={onEventClick}
          displayEventEnd
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", meridiem: false, hour12: false }}
          slotLabelFormat={{ hour: "2-digit", minute: "2-digit", meridiem: false, hour12: false }}
          events={events}
          eventDidMount={(arg) => {
            // A11y + foco + “punto” de consultorio
            eventDidMountA11y(arg);
            arg.el.classList.add("fc-event--clinic");
          }}
          eventContent={renderEventContent}
          customButtons={{
            addEventButton: {
              text: "Nueva Cita +",
              click: () => {
                const now = new Date();
                const in30 = new Date(now.getTime() + 30 * 60 * 1000);
                setQuick((f) => ({
                  ...f,
                  inicio: toLocalDT(now),
                  fin: toLocalDT(in30),
                  motivo: "",
                }));
                onCreate(); // atajo rápido
              },
            },
          }}
          datesSet={onCalendarReady}
        />
      </div>

      {/* Drawer de detalle con acciones contextuales */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          {selectedEventId && (
            <CitaDrawer
              idCita={selectedEventId}
              onClose={closeDrawer}
              currentUser={currentUser}
              onAfterChange={() => {
                // Refrescar eventos tras una transición
                calendarRef.current?.getApi().refetchEvents();
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/** Render del contenido del evento (3 líneas + chip de estado + badges) */
function renderEventContent(arg: EventContentArg) {
  const ext = arg.event.extendedProps as any;
  const estado: string = String(ext?.estado ?? "");
  const chip =
    estado &&
    <span className="ml-auto text-[10px] px-1 rounded bg-black/10 dark:bg-white/10">
      {estado.replaceAll("_", " ")}
    </span>;

  const badges = (
    <div className="mt-0.5 flex flex-wrap gap-1">
      {ext?.urgencia ? <Badge text="URGENCIA" /> : null}
      {ext?.primeraVez ? <Badge text="Primera vez" /> : null}
      {ext?.planActivo ? <Badge text="Plan activo" /> : null}
    </div>
  );

  return (
    <div className="flex flex-col gap-0.5 px-1 py-0.5 rounded-sm">
      <div className="flex items-center gap-1">
        <span className="text-xs tabular-nums">{arg.timeText}</span>
        {chip}
      </div>
      <div className="leading-tight text-[12px] font-medium">
        {arg.event.title /* “Paciente — motivo” desde tu adapter */}
      </div>
      <div className="text-[11px] opacity-80">
        {ext?.profesionalNombre ? `Dr/a. ${ext.profesionalNombre}` : `Profesional #${ext?.profesionalId}`}
        {ext?.consultorioNombre ? ` · ${ext.consultorioNombre}` : ""}
      </div>
      {badges}
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <span className="text-[10px] px-1 py-[1px] rounded border border-border">
      {text}
    </span>
  );
}

function toLocalDT(d: Date) {
  const z = new Date(d);
  z.setMinutes(z.getMinutes() - z.getTimezoneOffset());
  return z.toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm
}
