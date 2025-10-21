// src/components/pacientes/tabs/TabTurnos.tsx
"use client";

import { useParams } from "next/navigation";
import { usePacienteTurnos } from "@/hooks/usePacienteTurnosQuery";
import { formatDateTime } from "@/lib/format";

function Table({ title, rows }: { title: string; rows: any[] }) {
  return (
    <div className="rounded-lg border border-border">
      <div className="border-b border-border bg-muted/40 px-4 py-2 text-sm font-medium">{title}</div>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/20">
            <tr className="text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">Fecha</th>
              <th className="px-4 py-2 text-left font-medium">Motivo</th>
              <th className="px-4 py-2 text-left font-medium">Profesional</th>
              <th className="px-4 py-2 text-left font-medium">Duración</th>
              <th className="px-4 py-2 text-left font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-2">{formatDateTime(r.fecha)}</td>
                <td className="px-4 py-2">{r.motivo || r.tipo || "—"}</td>
                <td className="px-4 py-2">{r.profesional}</td>
                <td className="px-4 py-2">{r.duracionMin ? `${r.duracionMin} min` : "—"}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <button className="rounded-md border border-gray-200 px-3 py-1 text-xs hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5">
                      Reprogramar
                    </button>
                    <button className="rounded-md border border-gray-200 px-3 py-1 text-xs hover:bg-gray-50 text-destructive dark:border-gray-800 dark:hover:bg-white/5">
                      Cancelar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="px-4 py-3 text-center text-muted-foreground" colSpan={5}>Sin datos</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-lg border border-border">
      <div className="border-b border-border bg-muted/40 px-4 py-2 text-sm font-medium">Cargando…</div>
      <div className="p-4 space-y-2">
        {[...Array(5)].map((_, i) => <div key={i} className="h-4 w-full animate-pulse rounded bg-muted" />)}
      </div>
    </div>
  );
}

export default function TabTurnos() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error, refetch } = usePacienteTurnos(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <TableSkeleton />
        <TableSkeleton />
        <TableSkeleton />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
        {(error as any)?.message || "Error al cargar turnos."}{" "}
        <button onClick={() => refetch()} className="underline underline-offset-2">Reintentar</button>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-4">
      <Table title="Próximos" rows={data.proximos} />
      <Table title="Pasados" rows={data.pasados} />
      <Table title="No show" rows={data.noShow} />
    </div>
  );
}
