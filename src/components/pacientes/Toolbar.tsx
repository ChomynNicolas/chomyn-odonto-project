// Toolbar.tsx
"use client";

import Link from "next/link";
import Button from "../ui/button/Button";
import StatusChips from "./StatusChips";
import ResultsCount from "./ResultsCount";

type Props = {
  q: string;
  setQ: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  resultCount: number;
  onOpenQuick: () => void;
};

export default function Toolbar({ q, setQ, status, setStatus, resultCount, onOpenQuick }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-md">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M13.78 12.72a6 6 0 1 0-1.06 1.06l3.5 3.5a.75.75 0 1 0 1.06-1.06l-3.5-3.5ZM9 13.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z" clipRule="evenodd" />
            </svg>
          </span>
          <input
            id="pacientes-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, documento, RUC, contacto…"
            aria-label="Buscar pacientes"
            className="block w-full rounded-md border border-gray-200 bg-white pl-9 pr-9 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-xs"
              aria-label="Borrar búsqueda"
              title="Borrar búsqueda"
            >
              ✕
            </button>
          )}
        </div>
        <div className="sm:ml-3">
          <StatusChips value={status} options={["Todos", "Activos", "Inactivos"]} onChange={setStatus} />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:ml-3 sm:mt-0">
        <button onClick={onOpenQuick} className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
          Alta rápida
        </button>
        <Link href="/pacientes/nuevo" prefetch={false}>
          <Button className="whitespace-nowrap">Nuevo paciente</Button>
        </Link>
      </div>

      <ResultsCount count={resultCount} />
    </div>
  );
}
