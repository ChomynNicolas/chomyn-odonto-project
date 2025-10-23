"use client";


import React, { useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import type {
  DateSelectArg,
  EventClickArg,
  EventContentArg,
  EventInput,
} from "@fullcalendar/core";
import esLocale from "@fullcalendar/core/locales/es";
import interactionPlugin from "@fullcalendar/interaction";
import { useCitasCalendarSource } from "@/hooks/useCitasCalendarSource";
import { apiCreateCita } from "@/lib/api/agenda/citas";
import { estadoToCalendarLevel } from "@/lib/adapters/citaToFullCalendar";
import Modal from "@/components/ui/Modal";

type CalendarEvent = EventInput & { extendedProps: { calendar: string; estado?: string } };

export default function CitasCalendar() {
  const calendarRef = useRef<FullCalendar>(null);
  const events  = useCitasCalendarSource(); // en el futuro: { profesionalId, consultorioId }

  

  // modal state (mínimo para smoke test)
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    pacienteId: "",
    profesionalId: "",
    consultorioId: "",
    motivo: "",
    inicio: "",
    fin: "",
  });

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  const onSelectDate = (arg: DateSelectArg) => {
    setForm((f) => ({ ...f, inicio: toLocalDT(arg.start), fin: toLocalDT(arg.end ?? arg.start) }));
    open();
  };

  const onEventClick = (arg: EventClickArg) => {
    // por ahora solo mostramos información básica
    const e = arg.event;
    alert(`Cita #${e.id}\n${e.title}\n${e.start?.toLocaleString()} - ${e.end?.toLocaleString()}`);
  };

  const onCreate = async () => {
    try {
      // mapeo mínimo al body esperado por tu POST
      const body = {
        pacienteId: Number(form.pacienteId),
        profesionalId: Number(form.profesionalId),
        consultorioId: form.consultorioId ? Number(form.consultorioId) : undefined,
        motivo: form.motivo || "Cita",
        inicio: new Date(form.inicio).toISOString(),
        fin: new Date(form.fin).toISOString(),
      };
      await apiCreateCita(body);
      // recargar eventos de la vista actual
      calendarRef.current?.getApi().refetchEvents();
      close();
    } catch (e: any) {
      alert(e?.message ?? "Error creando cita");
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="custom-calendar">
        <FullCalendar
  ref={calendarRef}
  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
  locales={[esLocale]}
  locale="es"
  timeZone="local"           // usa hora local
  initialView="timeGridWeek" // vista semanal con horas
  slotMinTime="07:00:00"
  slotMaxTime="21:00:00"
  slotDuration="00:15:00"    // grilla cada 15min
  scrollTime="08:00:00"      // scroll inicial
  nowIndicator={true}
  expandRows={true}
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

  // ⬇️ muestra la hora de fin en la celda
  displayEventEnd={true}

  // ⬇️ formato de hora para el contenido del evento
  eventTimeFormat={{
    hour: "2-digit",
    minute: "2-digit",
    meridiem: false,
    hour12: false,
  }}

  // formatea etiquetas de slot (columna izquierda)
  slotLabelFormat={{
    hour: "2-digit",
    minute: "2-digit",
    meridiem: false,
    hour12: false,
  }}

  // Fuente dinámica por rango (ya la tenés):
  events={events}

  eventDidMount={(arg) => {
  console.log(
    "mounted event:",
    arg.event.id,
    arg.event.title,
    arg.event.start?.toISOString(),
    arg.event.end?.toISOString(),
    arg.el
  );
}}

  eventContent={renderEventContent}

  customButtons={{
    addEventButton: {
      text: "Nueva Cita +",
      click: () => {
        const now = new Date();
        const in30 = new Date(now.getTime() + 30 * 60 * 1000);
        setForm((f) => ({ ...f, inicio: toLocalDT(now), fin: toLocalDT(in30), motivo: "" }));
        open();
      },
    },
  }}
/>
      </div>

      {/* Modal crear (mínimo para probar POST) */}
      <Modal open={isOpen}
  onClose={close}
  title="Crear cita (smoke test)"
  maxWidthClass="max-w-[700px]"
  className="lg:p-10">
        <div className="flex flex-col gap-4">
          <h5 className="text-xl font-semibold text-gray-800 dark:text-white/90">Crear cita (smoke test)</h5>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Paciente ID">
              <input className="input" value={form.pacienteId} onChange={(e) => setForm({ ...form, pacienteId: e.target.value })} />
            </Field>
            <Field label="Profesional ID">
              <input className="input" value={form.profesionalId} onChange={(e) => setForm({ ...form, profesionalId: e.target.value })} />
            </Field>
            <Field label="Consultorio ID (opcional)">
              <input className="input" value={form.consultorioId} onChange={(e) => setForm({ ...form, consultorioId: e.target.value })} />
            </Field>
            <Field label="Motivo">
              <input className="input" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Control, RX, etc." />
            </Field>
            <Field label="Inicio">
              <input type="datetime-local" className="input" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} />
            </Field>
            <Field label="Fin">
              <input type="datetime-local" className="input" value={form.fin} onChange={(e) => setForm({ ...form, fin: e.target.value })} />
            </Field>
          </div>

          <div className="mt-2 flex items-center justify-end gap-3">
            <button onClick={close} className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              Cancelar
            </button>
            <button onClick={onCreate} className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
              Guardar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/** Render de evento con tus utilidades de color (globals.css) */
function renderEventContent(eventInfo: EventContentArg) {
  const ext = eventInfo.event.extendedProps as any;
  // si mapeaste `backgroundColor` desde consultorioColorHex, FullCalendar pinta automáticamente
  // igualmente podés reforzar con una “pill” de estado:
  const estado = String(ext?.estado ?? "");
  const shortEstado = estado.replace("_", " "); // NO_SHOW -> NO SHOW

  return (
    <div className="flex flex-col gap-0.5 px-1 py-0.5 rounded-sm">
      <div className="flex items-center gap-1">
        <span className="text-xs tabular-nums">{eventInfo.timeText}</span>
        {estado && (
          <span className="ml-auto text-[10px] px-1 rounded bg-black/10 dark:bg-white/10">
            {shortEstado}
          </span>
        )}
      </div>
      <div className="leading-tight text-[12px] font-medium">
        {eventInfo.event.title /* paciente — motivo (lo armamos en citaToEvent) */}
      </div>
      <div className="text-[11px] opacity-80">
        {ext?.profesionalNombre ? `Dr/a. ${ext.profesionalNombre}` : `Profesional #${ext?.profesionalId}`}
        {ext?.consultorioNombre ? ` · ${ext.consultorioNombre}` : ""}
      </div>
    </div>
  );
}

/** Subcomponente simple */
function Field({ label, children }: React.PropsWithChildren<{ label: string }>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <div className="relative">
        <div className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
          {children}
        </div>
      </div>
    </label>
  );
}

function toLocalDT(d: Date) {
  const z = new Date(d);
  z.setMinutes(z.getMinutes() - z.getTimezoneOffset());
  return z.toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm
}
