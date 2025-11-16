"use client";

import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { MoreDotIcon } from "@/icons";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";

// Carga dinámica del chart
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

/** =========================
 * Tipos y datos mock (MVP)
 * ========================= */
type SeriesPoint = number; // cantidad de turnos por mes
type SeriesData = SeriesPoint[]; // 12 valores (ene..dic)

export type AppointmentsSeries = {
  year: number;
  confirmed: SeriesData; // Confirmados
  cancelled: SeriesData; // Cancelados (con anticipación)
  noShow: SeriesData;    // Ausentismo (no se presentó)
};

const MOCK_SERIES: AppointmentsSeries = {
  year: new Date().getFullYear(),
  confirmed: [120, 140, 135, 150, 160, 170, 165, 155, 148, 172, 181, 190],
  cancelled: [10, 12, 9, 14, 11, 13, 12, 10, 9, 15, 11, 10],
  noShow:    [5, 7, 6, 8, 5, 6, 7, 6, 5, 9, 6, 5],
};

const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

/** =========================
 * Componente principal
 * ========================= */
export default function AppointmentsByMonthChart({
  data = MOCK_SERIES,
  title = "Turnos por mes",
}: {
  data?: AppointmentsSeries;
  title?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Armado de series para Apex
  const series = useMemo(() => {
    return [
      { name: "Confirmados", data: data.confirmed },
      { name: "Cancelados", data: data.cancelled },
      { name: "No-show",    data: data.noShow },
    ];
  }, [data]);

  // Opciones de gráfico (apilado)
  const options: ApexOptions = useMemo(() => {
    return {
      colors: ["#16a34a", "#f59e0b", "#ef4444"], // verde/amarillo/rojo
      chart: {
        fontFamily: "Outfit, sans-serif",
        type: "bar",
        height: 220,
        stacked: true,
        toolbar: { show: false },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "42%",
          borderRadius: 5,
          borderRadiusApplication: "end",
        },
      },
      dataLabels: { enabled: false },
      stroke: { show: true, width: 2, colors: ["transparent"] },
      xaxis: {
        categories: MONTHS_ES,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: { colors: "#6b7280" }, // gray-500
        },
      },
      legend: {
        show: true,
        position: "top",
        horizontalAlign: "left",
        fontFamily: "Outfit, sans-serif",
        labels: { colors: "#374151" }, // gray-700
      },
      yaxis: {
        title: { text: undefined },
      },
      grid: {
        yaxis: { lines: { show: true } },
      },
      fill: { opacity: 1 },
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: (val: number) => `${val} turno${val === 1 ? "" : "s"}`,
        },
        // total por mes en tooltip
        custom: ({ series, dataPointIndex }) => {
          const c = series[0][dataPointIndex] ?? 0;
          const x = series[1][dataPointIndex] ?? 0;
          const n = series[2][dataPointIndex] ?? 0;
          const total = c + x + n;
          const mes = MONTHS_ES[dataPointIndex];
          return `
            <div class="px-3 py-2">
              <div class="text-sm font-semibold mb-1">${mes} ${data.year}</div>
              <div class="text-xs">Confirmados: <strong>${c}</strong></div>
              <div class="text-xs">Cancelados: <strong>${x}</strong></div>
              <div class="text-xs">No-show: <strong>${n}</strong></div>
              <div class="text-xs mt-1">Total: <strong>${total}</strong></div>
            </div>
          `;
        },
      },
      // Responsive mínimo
      responsive: [
        {
          breakpoint: 640,
          options: { chart: { height: 260 }, plotOptions: { bar: { columnWidth: "55%" } } },
        },
      ],
    };
  }, [data.year]);

  function toggleDropdown() { setIsOpen((v) => !v); }
  function closeDropdown() { setIsOpen(false); }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {title} · {data.year}
        </h3>
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
              Descargar CSV
            </DropdownItem>
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full font-normal text-left text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
            >
              Configurar
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      {/* Chart */}
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="-ml-5 min-w-[650px] xl:min-w-full pl-2">
          <ReactApexChart options={options} series={series} type="bar" height={220} />
        </div>
      </div>
    </div>
  );
}
