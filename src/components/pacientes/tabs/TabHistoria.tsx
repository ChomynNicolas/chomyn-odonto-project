// src/components/pacientes/tabs/TabHistoria.tsx
"use client";

import { useParams } from "next/navigation";
import { usePacienteHistoria } from "@/hooks/usePacienteHistoriaQuery";
import { SectionCard, EmptyText, InlineError, SmallSkeleton } from "@/components/pacientes/detail/TabSection";
import type { EvolucionItem } from "@/lib/api/pacientes.detail.types";

export default function TabHistoria() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error, refetch } = usePacienteHistoria(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SectionCard title="Antecedentes">
          <SmallSkeleton lines={3} />
        </SectionCard>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SectionCard title="Alergias"><SmallSkeleton /></SectionCard>
          <SectionCard title="Medicación"><SmallSkeleton /></SectionCard>
        </div>
        <SectionCard title="Evoluciones">
          <SmallSkeleton lines={4} />
        </SectionCard>
      </div>
    );
  }

  if (isError) {
    const errorMessage = error instanceof Error ? error.message : undefined
    return <InlineError message={errorMessage} onRetry={() => refetch()} />;
  }

  if (!data) return <EmptyText />;

  return (
    <div className="space-y-6">
      <SectionCard title="Antecedentes">
        <p className="text-sm text-foreground">{data.antecedentesMedicos || "—"}</p>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SectionCard title="Alergias">
          <p className="text-sm">{data.alergias || "—"}</p>
        </SectionCard>
        <SectionCard title="Medicación">
          <p className="text-sm">{data.medicacion || "—"}</p>
        </SectionCard>
      </div>

      <SectionCard title="Evoluciones">
        {data.evoluciones.length === 0 ? (
          <EmptyText text="Aún no hay evoluciones registradas." />
        ) : (
          <ol className="mt-1 space-y-4">
            {data.evoluciones.map((ev: EvolucionItem) => {
              const fecha = ev.fecha instanceof Date ? ev.fecha : new Date(ev.fecha)
              return (
                <li key={ev.id} className="relative pl-6">
                  <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full bg-brand-500" />
                  <div className="text-sm">
                    <b>{fecha.toLocaleDateString()}</b> · {ev.profesional}
                  </div>
                  <div className="text-sm text-muted-foreground">{ev.nota}</div>
                </li>
              )
            })}
          </ol>
        )}
      </SectionCard>
    </div>
  );
}
