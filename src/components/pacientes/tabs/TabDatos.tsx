"use client"

import type { PacienteDetailDTO } from "@/lib/api/pacientes.detail.types"

function telefonoPrincipal(p: PacienteDetailDTO) {
  return p.persona.contactos.find((c) => c.tipo === "PHONE" && c.activo)?.valorNorm ?? "—"
}

function emailPrincipal(p: PacienteDetailDTO) {
  return p.persona.contactos.find((c) => c.tipo === "EMAIL" && c.activo)?.valorNorm ?? "—"
}

function documento(p: PacienteDetailDTO) {
  const d = p.persona.documento
  if (!d) return "—"
  const tipoLabel =
    d.tipo === "CI"
      ? "CI"
      : d.tipo === "DNI"
        ? "DNI"
        : d.tipo === "PASAPORTE"
          ? "Pasaporte"
          : d.tipo === "RUC"
            ? "RUC"
            : d.tipo
  return `${tipoLabel} ${d.numero}${d.ruc ? ` • RUC ${d.ruc}` : ""}`
}

function nombreCompleto(p: PacienteDetailDTO) {
  return [p.persona.nombres, p.persona.apellidos].filter(Boolean).join(" ").trim() || "—"
}

function generoLabel(g: string | null) {
  if (!g) return "—"
  if (g === "MASCULINO") return "Masculino"
  if (g === "FEMENINO") return "Femenino"
  if (g === "OTRO") return "Otro"
  if (g === "NO_ESPECIFICADO") return "No especificado"
  return g
}

function fechaNacimiento(p: PacienteDetailDTO) {
  if (!p.persona.fechaNacimiento) return "—"
  const d = new Date(p.persona.fechaNacimiento)
  const edad = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  return `${d.toLocaleDateString("es-PY")} (${edad} años)`
}

const Info = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-border bg-background p-3">
    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="mt-1 text-sm font-medium">{value || "—"}</div>
  </div>
)

export default function TabDatos({ paciente }: { paciente: PacienteDetailDTO }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Info label="Nombre completo" value={nombreCompleto(paciente)} />
      <Info label="Género" value={generoLabel(paciente.persona.genero)} />
      <Info label="Fecha de nacimiento" value={fechaNacimiento(paciente)} />
      <Info label="Documento" value={documento(paciente)} />
      <Info label="Teléfono" value={telefonoPrincipal(paciente)} />
      <Info label="Email" value={emailPrincipal(paciente)} />
      <Info label="Domicilio" value={paciente.persona.direccion ?? "—"} />
      <Info label="Obra social / Seguro" value="—" />

      <div className="rounded-lg border border-border bg-background p-3 md:col-span-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Preferencias de contacto
        </div>
        <div className="mt-1 text-sm">—</div>
      </div>
    </div>
  )
}
