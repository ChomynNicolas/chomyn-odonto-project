"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { buscarPorTexto, PACIENTES_MOCK } from "./mock";
import Button from "../ui/button/Button";
import Badge from "../ui/badge/Badge";

function Toolbar({
  q,
  setQ,
  resultsCount,
}: {
  q: string;
  setQ: (v: string) => void;
  resultsCount: number;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-lg">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
          {/* ícono buscar */}
          <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M13.78 12.72a6 6 0 1 0-1.06 1.06l3.5 3.5a.75.75 0 1 0 1.06-1.06l-3.5-3.5ZM9 13.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z" clipRule="evenodd"/>
          </svg>
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, documento, RUC o email…"
          aria-label="Buscar pacientes"
          className="pl-9 mr-8  border"
        />
      </div>

      <Link href="/pacientes/nuevo" prefetch={false}>
        <Button className="whitespace-nowrap">Nuevo paciente</Button>
      </Link>
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-8 text-center">
      <svg className="mb-2 h-8 w-8 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v2H4V6Zm16 6H4v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6Z"/>
      </svg>
      <p className="text-sm text-muted-foreground">
        {query ? `No encontramos pacientes para “${query}”.` : "Aún no hay pacientes cargados."}
      </p>
      {!query && (
        <Link href="/pacientes/nuevo">
          <Button variant="outline" className="mt-3">Crear primer paciente</Button>
        </Link>
      )}
    </div>
  );
}

function TableDesktop({ data }: { data: typeof PACIENTES_MOCK }) {
  return (
    <div className="hidden overflow-auto rounded-lg border border-border sm:block">
      <table className="w-full text-sm">
        <caption className="sr-only">Listado de pacientes</caption>
        <thead className="bg-muted/40 sticky top-0 z-10">
          <tr className="text-muted-foreground">
            <th scope="col" className="px-4 py-3 text-left font-medium">Nombre</th>
            <th scope="col" className="px-4 py-3 text-left font-medium">Documento</th>
            <th scope="col" className="px-4 py-3 text-left font-medium">Teléfono</th>
            <th scope="col" className="px-4 py-3 text-left font-medium">Email</th>
            <th scope="col" className="px-4 py-3 text-left font-medium">Obra social</th>
            <th scope="col" className="px-4 py-3 text-left font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {data.map((p) => (
            <tr key={p.id} className="hover:bg-muted/30">
              <td className="px-4 py-3 font-medium text-foreground">{p.nombreCompleto}</td>
              <td className="px-4 py-3">{p.dni}{p.ruc ? ` • RUC ${p.ruc}` : ""}</td>
              <td className="px-4 py-3">{p.telefono ?? "-"}</td>
              <td className="px-4 py-3">{p.email ?? "-"}</td>
              <td className="px-4 py-3">
                {p.obraSocial ? (
                  <Badge >{p.obraSocial}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Link className="text-primary hover:underline" href={`/(dashboard)/pacientes/${p.id}`} prefetch={false} aria-label={`Ver paciente ${p.nombreCompleto}`}>
                    Ver
                  </Link>
                  <button className="text-destructive/80 hover:text-destructive" title="Inactivar (mock)" aria-label={`Inactivar paciente ${p.nombreCompleto}`}>
                    Inactivar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListMobile({ data }: { data: typeof PACIENTES_MOCK }) {
  return (
    <ul className="sm:hidden space-y-3">
      {data.map((p) => (
        <li key={p.id} className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-medium">{p.nombreCompleto}</h3>
              <p className="truncate text-xs text-muted-foreground">
                {p.dni}{p.ruc ? ` • RUC ${p.ruc}` : ""} • {p.telefono ?? "—"}
              </p>
            </div>
            {p.obraSocial ? (
              <Badge  >{p.obraSocial}</Badge>
            ) : null}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="truncate text-xs text-muted-foreground">{p.email ?? "—"}</p>
            <div className="flex items-center gap-3">
              <Link className="text-primary text-sm hover:underline" href={`/pacientes/${p.id}`} prefetch={false}>
                Ver
              </Link>
              <button className="text-destructive/80 text-sm hover:text-destructive">Inactivar</button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function PacientesTable() {
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const [isLoading] = useState(false); // mock
  const [error] = useState<null | string>(null); // mock

  const data = useMemo(
    () => (deferredQ ? buscarPorTexto(deferredQ) : PACIENTES_MOCK),
    [deferredQ]
  );

  return (
    <section className="space-y-4">
      <Toolbar q={q} setQ={setQ} resultsCount={data.length} />

      {/* error */}
      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Ocurrió un error al cargar los pacientes. Intenta nuevamente.
        </div>
      )}

      {/* loading (mock skeleton) */}
      {isLoading && !error && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="h-16 animate-pulse rounded bg-muted" />
            <div className="h-16 animate-pulse rounded bg-muted" />
            <div className="h-16 animate-pulse rounded bg-muted" />
          </div>
        </div>
      )}

      {!isLoading && !error && data.length === 0 && <EmptyState query={q} />}

      {!isLoading && !error && data.length > 0 && (
        <>
          <TableDesktop data={data} />
          <ListMobile data={data} />
        </>
      )}
    </section>
  );
}
