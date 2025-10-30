// index.tsx
"use client";

import { useMemo, useState } from "react";
import EmptyState from "./EmptyState";
import TableDesktop from "./TableDesktop";
import ListMobile from "./ListMobile";

import { usePacientes } from "@/hooks/usePacientesQuery";
import type { PacienteItem } from "@/lib/api/pacientes.types";
import { usePacientesFilters } from "@/hooks/usePacientesFilters";
import { FILTER_STATUS, matchesQuery } from "@/utils/filter";
import Banner from "../ui/Banner";
import PacientesSkeleton from "./PacientesSkeleton";
import PatientQuickCreateModal from "./PatientQuickCreateModal";
import Toolbar from "./Toolbar";

export default function PacientesTable() {
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [openQuick, setOpenQuick] = useState(false);

  const { state, setQ, setStatus, deferredQ } = usePacientesFilters();

  // Traer activos+inactivos y filtrar client-side
  const soloActivos = false;
  const limit = 20;
  const {
    items,
    hasMore,
    fetchNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = usePacientes({ q: deferredQ, soloActivos, limit });

  const filteredItems = useMemo(() => {
    const fn = FILTER_STATUS[state.status] || FILTER_STATUS.Todos;
    return items.filter((p: PacienteItem) => fn(p) && matchesQuery(p, deferredQ));
  }, [items, state.status, deferredQ]);

  const showSkeleton = isLoading && !items.length;
  const showEmpty = !isLoading && !isError && items.length === 0;

  return (
    <section className="space-y-4">
      {createdId && (
        <Banner
          message="Paciente creado correctamente."
          href={`/pacientes/${createdId}`}
          onClose={() => setCreatedId(null)}
        />
      )}

      <Toolbar
        q={state.q}
        setQ={setQ}
        status={state.status}
        setStatus={setStatus}
        resultCount={filteredItems.length}
        onOpenQuick={() => setOpenQuick(true)}
      />

      {isError && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Ocurrió un error al cargar los pacientes.{" "}
          <button onClick={() => refetch()} className="underline underline-offset-2">Reintentar</button>
          {process.env.NODE_ENV !== "production" && (
            <span className="ml-2 opacity-70">{(error as any)?.message || "Error"}</span>
          )}
        </div>
      )}

      {showSkeleton && <PacientesSkeleton />}

      {!isError && !showSkeleton && (
        <>
          {showEmpty ? (
            <EmptyState
              message={state.q || state.status !== "Todos"
                ? `No encontramos pacientes para “${state.q}”.`
                : "Aún no hay pacientes cargados."
              }
              showCta={!state.q && state.status === "Todos"}
            />
          ) : (
            <>
              <TableDesktop data={filteredItems} />
              <ListMobile data={filteredItems} />

              <div className="flex justify-center">
                {hasMore ? (
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="mt-2 rounded-md bg-gray-100 px-4 py-2 text-sm disabled:opacity-60 dark:bg-gray-900"
                  >
                    {isFetchingNextPage ? "Cargando…" : "Cargar más"}
                  </button>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {isFetching ? "Actualizando…" : "No hay más resultados"}
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}

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
