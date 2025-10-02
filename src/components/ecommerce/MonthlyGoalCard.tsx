"use client";

import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { MoreDotIcon } from "@/icons";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";

// Carga dinámica del chart
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

/** =========================
 * Tipos y helpers
 * ========================= */
type Mode = "ingresos" | "ocupacion";

export type MonthlyGoalProps = {
  title?: string;               // "Objetivo mensual"
  subtitle?: string;            // "Meta definida para este mes"
  mode?: Mode;                  // ingresos | ocupacion
  currency?: string;            // "PYG" por defecto si mode=ingresos
  target: number;               // objetivo del mes (monto u % base 0-100)
  achieved: number;             // logrado acumulado (monto u %)
  today?: number;               // monto/dato de hoy (opcional)
  deltaPct?: number;            // variación vs mes anterior (ej. +10 => +10%)
};

function formatCurrency(value: number, currency = "PYG") {
  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

function signColor(v: number) {
  if (v > 0) return { bg: "bg-success-50 dark:bg-success-500/15", text: "text-success-600 dark:text-success-500" };
  if (v < 0) return { bg: "bg-error-50 dark:bg-error-500/15", text: "text-error-600 dark:text-error-500" };
  return { bg: "bg-gray-100 dark:bg-white/10", text: "text-gray-600 dark:text-gray-300" };
}

/** =========================
 * Componente principal (mock por defecto)
 * ========================= */
export default function MonthlyGoalCard({
  title = "Objetivo mensual",
  subtitle = "Meta definida para este mes",
  mode = "ingresos",
  currency = "PYG",
  target = 20000000,   // 20M PYG (mock)
  achieved = 15110000, // 15.11M PYG (mock)
  today = 328700,      // hoy (mock)
  deltaPct = 10,       // +10% vs mes anterior (mock)
}: MonthlyGoalProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Porcentaje de cumplimiento (serie del radial)
  const percent = useMemo(() => {
    if (mode === "ingresos") {
      const pct = target > 0 ? (achieved / target) * 100 : 0;
      return clamp(Number(pct.toFixed(2)));
    }
    // modo ocupación: asumimos 'achieved' ya es un % 0-100
    return clamp(Number(achieved.toFixed(2)));
  }, [mode, target, achieved]);

  const options: ApexOptions = useMemo(() => {
    return {
      colors: ["#465FFF"],
      chart: {
        fontFamily: "Outfit, sans-serif",
        type: "radialBar",
        height: 330,
        sparkline: { enabled: true },
      },
      plotOptions: {
        radialBar: {
          startAngle: -85,
          endAngle: 85,
          hollow: { size: "80%" },
          track: { background: "#E4E7EC", strokeWidth: "100%", margin: 5 },
          dataLabels: {
            name: { show: false },
            value: {
              fontSize: "36px",
              fontWeight: 600,
              offsetY: -40,
              color: "#1D2939",
              formatter: (val) => `${val}%`,
            },
          },
        },
      },
      fill: { type: "solid", colors: ["#465FFF"] },
      stroke: { lineCap: "round" },
      labels: ["Progreso"],
      tooltip: { enabled: false },
    };
  }, []);

  const series = useMemo(() => [percent], [percent]);
  const deltaStyle = signColor(deltaPct);

  function toggleDropdown() { setIsOpen((v) => !v); }
  function closeDropdown() { setIsOpen(false); }

  // Etiquetas del resumen según modo
  const labelAchieved = mode === "ingresos" ? "Recaudado" : "Promedio";
  const labelToday = mode === "ingresos" ? "Hoy" : "Hoy";
  const displayTarget = mode === "ingresos" ? formatCurrency(target, currency) : `${target}%`;
  const displayAchieved = mode === "ingresos" ? formatCurrency(achieved, currency) : `${achieved}%`;
  const displayToday = mode === "ingresos" ? formatCurrency(today ?? 0, currency) : `${today ?? 0}%`;

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="px-5 pt-5 bg-white shadow-default rounded-2xl pb-6 dark:bg-gray-900 sm:px-6 sm:pt-6">
        {/* Header */}
        <div className="flex justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h3>
            <p className="mt-1 font-normal text-gray-500 text-theme-sm dark:text-gray-400">{subtitle}</p>
          </div>

          <div className="relative inline-block">
            <button onClick={toggleDropdown} className="dropdown-toggle" aria-haspopup="menu" aria-expanded={isOpen}>
              <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
            </button>
            <Dropdown isOpen={isOpen} onClose={closeDropdown} className="w-48 p-2">
              <DropdownItem
                onItemClick={closeDropdown}
                className="flex w-full font-normal text-left text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
              >
                Ver detalles
              </DropdownItem>
              <DropdownItem
                onItemClick={closeDropdown}
                className="flex w-full font-normal text-left text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
              >
                Ajustar objetivo
              </DropdownItem>
              <DropdownItem
                onItemClick={closeDropdown}
                className="flex w-full font-normal text-left text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
              >
                Descargar CSV
              </DropdownItem>
            </Dropdown>
          </div>
        </div>

        {/* Radial + badge delta */}
        <div className="relative">
          <div className="max-h-[330px]">
            <ReactApexChart options={options} series={series} type="radialBar" height={330} />
          </div>

          <span
            className={`absolute left-1/2 top-full -translate-x-1/2 -translate-y-[95%] rounded-full px-3 py-1 text-xs font-medium ${deltaStyle.bg} ${deltaStyle.text}`}
          >
            {deltaPct > 0 ? `+${deltaPct}%` : `${deltaPct}%`}
          </span>
        </div>

        {/* Mensaje motivacional / insight */}
        <p className="mx-auto mt-6 w-full max-w-[420px] text-center text-sm text-gray-500 sm:text-base">
          {mode === "ingresos"
            ? `Llevas ${displayAchieved} este mes (${percent}%). ¡Sigamos así para alcanzar ${displayTarget}!`
            : `Ocupación promedio del mes: ${displayAchieved}. Objetivo: ${displayTarget}.`}
        </p>
      </div>

      {/* Resumen inferior */}
      <div className="flex items-center justify-center gap-5 px-6 py-3.5 sm:gap-8 sm:py-5">
        <div>
          <p className="mb-1 text-center text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">Objetivo</p>
          <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
            {displayTarget}
            {/* Flecha decorativa opcional */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M7.26816 13.6632C7.4056 13.8192 7.60686 13.9176 7.8311 13.9176C7.83148 13.9176 7.83187 13.9176 7.83226 13.9176C8.02445 13.9178 8.21671 13.8447 8.36339 13.6981L12.3635 9.70076C12.6565 9.40797 12.6567 8.9331 12.3639 8.6401C12.0711 8.34711 11.5962 8.34694 11.3032 8.63973L8.5811 11.36L8.5811 2.5C8.5811 2.08579 8.24531 1.75 7.8311 1.75C7.41688 1.75 7.0811 2.08579 7.0811 2.5L7.0811 11.3556L4.36354 8.63975C4.07055 8.34695 3.59568 8.3471 3.30288 8.64009C3.01008 8.93307 3.01023 9.40794 3.30321 9.70075L7.26816 13.6632Z"
                fill="#6b7280"
              />
            </svg>
          </p>
        </div>

        <div className="w-px bg-gray-200 h-7 dark:bg-gray-800" />

        <div>
          <p className="mb-1 text-center text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">{labelAchieved}</p>
          <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
            {displayAchieved}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M7.60141 2.33683C7.73885 2.18084 7.9401 2.08243 8.16435 2.08243C8.16475 2.08243 8.16516 2.08243 8.16556 2.08243C8.35773 2.08219 8.54998 2.15535 8.69664 2.30191L12.6968 6.29924C12.9898 6.59203 12.9899 7.0669 12.6971 7.3599C12.4044 7.6529 11.9295 7.65306 11.6365 7.36027L8.91435 4.64004L8.91435 13.5C8.91435 13.9142 8.57856 14.25 8.16435 14.25C7.75013 14.25 7.41435 13.9142 7.41435 13.5L7.41435 4.64442L4.69679 7.36025C4.4038 7.65305 3.92893 7.6529 3.63613 7.35992C3.34333 7.06693 3.34348 6.59206 3.63646 6.29926L7.60141 2.33683Z"
                fill="#039855"
              />
            </svg>
          </p>
        </div>

        <div className="w-px bg-gray-200 h-7 dark:bg-gray-800" />

        <div>
          <p className="mb-1 text-center text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">{labelToday}</p>
          <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
            {displayToday}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M7.60141 2.33683C7.73885 2.18084 7.9401 2.08243 8.16435 2.08243C8.16475 2.08243 8.16516 2.08243 8.16556 2.08243C8.35773 2.08219 8.54998 2.15535 8.69664 2.30191L12.6968 6.29924C12.9898 6.59203 12.9899 7.0669 12.6971 7.3599C12.4044 7.6529 11.9295 7.65306 11.6365 7.36027L8.91435 4.64004L8.91435 13.5C8.91435 13.9142 8.57856 14.25 8.16435 14.25C7.75013 14.25 7.41435 13.9142 7.41435 13.5L7.41435 4.64442L4.69679 7.36025C4.4038 7.65305 3.92893 7.6529 3.63613 7.35992C3.34333 7.06693 3.34348 6.59206 3.63646 6.29926L7.60141 2.33683Z"
                fill="#039855"
              />
            </svg>
          </p>
        </div>
      </div>
    </div>
  );
}
