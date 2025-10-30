// TableDesktop.tsx
"use client";

import type { PacienteItem } from "@/lib/api/pacientes.types";
import { CellsDesktop } from "./RowCells";

export default function TableDesktop({ data }: { data: PacienteItem[] }) {
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
          {data.map((p) => (
            <tr key={p.idPaciente} className="hover:bg-muted/30">
              <CellsDesktop p={p} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
