// src/components/pacientes/tabs/TabDatos.tsx
"use client";

import type { PacienteDetailDTO } from "@/lib/api/pacientes.detail.types";

function telefonoPrincipal(p: PacienteDetailDTO) {
  return p.persona.contactos.find(c => c.tipo === "PHONE" && c.activo)?.valorNorm ?? "—";
}
function emailPrincipal(p: PacienteDetailDTO) {
  return p.persona.contactos.find(c => c.tipo === "EMAIL" && c.activo)?.valorNorm ?? "—";
}
function documento(p: PacienteDetailDTO) {
  const d = p.persona.documento;
  if (!d) return "—";
  return `${d.numero}${d.ruc ? " · RUC " + d.ruc : ""}`;
}
function nombreCompleto(p: PacienteDetailDTO) {
  return [p.persona.nombres, p.persona.apellidos].filter(Boolean).join(" ").trim() || "—";
}

const Info = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-border p-3">
    <div className="text-theme-xs text-muted-foreground">{label}</div>
    <div className="text-sm">{value || "—"}</div>
  </div>
);

export default function TabDatos({ paciente }: { paciente: PacienteDetailDTO }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Info label="Nombre completo" value={nombreCompleto(paciente)} />
      <Info label="Género" value={paciente.persona.genero ?? "—"} />
      <Info label="Documento" value={documento(paciente)} />
      <Info label="Teléfono" value={telefonoPrincipal(paciente)} />
      <Info label="Email" value={emailPrincipal(paciente)} />
      <Info label="Domicilio" value={paciente.persona.direccion ?? "—"} />
      <Info label="Obra social / Seguro" value={"—" /* pendiente de modelo */} />
      <Info label="Responsable de pago" value={"—" /* pendiente de modelo */} />

      <div className="md:col-span-2 rounded-lg border border-border p-3">
        <div className="text-theme-xs text-muted-foreground">Preferencias de contacto</div>
        <div className="mt-1 text-sm">—{/* pendiente de modelo */}</div>
      </div>
    </div>
  );
}
