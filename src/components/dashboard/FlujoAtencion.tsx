// src/components/dashboard/FlujoAtencion.tsx  (renombrado desde TiemposAtencion)
"use client";
import type { KpiTiemposDTO, ColaDTO } from "@/app/api/dashboard/kpi/_dto";
import { Clock, Users } from "lucide-react";

function Mini({ label, value }:{ label:string; value:string|number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

export default function FlujoAtencion({ tiempos, colas }:{ tiempos: KpiTiemposDTO; colas: ColaDTO }) {
  return (
    <section>
      <h3 className="mb-3 text-lg font-medium text-gray-900">Flujo de atención</h3>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Mini label="Atenciones con tiempo" value={tiempos.atencionesHoy} />
        <Mini label="Promedio (min)" value={tiempos.promedioMin ?? "—"} />
        <Mini label="Mediana (min)" value={tiempos.medianaMin ?? "—"} />
        <Mini label="En sala / En atención" value={`${colas.checkIn.length} / ${colas.enAtencion.length}`} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">En sala</h4>
          <ul className="space-y-2">
            {colas.checkIn.map((c) => (
              <li key={c.idCita} className="text-sm text-gray-700 flex justify-between">
                <span>{new Date(c.hora).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})} — {c.paciente}</span>
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
                <span>{new Date(c.hora).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})} — {c.paciente}</span>
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
