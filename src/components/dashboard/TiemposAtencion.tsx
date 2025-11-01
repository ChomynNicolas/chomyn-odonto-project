// src/components/dashboard/TiemposAtencion.tsx
"use client";
import React from "react";
import type { KpiTiemposDTO, ColaDTO } from "@/app/api/dashboard/kpi/_dto";

export default function TiemposAtencion({ tiempos, colas }:{ tiempos: KpiTiemposDTO; colas: ColaDTO }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-lg font-medium text-gray-900">Atención</h3>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-gray-500">Atenciones con tiempo</p>
          <p className="text-2xl font-semibold">{tiempos.atencionesHoy}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-gray-500">Promedio (min)</p>
          <p className="text-2xl font-semibold">{tiempos.promedioMin ?? "—"}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">En sala</h4>
          <ul className="space-y-2">
            {colas.checkIn.map((c) => (
              <li key={c.idCita} className="text-sm text-gray-700 flex justify-between">
                <span>{new Date(c.hora).toLocaleTimeString()} — {c.paciente}</span>
                <span className="text-gray-500">{c.consultorio ?? ""}</span>
              </li>
            ))}
            {colas.checkIn.length === 0 && <p className="text-xs text-gray-500">Sin pacientes en sala</p>}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">En atención</h4>
          <ul className="space-y-2">
            {colas.enAtencion.map((c) => (
              <li key={c.idCita} className="text-sm text-gray-700 flex justify-between">
                <span>{new Date(c.hora).toLocaleTimeString()} — {c.paciente}</span>
                <span className="text-gray-500">{c.profesional}</span>
              </li>
            ))}
            {colas.enAtencion.length === 0 && <p className="text-xs text-gray-500">Sin pacientes en atención</p>}
          </ul>
        </div>
      </div>
    </section>
  );
}
