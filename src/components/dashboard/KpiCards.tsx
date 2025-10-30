// src/components/dashboard/KpiCards.tsx
"use client";
import React from "react";
import type { KpiCitasHoyDTO, KpiTiemposDTO } from "@/app/api/dashboard/kpi/_dto";

export default function KpiCards({ kpis, tiempos }:{ kpis: KpiCitasHoyDTO; tiempos: KpiTiemposDTO; }) {
  const cards = [
    { label: "Citas (hoy)", value: kpis.total },
    { label: "Confirmadas", value: kpis.confirmadas },
    { label: "Canceladas", value: kpis.canceladas },
    { label: "No-show", value: kpis.noShow },
    { label: "Promedio atención (min)", value: tiempos.promedioMin ?? "—" },
  ];
  return (
    <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">{c.label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{c.value}</p>
        </div>
      ))}
    </section>
  );
}
