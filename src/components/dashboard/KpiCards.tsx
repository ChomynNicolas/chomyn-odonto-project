// src/components/dashboard/KpiCards.tsx
"use client"
import type { KpiCitasHoyDTO, KpiTiemposDTO } from "@/app/api/dashboard/kpi/_dto"

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string | number
  hint?: string
  tone?: "ok" | "warn" | "bad"
}) {
  const toneCls =
    tone === "ok"
      ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950"
      : tone === "warn"
        ? "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950"
        : tone === "bad"
          ? "text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950"
          : "text-muted-foreground bg-muted"

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        {hint && <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${toneCls}`}>{hint}</span>}
      </div>
    </div>
  )
}

export default function KpiCards({ kpis, tiempos }: { kpis: KpiCitasHoyDTO; tiempos: KpiTiemposDTO }) {
  return (
    <section className="grid grid-cols-2 md:grid-cols-6 gap-3">
      <Stat label="Citas (hoy)" value={kpis.total} />
      <Stat label="Confirmadas" value={kpis.confirmadas} hint={`${kpis.confirmRate}%`} tone="ok" />
      <Stat label="Canceladas" value={kpis.canceladas} hint={`${kpis.cancelRate}%`} tone="bad" />
      <Stat label="No-show" value={kpis.noShow} hint={`${kpis.noShowRate}%`} tone="bad" />
      <Stat label="Promedio atención" value={tiempos.promedioMin ?? "—"} hint="min" />
      <Stat
        label="Sin confirmación <24h"
        value={kpis.sinConfirmar24h}
        tone={kpis.sinConfirmar24h > 0 ? "warn" : undefined}
      />
    </section>
  )
}
