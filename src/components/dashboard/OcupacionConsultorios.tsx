// src/components/dashboard/OcupacionConsultorios.tsx
"use client";
import type { KpiOcupacionItem } from "@/app/api/dashboard/kpi/_dto";

export default function OcupacionConsultorios({ items }:{ items: KpiOcupacionItem[] }) {
  return (
    <section>
      <h3 className="mb-3 text-lg font-medium text-gray-900">Ocupación por consultorio (hoy)</h3>
      <div className="space-y-3">
        {items.map((it) => {
          const total = Math.max(it.slots, 1);
          const pctOcup = Math.min(100, Math.round((it.ocupadas / total) * 100));
          const pctBloq = Math.min(100, Math.round((it.bloqueos / total) * 100));
          const pctLibre = Math.max(0, 100 - pctOcup - pctBloq);
          return (
            <div key={it.consultorioId}>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span className="font-medium text-gray-900">{it.nombre}</span>
                <span>{pctOcup}% ocup · {pctBloq}% bloq · {pctLibre}% libre</span>
              </div>
              <div className="h-3 w-full rounded bg-gray-100 overflow-hidden flex">
                <div className="h-3" style={{ width: `${pctOcup}%`, backgroundColor: "#3b82f6" }} />
                <div className="h-3" style={{ width: `${pctBloq}%`, backgroundColor: "#f59e0b" }} />
                <div className="h-3" style={{ width: `${pctLibre}%`, backgroundColor: "#10b981" }} />
              </div>
            </div>
          );
        })}
        {items.length === 0 && <p className="text-sm text-gray-500">Sin consultorios activos.</p>}
      </div>
    </section>
  );
}
