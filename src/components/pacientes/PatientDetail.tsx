"use client"

import { useState } from "react"
import type { PacienteDetailDTO } from "@/lib/api/pacientes.detail.types"
import PatientHeader from "./detail/PatientHeader"
import TabResumen from "./tabs/TabResumen"
import TabDatos from "./tabs/TabDatos"
import TabPlaceholder from "./tabs/TabPlaceholder"

const TABS = [
  { key: "resumen", label: "Resumen" },
  { key: "datos", label: "Datos personales" },
  { key: "historia", label: "Historia clínica" },
  { key: "planes", label: "Planes de tratamiento" },
  { key: "turnos", label: "Turnos" },
  { key: "facturacion", label: "Facturación" },
  { key: "adjuntos", label: "Adjuntos" },
  { key: "auditoria", label: "Auditoría" },
] as const

export default function PatientDetail({ paciente }: { paciente: PacienteDetailDTO }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("resumen")

  return (
    <section className="space-y-4">
      <PatientHeader paciente={paciente} />

      <nav
        className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1"
        role="tablist"
        aria-label="Secciones del paciente"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            role="tab"
            aria-selected={tab === t.key}
            aria-controls={`panel-${t.key}`}
            className={[
              "min-w-[140px] whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors",
              tab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="rounded-lg border border-border bg-card p-6" role="tabpanel" id={`panel-${tab}`}>
        {tab === "resumen" && <TabResumen paciente={paciente} />}
        {tab === "datos" && <TabDatos paciente={paciente} />}
        {tab === "historia" && (
          <TabPlaceholder
            title="Historia clínica"
            description="Esta sección mostrará el historial médico completo del paciente, incluyendo antecedentes, alergias, medicación y evoluciones."
          />
        )}
        {tab === "planes" && (
          <TabPlaceholder
            title="Planes de tratamiento"
            description="Aquí se visualizarán los planes de tratamiento activos y completados, con odontogramas y seguimiento de progreso."
          />
        )}
        {tab === "turnos" && (
          <TabPlaceholder
            title="Gestión de turnos"
            description="Esta sección permitirá ver el historial completo de citas, agendar nuevos turnos y gestionar cancelaciones."
          />
        )}
        {tab === "facturacion" && (
          <TabPlaceholder
            title="Facturación y pagos"
            description="Aquí se mostrarán las facturas emitidas, pagos recibidos, saldo pendiente y estado de cuenta del paciente."
          />
        )}
        {tab === "adjuntos" && (
          <TabPlaceholder
            title="Documentos adjuntos"
            description="Esta sección contendrá todos los archivos digitalizados del paciente: cédulas, radiografías, estudios y otros documentos."
          />
        )}
        {tab === "auditoria" && (
          <TabPlaceholder
            title="Registro de auditoría"
            description="Aquí se visualizará el historial completo de cambios realizados en el registro del paciente, con fecha, hora y usuario responsable."
          />
        )}
      </div>
    </section>
  )
}
