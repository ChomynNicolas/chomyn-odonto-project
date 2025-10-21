// src/components/pacientes/PatientDetail.tsx
"use client";

import { useState } from "react";
import type { PacienteDetailDTO } from "@/lib/api/pacientes.detail.types";
import PatientHeader from "./tabs/PatientHeader";
import TabResumen from "./tabs/TabResumen";
import TabDatos from "./tabs/TabDatos";
import TabHistoria from "./tabs/TabHistoria";
import TabPlanes from "./tabs/TabPlanes";
import TabTurnos from "./tabs/TabTurnos";
import TabFacturacion from "./tabs/TabFacturacion";
import TabAdjuntos from "./tabs/TabAdjuntos";
import TabAuditoria from "./tabs/TabAuditoria";

const TABS = [
  { key: "resumen", label: "Resumen" },
  { key: "datos", label: "Datos personales" },
  { key: "historia", label: "Historia clínica" },
  { key: "planes", label: "Planes de tratamiento" },
  { key: "turnos", label: "Turnos" },
  { key: "facturacion", label: "Facturación" },
  { key: "adjuntos", label: "Adjuntos" },
  { key: "auditoria", label: "Auditoría" },
] as const;

export default function PatientDetail({ paciente }: { paciente: PacienteDetailDTO }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("resumen");

  return (
    <section className="space-y-4">
      <PatientHeader paciente={paciente} />

      <nav className="flex overflow-x-auto rounded-lg border border-border bg-card p-1 custom-scrollbar">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              "min-w-[140px] rounded-md px-4 py-2 text-sm font-medium transition",
              tab === t.key
                ? "bg-white text-gray-900 dark:bg-gray-800 dark:text-white shadow-theme-xs"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400",
            ].join(" ")}
            aria-current={tab === t.key ? "page" : undefined}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
        {tab === "resumen" && <TabResumen paciente={paciente} />}
        {tab === "datos" && <TabDatos paciente={paciente} />}
        {tab === "historia" && <TabHistoria  />}
        {tab === "planes" && <TabPlanes  />}
        {tab === "turnos" && <TabTurnos  />}
        {tab === "facturacion" && <TabFacturacion  />}
        {tab === "adjuntos" && <TabAdjuntos />}
        {tab === "auditoria" && <TabAuditoria paciente={paciente} />}
      </div>
    </section>
  );
}
