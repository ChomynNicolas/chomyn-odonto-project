// src/components/pacientes/tabs/PatientHeader.tsx
"use client";

import type { PacienteDetailDTO } from "@/lib/api/pacientes.detail.types";

function nombreCompleto(p: PacienteDetailDTO) {
  return [p.persona.nombres, p.persona.apellidos].filter(Boolean).join(" ").trim() || "—";
}
function documento(p: PacienteDetailDTO) {
  if (!p.persona.documento) return "—";
  const { numero, ruc } = p.persona.documento;
  return `${numero}${ruc ? ` · RUC ${ruc}` : ""}`;
}

export default function PatientHeader({ paciente }: { paciente: PacienteDetailDTO }) {
  return (
    <header className="flex items-start justify-between rounded-lg border border-border bg-card p-4">
      <div>
        <h1 className="text-base font-semibold text-foreground">{nombreCompleto(paciente)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{documento(paciente)}</p>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={[
            "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
            paciente.estaActivo
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300",
          ].join(" ")}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {paciente.estaActivo ? "Activo" : "Inactivo"}
        </span>
      </div>
    </header>
  );
}
