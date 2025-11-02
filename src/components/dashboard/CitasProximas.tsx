// src/components/dashboard/CitasProximas.tsx
"use client";
import type { ProximaCitaItem, CitaAtrasadaItem } from "@/app/api/dashboard/kpi/_dto";

function StateBadge({ estado }:{ estado: string }) {
  const cls = {
    SCHEDULED: "bg-gray-100 text-gray-700",
    CONFIRMED: "bg-blue-100 text-blue-700",
    CHECKED_IN: "bg-amber-100 text-amber-800",
    IN_PROGRESS: "bg-purple-100 text-purple-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
    NO_SHOW: "bg-rose-100 text-rose-700",
  }[estado] ?? "bg-gray-100 text-gray-700";
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>{estado}</span>;
}

function LatenessBadge({ minutes }:{ minutes: number }) {
  if (minutes < 5) return null;
  return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-100 text-rose-700">+{minutes}′</span>;
}

export default function CitasProximas({ items, atrasadas }:{ items: ProximaCitaItem[]; atrasadas: CitaAtrasadaItem[]; }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium text-gray-900">Agenda inmediata</h3>
        <a className="text-sm text-blue-700 hover:underline" href="/agenda">Ir a agenda</a>
      </div>

      {/* Atrasadas primero (si existen) */}
      {atrasadas.length > 0 && (
        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
          <p className="text-sm font-medium text-rose-800 mb-2">Citas atrasadas</p>
          <ul className="divide-y divide-rose-100">
            {atrasadas.slice(0, 5).map(a => (
              <li key={a.idCita} className="py-2 flex items-center justify-between">
                <div className="border-l-4 border-rose-500 pl-3">
                  <p className="font-medium text-gray-900">
                    {new Date(a.inicioISO).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})} — {a.paciente}
                  </p>
                  <p className="text-xs text-gray-500">{a.consultorio ?? "Sin consultorio"} · {a.profesional}</p>
                </div>
                <div className="flex items-center gap-2">
                  <LatenessBadge minutes={a.minutosAtraso} />
                  <a className="px-2.5 py-1 rounded-md bg-rose-600 text-white text-xs" href={`/agenda/citas/${a.idCita}`}>Abrir</a>
                </div>
              </li>
            ))}
            {atrasadas.length > 5 && (
              <li className="pt-2 text-xs text-rose-700">+{atrasadas.length-5} más atrasadas…</li>
            )}
          </ul>
        </div>
      )}

      {/* Próximas 10 */}
      <ul className="divide-y divide-gray-100">
        {items.map((c) => (
          <li key={c.idCita} className="py-3 flex items-center justify-between">
            <div className="border-l-4 border-blue-500 pl-3">
              <p className="font-medium text-gray-900">
                {new Date(c.inicioISO).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}
                {" — "}{c.paciente}
              </p>
              <p className="text-xs text-gray-500">{c.consultorio ?? "Sin consultorio"} · {c.profesional}</p>
            </div>
            <div className="flex items-center gap-2">
              <StateBadge estado={c.estado} />
              <a className="px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 text-sm" href={`/agenda/citas/${c.idCita}`}>Abrir</a>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="py-3 text-sm text-gray-500">No hay próximas citas.</li>}
      </ul>
    </section>
  );
}
