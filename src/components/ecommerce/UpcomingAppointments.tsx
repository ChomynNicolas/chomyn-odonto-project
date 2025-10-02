"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import { MoreDotIcon } from "@/icons";

// (Opcional) si quieres gráficos minúsculos, puedes usar react-apexcharts también, pero aquí haremos solo lista.

type AppointmentStatus = "SCHEDULED" | "CONFIRMED" | "DELAYED";
type ViewRange = "today" | "tomorrow" | "week";

export type UpcomingAppointment = {
  id: string;
  datetime: string; // ISO
  durationMin: number;
  status: AppointmentStatus;
  patient: { id: string; name: string; doc?: string };
  professional: { id: string; name: string };
  reason?: string;
};

export type UpcomingAppointmentsProps = {
  title?: string;
  subtitle?: string;
  items?: UpcomingAppointment[]; // lista prefiltrada
  defaultRange?: ViewRange;
};

// ============================
// Helpers de formato (es-PY)
// ============================
const TZ = "America/Asuncion";
function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("es-PY", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: TZ,
    });
  } catch {
    return iso;
  }
}
function formatDay(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-PY", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      timeZone: TZ,
    });
  } catch {
    return iso;
  }
}

function statusBadgeClass(s: AppointmentStatus) {
  switch (s) {
    case "CONFIRMED":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";
    case "DELAYED":
      return "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400";
    default:
      return "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";
  }
}

// ============================
// MOCK (hardcode inicial)
// ============================
const MOCK_ITEMS: UpcomingAppointment[] = [
  {
    id: "apt_001",
    datetime: new Date().toISOString().slice(0, 13) + ":30:00.000Z", // ~ hh:30
    durationMin: 30,
    status: "CONFIRMED",
    patient: { id: "pac_01", name: "Juan Pérez", doc: "CI 4.321.987" },
    professional: { id: "pro_01", name: "Dra. Gómez" },
    reason: "Control y limpieza",
  },
  {
    id: "apt_002",
    datetime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // +1h
    durationMin: 45,
    status: "SCHEDULED",
    patient: { id: "pac_02", name: "Ana Ruiz", doc: "CI 2.345.678" },
    professional: { id: "pro_02", name: "Dr. López" },
    reason: "Obturación pieza 2.6",
  },
  {
    id: "apt_003",
    datetime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // +2h
    durationMin: 60,
    status: "DELAYED",
    patient: { id: "pac_03", name: "María Fernández" },
    professional: { id: "pro_01", name: "Dra. Gómez" },
    reason: "Endodoncia 1.1",
  },
];

// ============================
// Componente principal
// ============================
export default function UpcomingAppointments({
  title = "Próximos turnos",
  subtitle = "Turnos a presentar y profesionales asignados",
  items = MOCK_ITEMS,
  defaultRange = "today",
}: UpcomingAppointmentsProps) {
  const [range, setRange] = useState<ViewRange>(defaultRange);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // En una integración real, `items` vendrá ya filtrado por rango desde el servidor.
  const data = useMemo(() => {
    // Aquí podrías reordenar o reagrupar por día cuando range === "week"
    return [...items].sort(
      (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );
  }, [items]);

  function openMenu(id: string) {
    setMenuOpen((cur) => (cur === id ? null : id));
  }
  function closeMenu() {
    setMenuOpen(null);
  }

  // Acciones (placeholders por ahora)
  async function handleCheckIn(aptId: string) {
    // FUTURO: await checkIn(aptId)
    alert(`Check-in realizado para turno ${aptId}`);
    closeMenu();
  }
  async function handleReschedule(aptId: string) {
    // FUTURO: abrir modal o ir a /agenda/reprogramar?id=aptId
    window.location.href = `/agenda/reprogramar?id=${aptId}`;
  }
  async function handleOpenPatient(pacId: string) {
    window.location.href = `/pacientes/${pacId}`;
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      {/* Header */}
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            {subtitle} · {range === "today" ? "Hoy" : range === "tomorrow" ? "Mañana" : "Esta semana"}
          </p>
        </div>

        {/* Tabs de rango (client-only) */}
        <div className="flex items-center gap-2">
          {(["today", "tomorrow", "week"] as ViewRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-full px-3 py-1 text-sm border transition ${
                range === r
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
              }`}
            >
              {r === "today" ? "Hoy" : r === "tomorrow" ? "Mañana" : "Semana"}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de turnos */}
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[700px] xl:min-w-full">
          <ul role="list" className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.map((apt) => {
              const isOpen = menuOpen === apt.id;
              return (
                <li key={apt.id} className="py-3 sm:py-4">
                  <div className="flex items-center gap-4">
                    {/* Hora */}
                    <div className="shrink-0 text-left w-20">
                      <div className="text-base font-semibold text-gray-800 dark:text-white/90">
                        {formatTime(apt.datetime)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{formatDay(apt.datetime)}</div>
                    </div>

                    {/* Separador vertical */}
                    <div className="hidden sm:block w-px self-stretch bg-gray-200 dark:bg-gray-800" />

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Paciente:</span>
                        <button
                          onClick={() => handleOpenPatient(apt.patient.id)}
                          className="text-sm font-medium text-gray-800 underline underline-offset-2 hover:text-brand-600 dark:text-white/90"
                        >
                          {apt.patient.name}
                        </button>
                        {apt.patient.doc && (
                          <span className="text-xs text-gray-400">· {apt.patient.doc}</span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Profesional:</span>
                        <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {apt.professional.name}
                        </span>
                        {apt.reason && (
                          <>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-sm text-gray-600 dark:text-gray-300">{apt.reason}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Estado */}
                    <div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                          apt.status
                        )}`}
                      >
                        {apt.status === "SCHEDULED"
                          ? "Programado"
                          : apt.status === "CONFIRMED"
                          ? "Confirmado"
                          : "Retrasado"}
                      </span>
                    </div>

                    {/* Acciones */}
                    <div className="relative">
                      <button
                        onClick={() => openMenu(apt.id)}
                        aria-haspopup="menu"
                        aria-expanded={isOpen}
                        className="dropdown-toggle"
                        title="Acciones"
                      >
                        <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
                      </button>
                      <Dropdown isOpen={isOpen} onClose={closeMenu} className="w-48 p-2">
                        <DropdownItem
                          onItemClick={() => handleCheckIn(apt.id)}
                          className="flex w-full font-normal text-left text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
                        >
                          Registrar llegada (Check-in)
                        </DropdownItem>
                        <DropdownItem
                          onItemClick={() => handleOpenPatient(apt.patient.id)}
                          className="flex w-full font-normal text-left text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
                        >
                          Ver ficha del paciente
                        </DropdownItem>
                        <DropdownItem
                          onItemClick={() => handleReschedule(apt.id)}
                          className="flex w-full font-normal text-left text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
                        >
                          Reprogramar
                        </DropdownItem>
                        <DropdownItem
                          onItemClick={() => (window.location.href = `/agenda?focus=${apt.id}`)}
                          className="flex w-full font-normal text-left text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
                        >
                          Abrir en calendario
                        </DropdownItem>
                      </Dropdown>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {data.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No hay turnos en el rango seleccionado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
