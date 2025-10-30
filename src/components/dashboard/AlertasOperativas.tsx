// src/components/dashboard/AlertasOperativas.tsx
"use client";
import React from "react";
import type { AlertaSinConfirmar, AlertaBloqueo, ConflictoAgenda } from "@/app/api/dashboard/kpi/_dto";

export default function AlertasOperativas({ alertas }:{
  alertas: { sinConfirmar24h: AlertaSinConfirmar[]; bloqueosActivos: AlertaBloqueo[]; conflictos: ConflictoAgenda[]; };
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-lg font-medium text-gray-900">Alertas</h3>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Sin confirmación (&lt;24h)</h4>
          <ul className="space-y-1">
            {alertas.sinConfirmar24h.map(a => (
              <li key={a.idCita} className="text-sm text-amber-700">
                {new Date(a.inicioISO).toLocaleString()} — {a.paciente} · {a.profesional} · faltan {a.horasFaltantes}h
              </li>
            ))}
            {alertas.sinConfirmar24h.length === 0 && <p className="text-xs text-gray-500">Sin alertas</p>}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Bloqueos activos (hoy)</h4>
          <ul className="space-y-1">
            {alertas.bloqueosActivos.map(b => (
              <li key={b.idBloqueoAgenda} className="text-sm text-red-700">
                {b.tipo} · {b.consultorio ?? b.profesional ?? ""} ({new Date(b.desdeISO).toLocaleTimeString()}–{new Date(b.hastaISO).toLocaleTimeString()})
              </li>
            ))}
            {alertas.bloqueosActivos.length === 0 && <p className="text-xs text-gray-500">Sin bloqueos</p>}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Conflictos de agenda</h4>
          <ul className="space-y-1">
            {alertas.conflictos.map((c, i) => (
              <li key={i} className="text-sm text-rose-700">
                {c.recurso} #{c.recursoId} · Cita {c.idCitaA} vs {c.idCitaB} · {c.solapadoMin} min
              </li>
            ))}
            {alertas.conflictos.length === 0 && <p className="text-xs text-gray-500">Sin conflictos</p>}
          </ul>
        </div>
      </div>
    </section>
  );
}
