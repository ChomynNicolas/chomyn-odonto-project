// src/components/dashboard/AlertasOperativas.tsx
"use client";
import type { AlertaSinConfirmar, AlertaBloqueo, ConflictoAgenda } from "@/app/api/dashboard/kpi/_dto";
import { AlertTriangle, CalendarClock, ShieldAlert, Ban } from "lucide-react";

export default function AlertasOperativas({
  alertas,
  resumen,
}:{
  alertas: { sinConfirmar24h: AlertaSinConfirmar[]; bloqueosActivos: AlertaBloqueo[]; conflictos: ConflictoAgenda[]; };
  resumen: { sinConfirmar24h: number; atrasadas: number; conflictos: number; bloqueos: number };
}) {
  const chips = [
    { label: "Sin confirmación <24h", value: resumen.sinConfirmar24h, tone: "amber" },
    { label: "Atrasadas", value: resumen.atrasadas, tone: "rose" },
    { label: "Conflictos", value: resumen.conflictos, tone: "rose" },
    { label: "Bloqueos", value: resumen.bloqueos, tone: "red" },
  ];
  const toneCls = (tone:"amber"|"rose"|"red") =>
    tone==="amber" ? "bg-amber-50 text-amber-800 border-amber-200"
    : tone==="red" ? "bg-red-50 text-red-800 border-red-200"
    : "bg-rose-50 text-rose-800 border-rose-200";

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium text-gray-900">Alertas operativas</h3>
        <div className="flex gap-2">
          {chips.map(c => (
            <span key={c.label} className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${toneCls(c.tone as any)}`}>
              {c.label}: {c.value}
            </span>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Sin confirmación */}
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-medium text-gray-900">Sin confirmación (&lt;24h)</p>
          </div>
          <ul className="space-y-1">
            {alertas.sinConfirmar24h.map(a => (
              <li key={a.idCita} className="text-sm">
                <span className="text-gray-800">{new Date(a.inicioISO).toLocaleString([], {hour:"2-digit", minute:"2-digit"})}</span>
                {" — "}<span className="text-gray-700">{a.paciente}</span>
                <span className="text-gray-500"> · {a.profesional}</span>
                <a className="ml-2 text-xs text-blue-700 hover:underline" href={`/agenda/citas/${a.idCita}`}>Abrir</a>
              </li>
            ))}
            {alertas.sinConfirmar24h.length === 0 && <p className="text-xs text-gray-500">Sin alertas.</p>}
          </ul>
        </div>

        {/* Atrasadas – las consumimos desde la sección de Agenda inmediata → mostradas con chip arriba */}
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <p className="text-sm font-medium text-gray-900">Atrasadas</p>
          </div>
          <p className="text-xs text-gray-500">Revisar en “Agenda inmediata”.</p>
        </div>

        {/* Conflictos y Bloqueos */}
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <p className="text-sm font-medium text-gray-900">Conflictos / Bloqueos</p>
          </div>
          <ul className="space-y-1">
            {alertas.conflictos.map((c, i) => (
              <li key={`conf-${i}`} className="text-sm text-rose-700">
                {c.recurso} #{c.recursoId} · Cita {c.idCitaA} vs {c.idCitaB} · {c.solapadoMin} min
              </li>
            ))}
            {alertas.conflictos.length === 0 && <li className="text-xs text-gray-500">Sin conflictos.</li>}
            <li className="pt-2 text-sm text-red-700 flex items-center gap-1">
              <Ban className="w-4 h-4" /> Bloqueos activos: {alertas.bloqueosActivos.length}
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
