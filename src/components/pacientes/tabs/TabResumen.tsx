// src/components/pacientes/tabs/TabResumen.tsx
"use client";

import type { PacienteDetailDTO } from "@/lib/api/pacientes.detail.types";

function fmtFechaHora(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(); // puedes usar Intl más fino si quieres
}

function telefonoPrincipal(p: PacienteDetailDTO) {
  return p.persona.contactos.find(c => c.tipo === "PHONE" && c.activo)?.valorNorm ?? "—";
}

function emailPrincipal(p: PacienteDetailDTO) {
  return p.persona.contactos.find(c => c.tipo === "EMAIL" && c.activo)?.valorNorm ?? "—";
}

export default function TabResumen({ paciente }: { paciente: PacienteDetailDTO }) {
  const kpis = [
    { label: "Próximo turno", value: fmtFechaHora(paciente.kpis.proximoTurno) },
    { label: "Turnos en 90 días", value: String(paciente.kpis.turnos90dias) },
    { label: "Saldo", value: `₲ ${paciente.kpis.saldo.toLocaleString()}` },
    { label: "No show", value: String(paciente.kpis.noShow) },
  ] as const;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg border border-border bg-white p-4 shadow-theme-xs dark:bg-gray-800">
            <div className="text-theme-xs uppercase text-muted-foreground">{k.label}</div>
            <div className="mt-1 text-lg font-semibold">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tarjetas rápidas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-white p-4 dark:bg-gray-800">
          <h4 className="text-sm font-medium text-foreground">Datos esenciales</h4>
          <ul className="mt-3 space-y-1 text-sm">
            <li><b>Teléfono:</b> {telefonoPrincipal(paciente)}</li>
            <li><b>Email:</b> {emailPrincipal(paciente)}</li>
            <li><b>Obra social:</b> —{/* integrar cuando tengas la fuente */}</li>
            <li>
              <b>Preferencias:</b>{" "}
              {/* placeholder hasta que tengas preferencias en BD */}
              —
            </li>
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-white p-4 dark:bg-gray-800">
          <h4 className="text-sm font-medium">Próximos turnos</h4>
          <ol className="mt-3 space-y-2 text-sm">
            {paciente.proximasCitas.length === 0 ? (
              <li className="text-muted-foreground">Sin turnos agendados.</li>
            ) : paciente.proximasCitas.map(c => (
              <li key={c.idCita}>
                {fmtFechaHora(c.inicio)} · {c.tipo} · {c.profesional.nombre}{c.consultorio ? ` · ${c.consultorio.nombre}` : ""}
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-lg border border-border bg-white p-4 dark:bg-gray-800">
          <h4 className="text-sm font-medium">Última actividad</h4>
          <ul className="mt-3 space-y-2 text-sm">
            {paciente.ultimasCitas.length === 0 ? (
              <li className="text-muted-foreground">Sin actividad reciente.</li>
            ) : paciente.ultimasCitas.slice(-2).map(c => (
              <li key={c.idCita}>
                Turno {c.tipo} · {fmtFechaHora(c.inicio)} · {c.estado}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
