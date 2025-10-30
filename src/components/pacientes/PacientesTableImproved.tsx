import React, { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import Button from "../ui/button/Button";
import Badge from "../ui/badge/Badge";
import PatientQuickCreateModal from "./PatientQuickCreateModal";
import Banner from "../ui/Banner";
import PacientesSkeleton from "./PacientesSkeleton";
import { usePacientes } from "@/hooks/usePacientesQuery";
import type { PacienteItem } from "@/lib/api/pacientes.types";

/**
 * This improved version of the patients table demonstrates several UI/UX
 * enhancements based on industry guidelines for healthcare interfaces.  It
 * introduces optional status filtering, an accessible table, and
 * additional patient demographics (age and gender) for quick
 * differentiation.  Filtering is debounced via useDeferredValue and
 * computed via useMemo for performance, as suggested in Refine’s
 * filtering tips【9169834836977†L683-L715】.  A responsive mobile view is
 * maintained, and we continue to leverage existing design tokens from
 * your Tailwind theme.
 */

// Mapping for status filters.  A small enum-like object makes it easy
// to add more filters later (e.g. inactive patients) without
// duplicating logic.  See MDN’s recommendation to separate filter
// definitions from rendering logic【280345231897747†L637-L667】.
const FILTER_STATUS: Record<string, (p: PacienteItem) => boolean> = {
  Todos: () => true,
  Activos: (p) => p.estaActivo !== false,
  Inactivos: (p) => p.estaActivo === false,
};
const FILTER_NAMES = Object.keys(FILTER_STATUS);

/**
 * Compute a patient’s age from their date of birth.  This helper is
 * memoized via useMemo in the table rows to avoid recalculations.
 */
function getAge(birthDate?: string | Date | null): number | null {
  if (!birthDate) return null;
  const b = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  const today = new Date();
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
}

/**
 * Normalize text for case‐insensitive comparisons.  Trims whitespace and
 * converts to lowercase.
 */
function normalizeText(str: string): string {
  return (str || "").toString().trim().toLowerCase();
}

/**
 * Determine whether a patient record matches the current query.  We
 * search across name, document number, RUC, phone and email fields.  This
 * logic can be extended with additional fields such as insurance or
 * medical record number.  Using a dedicated function makes the list
 * filtering logic easy to maintain.
 */
function matchesQuery(p: PacienteItem, query: string): boolean {
  const q = normalizeText(query);
  if (!q) return true;
  const fullName = `${p.persona.nombres || ""} ${p.persona.apellidos || ""}`.toLowerCase();
  const documento = p.persona.documento?.numero?.toLowerCase() || "";
  const ruc = p.persona.documento?.ruc?.toLowerCase() || "";
  const phone =
    p.persona.contactos.find((c) => c.tipo === "PHONE" && c.activo !== false)?.valorNorm?.toLowerCase() || "";
  const email =
    p.persona.contactos.find((c) => c.tipo === "EMAIL" && c.activo !== false)?.valorNorm?.toLowerCase() || "";
  return [fullName, documento, ruc, phone, email].some((val) => val.includes(q));
}

/**
 * Render the patient’s full name or an em dash when unavailable.
 */
function renderNombre(p: PacienteItem): string {
  const nom = [p.persona.nombres, p.persona.apellidos].filter(Boolean).join(" ").trim();
  return nom || "—";
}

function renderDocumento(p: PacienteItem): string {
  const doc = p.persona.documento;
  if (!doc) return "—";
  return `${doc.numero}${doc.ruc ? ` • RUC ${doc.ruc}` : ""}`;
}

function renderTelefono(p: PacienteItem): string {
  const phone = p.persona.contactos.find((c) => c.tipo === "PHONE" && c.activo !== false);
  return phone?.valorNorm || "—";
}

function renderEmail(p: PacienteItem): string {
  const mail = p.persona.contactos.find((c) => c.tipo === "EMAIL" && c.activo !== false);
  return mail?.valorNorm || "—";
}

function renderGenero(p: PacienteItem): string {
  const genero = p.persona.genero;
  switch (genero) {
    case "MASCULINO":
      return "Masculino";
    case "FEMENINO":
      return "Femenino";
    case "OTRO":
      return "Otro";
    case "NO_ESPECIFICADO":
      return "N/E";
    default:
      return "—";
  }
}

/**
 * Toolbar component containing search and quick filter buttons.  Uses
 * accessible semantics and ensures search input is labelled.  The active
 * filter is visually indicated using conditional styling.
 */
function Toolbar({
  q,
  setQ,
  activeFilter,
  setActiveFilter,
  onOpenQuick,
  resultCount,
}: {
  q: string;
  setQ: (v: string) => void;
  activeFilter: string;
  setActiveFilter: (f: string) => void;
  onOpenQuick: () => void;
  resultCount: number;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      {/* Search and filters group */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-md">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            {/* Magnifying glass icon reused from original component */}
            <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                d="M13.78 12.72a6 6 0 1 0-1.06 1.06l3.5 3.5a.75.75 0 1 0 1.06-1.06l-3.5-3.5ZM9 13.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, documento, RUC, contacto…"
            aria-label="Buscar pacientes"
            className="block w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
          />
        </div>
        {/* Status filter buttons */}
        <div className="flex flex-wrap gap-1 sm:ml-3">
          {FILTER_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setActiveFilter(name)}
              className={
                `rounded-md px-3 py-1.5 text-sm font-medium border ` +
                (activeFilter === name
                  ? "bg-brand-50 text-brand-600 dark:bg-brand-500/[0.15] dark:text-brand-400 border-brand-200"
                  : "bg-transparent text-gray-600 dark:text-gray-300 border-gray-200 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800")
              }
              aria-pressed={activeFilter === name}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      {/* Actions group */}
      <div className="flex gap-2 sm:ml-3 sm:mt-0">
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
      {/* Result count for accessibility */}
      {typeof resultCount === "number" && (
        <p className="text-xs text-muted-foreground mt-1 sm:mt-0 sm:ml-2" aria-live="polite">
          {resultCount === 0
            ? "Sin resultados"
            : resultCount === 1
              ? "1 resultado"
              : `${resultCount} resultados`}
        </p>
      )}
    </div>
  );
}

/**
 * Desktop table view.  Adds columns for age and gender, and uses badges to
 * indicate active/inactive status.  For accessibility, the header row uses
 * <th> elements and the table includes a caption per WAI guidelines【81087775315430†L93-L102】.
 */
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
            <th scope="col" className="px-4 py-3 text-left font-medium">Edad</th>
            <th scope="col" className="px-4 py-3 text-left font-medium">Género</th>
            <th scope="col" className="px-4 py-3 text-left font-medium">Estado</th>
            <th scope="col" className="px-4 py-3 text-left font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {data.map((p) => {
            const age = useMemo(() => getAge(p.persona.fechaNacimiento), [p.persona.fechaNacimiento]);
            return (
              <tr key={p.idPaciente} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{renderNombre(p)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{renderDocumento(p)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{renderTelefono(p)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{renderEmail(p)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{age ?? "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap">{renderGenero(p)}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge
                    variant={p.estaActivo !== false ? "success" : "destructive"}
                    className="text-xs"
                  >
                    {p.estaActivo !== false ? "Activo" : "Inactivo"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Link
                      className="text-primary hover:underline"
                      href={`/pacientes/${p.idPaciente}`}
                      prefetch={false}
                      aria-label={`Ver paciente ${renderNombre(p)}`}
                    >
                      Ver
                    </Link>
                    <button className="text-destructive/80 hover:text-destructive" title="Inactivar">
                      {p.estaActivo !== false ? "Inactivar" : "Activar"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Mobile list view.  Displays key details in a card format and reuses
 * the same computed values as the desktop table.  The active/inactive
 * state is shown using a colored Badge.
 */
function ListMobile({ data }: { data: PacienteItem[] }) {
  return (
    <ul className="sm:hidden space-y-3">
      {data.map((p) => {
        const age = getAge(p.persona.fechaNacimiento);
        return (
          <li key={p.idPaciente} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-medium">{renderNombre(p)}</h3>
                <p className="truncate text-xs text-muted-foreground">
                  {renderDocumento(p)} • {renderTelefono(p)}
                </p>
              </div>
              <Badge
                variant={p.estaActivo !== false ? "success" : "destructive"}
                className="text-xs h-fit"
              >
                {p.estaActivo !== false ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="truncate text-xs text-muted-foreground">
                {renderEmail(p)} • {age ?? "—"} años • {renderGenero(p)}
              </p>
              <div className="flex items-center gap-3">
                <Link
                  className="text-primary text-sm hover:underline"
                  href={`/pacientes/${p.idPaciente}`}
                  prefetch={false}
                >
                  Ver
                </Link>
                <button className="text-destructive/80 text-sm hover:text-destructive">
                  {p.estaActivo !== false ? "Inactivar" : "Activar"}
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Main component that composes the toolbar, patient list and pagination.  The
 * filter and query states are debounced and memoized for better
 * performance on large datasets【9169834836977†L683-L715】.  Error and loading
 * states are handled gracefully with skeletons and messages.
 */
export default function PacientesTableImproved() {
  const [q, setQ] = useState("");
  const [openQuick, setOpenQuick] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("Todos");

  // Defer expensive query updates as per Refine’s recommendation【9169834836977†L683-L715】.
  const deferredQ = useDeferredValue(q);

  // Always fetch active and inactive patients; filter client‑side.  You could
  // also integrate the status filter into your API call if supported.
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

  // Feedback banner after creating a patient via quick create
  const handleCreated = (id: string) => setCreatedId(id);

  const showSkeleton = isLoading && !items.length;
  const showEmpty = !isLoading && !isError && items.length === 0;

  // Compute filtered list using memoization for performance.  We first apply
  // the status filter, then the query filter.  This ensures that all user
  // interactions are responsive even with larger datasets【9169834836977†L683-L715】.
  const filteredItems = useMemo(() => {
    const statusFn = FILTER_STATUS[statusFilter] || FILTER_STATUS["Todos"];
    return items.filter((p) => statusFn(p) && matchesQuery(p, deferredQ));
  }, [items, statusFilter, deferredQ]);

  return (
    <section className="space-y-4">
      {createdId && (
        <Banner
          message="Paciente creado correctamente. "
          href={`/pacientes/${createdId}`}
          onClose={() => setCreatedId(null)}
        />
      )}
      <Toolbar
        q={q}
        setQ={setQ}
        activeFilter={statusFilter}
        setActiveFilter={setStatusFilter}
        onOpenQuick={() => setOpenQuick(true)}
        resultCount={filteredItems.length}
      />
      {/* Error state */}
      {isError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          Ocurrió un error al cargar los pacientes.{' '}
          <button onClick={() => refetch()} className="underline underline-offset-2">
            Reintentar
          </button>
          {process.env.NODE_ENV !== 'production' && (
            <span className="ml-2 opacity-70">{(error as any)?.message || 'Error'}</span>
          )}
        </div>
      )}
      {/* Skeleton initial state */}
      {showSkeleton && <PacientesSkeleton />}
      {/* Content */}
      {!isError && !showSkeleton && (
        <>
          {showEmpty ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-8 text-center">
              <svg className="mb-2 h-8 w-8 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v2H4V6Zm16 6H4v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6Z" />
              </svg>
              <p className="text-sm text-muted-foreground">
                {q || statusFilter !== 'Todos' ? `No encontramos pacientes para “${q}”.` : 'Aún no hay pacientes cargados.'}
              </p>
              {!q && statusFilter === 'Todos' && (
                <Link href="/pacientes/nuevo">
                  <Button variant="outline" className="mt-3">
                    Crear primer paciente
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <TableDesktop data={filteredItems} />
              <ListMobile data={filteredItems} />
              {/* Cursor pagination */}
              <div className="flex justify-center">
                {hasMore ? (
                  <Button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="mt-2"
                  >
                    {isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
                  </Button>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {isFetching ? 'Actualizando…' : 'No hay más resultados'}
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}
      {/* Quick create modal */}
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