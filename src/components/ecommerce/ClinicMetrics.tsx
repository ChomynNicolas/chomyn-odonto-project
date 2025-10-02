"use client";

import React from "react";
import Badge from "@/components/ui/badge/Badge";
import {
  CalenderIcon,
  UserCircleIcon,
  PieChartIcon,
  TableIcon,
  // Usa los que tengas disponibles en tu pack de íconos:
  // Puedes agregar más si los tienes: WalletIcon, AlertIcon, etc.
} from "@/icons";

// ==========================
// Tipos y helpers
// ==========================
type Delta = {
  value: number;         // porcentaje, ej. 11.01 => 11.01%
  trend: "up" | "down" | "flat";
};

type Kpi = {
  id: string;
  label: string;         // "Turnos de hoy"
  value: number | string;
  icon: React.ReactNode;
  delta?: Delta;
  ariaLabel?: string;
};

function formatCurrencyPYG(value: number) {
  // Ajusta a tu necesidad/región
  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    maximumFractionDigits: 0,
  }).format(value);
}

function renderDeltaBadge(delta?: Delta) {
  if (!delta) return null;

  // Decide color según tendencia
  const color =
    delta.trend === "up" ? "success" : delta.trend === "down" ? "error" : "gray";

  // Icono inline (puedes usar también ArrowUp/Down si ya los tienes)
  const Up = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" className="mr-1">
      <path fill="currentColor" d="M12 8l6 6H6z" transform="rotate(180 12 12)"/>
    </svg>
  );
  const Down = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" className="mr-1">
      <path fill="currentColor" d="M12 8l6 6H6z"/>
    </svg>
  );

  return (
    <Badge color={color as any}>
      {delta.trend === "up" ? <Up /> : delta.trend === "down" ? <Down /> : null}
      {delta.value.toFixed(2)}%
    </Badge>
  );
}

// ==========================
// Datos mock para el MVP
// (reemplázalos luego con datos reales)
// ==========================
const MOCK_KPIS: Kpi[] = [
  {
    id: "turnos-hoy",
    label: "Turnos de hoy",
    value: 18,
    icon: <CalenderIcon className="text-gray-800 size-6 dark:text-white/90" />,
    delta: { value: 12.5, trend: "up" },
    ariaLabel: "Turnos agendados para hoy: 18",
  },
  {
    id: "ocupacion",
    label: "Ocupación (hoy)",
    value: "75%",
    icon: <PieChartIcon className="text-gray-800 size-6 dark:text-white/90" />,
    delta: { value: 3.1, trend: "down" }, // bajó 3.1% vs. ayer
    ariaLabel: "Ocupación de la clínica hoy: 75%",
  },
  {
    id: "ingresos-semana",
    label: "Ingresos (semana)",
    value: "12.5 M",
    icon: <TableIcon className="text-gray-800 size-6 dark:text-white/90" />,
    delta: { value: 9.8, trend: "up" },
    ariaLabel: "Ingresos de la semana: 12.500.000 guaraníes",
  },
  {
    id: "pacientes-nuevos",
    label: "Pacientes nuevos (mes)",
    value: 32,
    icon: <UserCircleIcon className="text-gray-800 size-6 dark:text-white/90" />,
    delta: { value: 5.2, trend: "up" },
    ariaLabel: "Pacientes nuevos en el mes: 32",
  },
  {
    id: "no-show",
    label: "Ausentismos (mes)",
    value: 4,
    icon: <CalenderIcon className="text-gray-800 size-6 dark:text-white/90" />,
    delta: { value: 1.4, trend: "down" }, // bajaron los no-show
    ariaLabel: "Ausentismos en el mes: 4",
  },
  {
    id: "facturas-vencidas",
    label: "Facturas vencidas",
    value: 3,
    icon: <TableIcon className="text-gray-800 size-6 dark:text-white/90" />,
    delta: { value: 2.0, trend: "up" }, // subieron las vencidas
    ariaLabel: "Facturas vencidas: 3",
  },
];

// ==========================
// Componente principal
// ==========================
export function ClinicMetrics({
  kpis = MOCK_KPIS,
}: {
  kpis?: Kpi[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 md:gap-6">
      {kpis.map((kpi) => (
        <div
          key={kpi.id}
          className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
          aria-label={kpi.ariaLabel}
        >
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
            {kpi.icon}
          </div>

          <div className="flex items-end justify-between mt-5">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {kpi.label}
              </span>
              <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                {kpi.value}
              </h4>
            </div>

            {renderDeltaBadge(kpi.delta)}
          </div>
        </div>
      ))}
    </div>
  );
}
