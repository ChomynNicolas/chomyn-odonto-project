// RowCells.tsx
"use client";

import Link from "next/link";
import { getAge, renderDocumento, renderEmail, renderGenero, renderNombre, renderTelefono } from "../../utils/format";
import type { PacienteItem } from "@/lib/api/pacientes.types";
import { Badge } from "../ui/badge";

export function CellsDesktop({ p }: { p: PacienteItem }) {
  const age = getAge(p.persona.fechaNacimiento);
  return (
    <>
      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{renderNombre(p)}</td>
      <td className="px-4 py-3 whitespace-nowrap">{renderDocumento(p)}</td>
      <td className="px-4 py-3 whitespace-nowrap">{renderTelefono(p)}</td>
      <td className="px-4 py-3 whitespace-nowrap">{renderEmail(p)}</td>
      <td className="px-4 py-3 whitespace-nowrap">{age ?? "—"}</td>
      <td className="px-4 py-3 whitespace-nowrap">{renderGenero(p)}</td>
      <td className="px-4 py-3 whitespace-nowrap">
        <Badge variant={p.estaActivo !== false ? "success" : "destructive"} className="text-xs">
          {p.estaActivo !== false ? "Activo" : "Inactivo"}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Link className="text-primary hover:underline" href={`/pacientes/${p.idPaciente}`} prefetch={false}
                aria-label={`Ver paciente ${renderNombre(p)}`}>
            Ver
          </Link>
          <button className="text-destructive/80 hover:text-destructive" title={p.estaActivo ? "Inactivar" : "Activar"}>
            {p.estaActivo ? "Inactivar" : "Activar"}
          </button>
        </div>
      </td>
    </>
  );
}

export function CardMobile({ p }: { p: PacienteItem }) {
  const age = getAge(p.persona.fechaNacimiento);
  return (
    <li className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium">{renderNombre(p)}</h3>
          <p className="truncate text-xs text-muted-foreground">{renderDocumento(p)} • {renderTelefono(p)}</p>
        </div>
        <Badge variant={p.estaActivo !== false ? "success" : "destructive"} className="text-xs h-fit">
          {p.estaActivo !== false ? "Activo" : "Inactivo"}
        </Badge>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="truncate text-xs text-muted-foreground">
          {renderEmail(p)} • {age ?? "—"} años • {renderGenero(p)}
        </p>
        <div className="flex items-center gap-3">
          <Link className="text-primary text-sm hover:underline" href={`/pacientes/${p.idPaciente}`} prefetch={false}>
            Ver
          </Link>
          <button className="text-destructive/80 text-sm hover:text-destructive">
            {p.estaActivo ? "Inactivar" : "Activar"}
          </button>
        </div>
      </div>
    </li>
  );
}
