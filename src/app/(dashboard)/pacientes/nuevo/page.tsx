// src/app/(dashboard)/pacientes/nuevo/page.tsx
"use client"

import { useRouter } from "next/navigation"
import PacienteForm from "@/components/pacientes/PacienteForm"
import type { PacienteFullCreateDTO } from "@/lib/schema/paciente.full"
import { useCreatePacienteFull } from "@/hooks/useCreatePacienteFull"
import { useState } from "react"

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default function PageNuevoPaciente() {
  const router = useRouter()
  const createMutation = useCreatePacienteFull()
  const [apiError, setApiError] = useState<string | null>(null)

  const onSubmit = async (values: any) => {
    setApiError(null)

    const fechaNac =
      values.fechaNacimiento instanceof Date
        ? toYMD(values.fechaNacimiento)
        : values.fechaNacimiento || undefined

    const payload: PacienteFullCreateDTO = {
      nombreCompleto: values.nombreCompleto,
      // Aceptamos NO_DECLARA y lo pasamos tal cual (el schema ya lo permite)
      genero: values.genero,
      tipoDocumento: values.tipoDocumento || "CI",
      dni: values.dni,
      ruc: values.ruc || undefined,
      telefono: values.telefono,
      fechaNacimiento: fechaNac,
      email: values.email || undefined,
      domicilio: values.domicilio || undefined,
      obraSocial: values.obraSocial || undefined,
      antecedentesMedicos: values.antecedentesMedicos || undefined,
      alergias: values.alergias || undefined,
      medicacion: values.medicacion || undefined,
      responsablePago: values.responsablePago || undefined,
      preferenciasContacto: values.preferenciasContacto,
      adjuntos: values.adjuntos || [],
    }

    try {
      const data = await createMutation.mutateAsync(payload)
      // Ajuste: asume que el hook devuelve { idPaciente } plano (ver ruta POST abajo)
      router.push(`/pacientes/${data.idPaciente}`)
    } catch (e: any) {
      setApiError(e.message || "Error al crear paciente")
    }
  }

  return (
    <main className="p-6 mx-auto max-w-5xl space-y-6">
      {apiError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {apiError}
        </div>
      )}
      <PacienteForm onSubmit={onSubmit} submitLabel={createMutation.isPending ? "Guardando…" : "Crear paciente"} />
    </main>
  )
}
