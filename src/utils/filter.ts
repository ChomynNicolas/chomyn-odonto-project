// utils/filter.ts
import type { PacienteItem } from "@/lib/api/pacientes.types";

export const FILTER_STATUS: Record<string, (p: PacienteItem) => boolean> = {
  Todos: () => true,
  Activos: (p) => p.estaActivo !== false,
  Inactivos: (p) => p.estaActivo === false,
};
export const FILTER_NAMES = Object.keys(FILTER_STATUS);

export function normalizeText(str: string): string {
  return (str || "").toString().trim().toLowerCase();
}

export function matchesQuery(p: PacienteItem, query: string): boolean {
  const q = normalizeText(query);
  if (!q) return true;
  const fullName = `${p.persona.nombres || ""} ${p.persona.apellidos || ""}`.toLowerCase();
  const documento = p.persona.documento?.numero?.toLowerCase() || "";
  const ruc = p.persona.documento?.ruc?.toLowerCase() || "";
  const phone = p.persona.contactos
    .find((c) => c.tipo === "PHONE" && c.activo !== false)?.valorNorm?.toLowerCase() || "";
  const email = p.persona.contactos
    .find((c) => c.tipo === "EMAIL" && c.activo !== false)?.valorNorm?.toLowerCase() || "";
  return [fullName, documento, ruc, phone, email].some((val) => val.includes(q));
}
