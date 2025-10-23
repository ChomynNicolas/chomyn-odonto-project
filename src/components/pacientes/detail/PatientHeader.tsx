"use client"

import type { PacienteDetailDTO } from "@/lib/api/pacientes.detail.types"
import { Button } from "@/components/ui/button"
import { Edit, MoreVertical } from "lucide-react"
import Link from "next/link"

function nombreCompleto(p: PacienteDetailDTO) {
  return [p.persona.nombres, p.persona.apellidos].filter(Boolean).join(" ").trim() || "—"
}

function documento(p: PacienteDetailDTO) {
  if (!p.persona.documento) return "—"
  const { tipo, numero, ruc } = p.persona.documento
  const tipoLabel =
    tipo === "CI" ? "CI" : tipo === "DNI" ? "DNI" : tipo === "PASAPORTE" ? "Pasaporte" : tipo === "RUC" ? "RUC" : tipo
  return `${tipoLabel} ${numero}${ruc ? ` • RUC ${ruc}` : ""}`
}

export default function PatientHeader({ paciente }: { paciente: PacienteDetailDTO }) {
  return (
    <header className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="text-lg font-semibold text-foreground">{nombreCompleto(paciente)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{documento(paciente)}</p>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={[
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
            paciente.estaActivo
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300",
          ].join(" ")}
        >
          <span className="size-1.5 rounded-full bg-current" />
          {paciente.estaActivo ? "Activo" : "Inactivo"}
        </span>
        <Button asChild variant="outline" size="sm">
          <Link href={`/pacientes/${paciente.idPaciente}/editar`}>
            <Edit className="size-4" />
            Editar
          </Link>
        </Button>
        <Button variant="ghost" size="icon-sm">
          <MoreVertical className="size-4" />
          <span className="sr-only">Más opciones</span>
        </Button>
      </div>
    </header>
  )
}
