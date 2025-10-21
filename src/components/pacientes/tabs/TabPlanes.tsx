// src/components/pacientes/tabs/TabPlanes.tsx
"use client";

import { useParams } from "next/navigation";
import { usePacientePlanes } from "@/hooks/usePacientePlanesQuery";
import { SectionCard, EmptyText, InlineError, SmallSkeleton } from "@/components/pacientes/detail/TabSection";

export default function TabPlanes() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error, refetch } = usePacientePlanes(id);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <SectionCard key={i} title="Plan">
            <SmallSkeleton lines={2} />
            <div className="mt-3 h-2 w-full animate-pulse rounded bg-muted" />
          </SectionCard>
        ))}
      </div>
    );
  }

  if (isError) {
    return <InlineError message={(error as any)?.message} onRetry={() => refetch()} />;
  }

  if (!data || data.planes.length === 0) {
    return <EmptyText text="Aún no hay planes de tratamiento." />;
  }

  return (
    <div className="space-y-3">
      {data.planes.map(pl => (
        <div key={pl.id} className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">{pl.nombre}</h4>
              <p className="text-xs text-muted-foreground">Estado: {pl.estado}</p>
            </div>
            {pl.tieneOdontograma && (
              <button className="rounded-md bg-brand-50 px-3 py-1.5 text-xs text-brand-700 hover:bg-brand-100">
                Ver odontograma
              </button>
            )}
          </div>
          <div className="mt-3 h-2 w-full rounded bg-gray-100 dark:bg-gray-900">
            <div className="h-2 rounded bg-brand-500" style={{ width: `${pl.progreso}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
