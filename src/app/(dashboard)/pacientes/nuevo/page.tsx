// src/app/(dashboard)/pacientes/nuevo/page.tsx
"use client";

import { useRouter } from "next/navigation";
import PacienteForm from "@/components/pacientes/PacienteForm";
import type { PacienteFullCreateDTO } from "@/lib/schema/paciente.full";
import { useCreatePacienteFull } from "@/hooks/useCreatePacienteFull";
import { useState } from "react";

export default function PageNuevoPaciente() {
  const router = useRouter();
  const createMutation = useCreatePacienteFull(); // si quieres invalidación precisa, pásale q/soloActivos/limit
  const [apiError, setApiError] = useState<string | null>(null);

  const onSubmit = async (values: any) => {
    setApiError(null);
    // adapta el form model (PacienteForm) ⇒ DTO
    const payload: PacienteFullCreateDTO = {
      nombreCompleto: values.nombreCompleto,
      genero: values.genero === "NO_DECLARA" ? "NO_ESPECIFICADO" : values.genero, // alinear nombres
      dni: values.dni,
      ruc: values.ruc || null,
      telefono: values.telefono,
      email: values.email || undefined, // opcional
      domicilio: values.domicilio,
      obraSocial: values.obraSocial || null,
      antecedentesMedicos: values.antecedentesMedicos || null,
      alergias: values.alergias || null,
      medicacion: values.medicacion || null,
      responsablePago: values.responsablePago || null,
      preferenciasContacto: values.preferenciasContacto,
      adjuntos: values.adjuntos || [],
    };

    try {
      const data = await createMutation.mutateAsync(payload);
      router.push(`/pacientes/${data.idPaciente}`); // directo a ficha
    } catch (e: any) {
      setApiError(e.message || "Error al crear paciente");
    }
  };

  return (
    <main className="p-6 mx-auto max-w-5xl space-y-6">
      {apiError && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {apiError}
        </div>
      )}
      <PacienteForm onSubmit={onSubmit} submitLabel={createMutation.isPending ? "Guardando…" : "Crear paciente"} />
    </main>
  );
}
