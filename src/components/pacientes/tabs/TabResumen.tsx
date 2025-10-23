"use client"

import type { PacienteDetailDTO } from "@/lib/api/pacientes.detail.types"
import { Calendar, Clock, DollarSign, XCircle } from "lucide-react"

function fmtFechaHora(iso?: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  return new Intl.DateTimeFormat("es-PY", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d)
}

function telefonoPrincipal(p: PacienteDetailDTO) {
  return p.persona.contactos.find((c) => c.tipo === "PHONE" && c.activo)?.valorNorm ?? "—"
}

function emailPrincipal(p: PacienteDetailDTO) {
  return p.persona.contactos.find((c) => c.tipo === "EMAIL" && c.activo)?.valorNorm ?? "—"
}

export default function TabResumen({ paciente }: { paciente: PacienteDetailDTO }) {
  const kpis = [
    {
      label: "Próximo turno",
      value: fmtFechaHora(paciente.kpis.proximoTurno),
      icon: Calendar,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Turnos en 90 días",
      value: String(paciente.kpis.turnos90dias),
      icon: Clock,
      color: "text-purple-600 dark:text-purple-400",
    },
    {
      label: "Saldo",
      value: `₲ ${paciente.kpis.saldo.toLocaleString()}`,
      icon: DollarSign,
      color: "text-green-600 dark:text-green-400",
    },
    {
      label: "No show",
      value: String(paciente.kpis.noShow),
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
    },
  ] as const

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg border border-border bg-background p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <k.icon className={`size-4 ${k.color}`} aria-hidden="true" />
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k.label}</div>
            </div>
            <div className="mt-2 text-xl font-semibold">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-background p-4">
          <h4 className="text-sm font-semibold text-foreground">Datos esenciales</h4>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="inline font-medium">Teléfono:</dt>{" "}
              <dd className="inline text-muted-foreground">{telefonoPrincipal(paciente)}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Email:</dt>{" "}
              <dd className="inline text-muted-foreground">{emailPrincipal(paciente)}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Obra social:</dt> <dd className="inline text-muted-foreground">—</dd>
            </div>
            <div>
              <dt className="inline font-medium">Preferencias:</dt> <dd className="inline text-muted-foreground">—</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-border bg-background p-4">
          <h4 className="text-sm font-semibold">Próximos turnos</h4>
          {paciente.proximasCitas.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Sin turnos agendados.</p>
          ) : (
            <ol className="mt-3 space-y-2 text-sm">
              {paciente.proximasCitas.map((c) => (
                <li key={c.idCita} className="text-muted-foreground">
                  <div className="font-medium text-foreground">{fmtFechaHora(c.inicio)}</div>
                  <div className="text-xs">
                    {c.tipo} • {c.profesional.nombre}
                    {c.consultorio && ` • ${c.consultorio.nombre}`}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="rounded-lg border border-border bg-background p-4">
          <h4 className="text-sm font-semibold">Última actividad</h4>
          {paciente.ultimasCitas.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Sin actividad reciente.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {paciente.ultimasCitas
                .slice(-3)
                .reverse()
                .map((c) => (
                  <li key={c.idCita} className="text-muted-foreground">
                    <div className="font-medium text-foreground">
                      {c.tipo} • {fmtFechaHora(c.inicio)}
                    </div>
                    <div className="text-xs">{c.estado}</div>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
