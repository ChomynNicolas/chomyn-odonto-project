// src/components/pacientes/tabs/TabFacturacion.tsx
"use client";

import { useParams } from "next/navigation";
import { usePacienteFacturacion } from "@/hooks/usePacienteFacturacionQuery";
import { formatDateTime, formatMoneyPYG } from "@/lib/format";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-white p-4 dark:bg-gray-800">
      <h4 className="text-sm font-medium">{title}</h4>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(3)].map((_, i) => <div key={i} className="h-4 w-full animate-pulse rounded bg-muted" />)}
    </div>
  );
}

export default function TabFacturacion() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error, refetch } = usePacienteFacturacion(id);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Facturas"><ListSkeleton /></Card>
        <Card title="Pagos"><ListSkeleton /></Card>
        <Card title="Deudas"><ListSkeleton /></Card>
      </div>
    );
  }
  if (isError) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
        {(error as any)?.message || "Error al cargar facturación."}{" "}
        <button onClick={() => refetch()} className="underline underline-offset-2">Reintentar</button>
      </div>
    );
  }
  if (!data) return null;

  const { facturas, pagos, deudas, saldo } = data;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-3 text-sm">
        <b>Saldo actual: </b>
        <span className={saldo > 0 ? "text-warning-700" : ""}>{formatMoneyPYG(saldo)}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Facturas">
          {facturas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin facturas.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {facturas.map(f => (
                <li key={f.id} className="flex items-center justify-between">
                  <span>{f.id} · {formatDateTime(f.fecha)}</span>
                  <span>{formatMoneyPYG(f.total)} · {f.estado}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Pagos">
          {pagos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin pagos.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {pagos.map(p => (
                <li key={p.id} className="flex items-center justify-between">
                  <span>{p.id} · {formatDateTime(p.fecha)}</span>
                  <span>{formatMoneyPYG(p.monto)} · {p.medio}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Deudas">
          {deudas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin deudas.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {deudas.map(d => (
                <li key={d.id} className="flex items-center justify-between">
                  <span>{d.id} · {d.concepto}</span>
                  <span className="text-warning-700">{formatMoneyPYG(d.saldo)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
