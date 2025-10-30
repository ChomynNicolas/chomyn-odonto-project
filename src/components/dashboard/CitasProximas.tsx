// src/components/dashboard/CitasProximas.tsx
"use client";
type Item = {
  idCita: number; inicioISO: string; estado: string;
  paciente: string; profesional: string; consultorio?: string | null;
};

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

function LatenessBadge({ inicioISO }:{ inicioISO: string }) {
  const start = new Date(inicioISO);
  const now = new Date();
  if (now <= start) return null;
  const diffMin = Math.round((+now - +start)/60000);
  if (diffMin < 5) return null;
  return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-100 text-rose-700">+{diffMin}′</span>;
}

export default function CitasProximas({ items }:{ items: Item[] }) {
  return (
    <section>
      <h3 className="mb-3 text-lg font-medium text-gray-900">Próximas citas</h3>
      <ul className="divide-y divide-gray-100">
        {items.map((c) => (
          <li key={c.idCita} className="py-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">
                {new Date(c.inicioISO).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}
                {" — "}{c.paciente}
              </p>
              <p className="text-xs text-gray-500">
                {c.consultorio ?? "Sin consultorio"} · {c.profesional}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <LatenessBadge inicioISO={c.inicioISO} />
              <StateBadge estado={c.estado} />
              <a className="px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800" href={`/agenda/citas/${c.idCita}`}>Abrir</a>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="py-3 text-sm text-gray-500">No hay próximas citas.</li>}
      </ul>
    </section>
  );
}
