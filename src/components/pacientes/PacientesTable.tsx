"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Button from "../ui/button/Button";
import Badge from "../ui/badge/Badge";
import PatientQuickCreateModal from "./PatientQuickCreateModal";
import Banner from "../ui/Banner";
import PacientesSkeleton from "./PacientesSkeleton";
import { usePacientes } from "@/hooks/usePacientesQuery";
import { PacienteItem } from "@/lib/api/pacientes.types";

function Toolbar({
  q, setQ, onOpenQuick,
}: { q: string; setQ: (v: string) => void; onOpenQuick: () => void; }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-lg">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
          <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M13.78 12.72a6 6 0 1 0-1.06 1.06l3.5 3.5a.75.75 0 1 0 1.06-1.06l-3.5-3.5ZM9 13.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z" clipRule="evenodd"/>
          </svg>
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, documento, RUC o contacto…"
          aria-label="Buscar pacientes"
          className="mr-8 block w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={onOpenQuick}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Alta rápida
        </button>
        <Link href="/pacientes/nuevo" prefetch={false}>
          <Button className="whitespace-nowrap">Nuevo paciente</Button>
        </Link>
      </div>
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

function renderNombre(p: PacienteItem) {
  const nom = [p.persona.nombres, p.persona.apellidos].filter(Boolean).join(" ").trim();
  return nom || "—";
}
function renderDocumento(p: PacienteItem) {
  const doc = p.persona.documento;
  if (!doc) return "—";
  return `${doc.numero}${doc.ruc ? ` • RUC ${doc.ruc}` : ""}`;
}
function renderTelefono(p: PacienteItem) {
  const phone = p.persona.contactos.find(c => c.tipo === "PHONE" && c.activo !== false);
  return phone?.valorNorm || "—";
}
function renderEmail(p: PacienteItem) {
  const mail = p.persona.contactos.find(c => c.tipo === "EMAIL" && c.activo !== false);
  return mail?.valorNorm || "—";
}

function TableDesktop({ data }: { data: PacienteItem[] }) {
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
            <tr key={p.idPaciente} className="hover:bg-muted/30">
              <td className="px-4 py-3 font-medium text-foreground">{renderNombre(p)}</td>
              <td className="px-4 py-3">{renderDocumento(p)}</td>
              <td className="px-4 py-3">{renderTelefono(p)}</td>
              <td className="px-4 py-3">{renderEmail(p)}</td>
              <td className="px-4 py-3">
                {/* si tienes obra social en persona/paciente, adapta aquí */}
                <span className="text-muted-foreground">—</span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Link className="text-primary hover:underline"
                        href={`/pacientes/${p.idPaciente}`}
                        prefetch={false}
                        aria-label={`Ver paciente ${renderNombre(p)}`}>
                    Ver
                  </Link>
                  <button className="text-destructive/80 hover:text-destructive" title="Inactivar">
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

function ListMobile({ data }: { data: PacienteItem[] }) {
  return (
    <ul className="sm:hidden space-y-3">
      {data.map((p) => (
        <li key={p.idPaciente} className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-medium">{renderNombre(p)}</h3>
              <p className="truncate text-xs text-muted-foreground">
                {renderDocumento(p)} • {renderTelefono(p)}
              </p>
            </div>
            {/* si luego agregas obraSocial, coloca aquí un <Badge> */}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="truncate text-xs text-muted-foreground">{renderEmail(p)}</p>
            <div className="flex items-center gap-3">
              <Link className="text-primary text-sm hover:underline" href={`/pacientes/${p.idPaciente}`} prefetch={false}>
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
  const [openQuick, setOpenQuick] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  // debounce UI → defer a React Query
  const deferredQ = useDeferredValue(q);

  const soloActivos = true;
  const limit = 20;

  const { items, hasMore, fetchNextPage, isFetchingNextPage, isLoading, isError, error, refetch, isFetching } =
    usePacientes({ q: deferredQ, soloActivos, limit });

  // feedback al crear por modal
  const handleCreated = (id: string) => setCreatedId(id);

  const showSkeleton = isLoading && !items.length;
  const showEmpty = !isLoading && !isError && items.length === 0;

  

  return (
    <section className="space-y-4">
      {createdId && (
        <Banner
          message="Paciente creado correctamente. "
          href={`/pacientes/${createdId}`}
          onClose={() => setCreatedId(null)}
        />
      )}

      <Toolbar q={q} setQ={setQ} onOpenQuick={() => setOpenQuick(true)} />

      {/* Estado de error */}
      {isError && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Ocurrió un error al cargar los pacientes.{" "}
          <button onClick={() => refetch()} className="underline underline-offset-2">
            Reintentar
          </button>
          {process.env.NODE_ENV !== "production" && (
            <span className="ml-2 opacity-70">({(error as any)?.message || "Error"})</span>
          )}
        </div>
      )}

      {/* Skeleton inicial */}
      {showSkeleton && <PacientesSkeleton />}

      {/* Contenido */}
      {!isError && !showSkeleton && (
        <>
          {showEmpty ? (
            <EmptyState query={q} />
          ) : (
            <>
              <TableDesktop data={items} />
              <ListMobile data={items} />

              {/* paginación por cursor */}
              <div className="flex justify-center">
                {hasMore ? (
                  <Button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="mt-2"
                  >
                    {isFetchingNextPage ? "Cargando..." : "Cargar más"}
                  </Button>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {isFetching ? "Actualizando..." : "No hay más resultados"}
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Modal de alta rápida */}
      <PatientQuickCreateModal
    open={openQuick}
    onClose={() => setOpenQuick(false)}
    onCreated={(id) => setCreatedId(id)}
    qForList={deferredQ}
    soloActivos={soloActivos}
    limit={limit}
  />
    </section>
  );
}
