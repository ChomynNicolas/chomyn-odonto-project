// src/lib/api/agenda/lookup.ts
export type PacienteOption = {
  id: number; label: string; doc: string | null; edad: number | null; contacto: string | null; activo: boolean;
};
export async function apiBuscarPacientes(q: string, limit = 10): Promise<PacienteOption[]> {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  sp.set("limit", String(limit));
  const r = await fetch(`/api/pacientes/options?${sp.toString()}`, { cache: "no-store" });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.ok) throw new Error(j?.error ?? "Error buscando pacientes");
  return j.items as PacienteOption[];
}

export type ProfesionalOption = { id: number; nombre: string };
export async function apiBuscarProfesionales(q = "", limit = 50): Promise<ProfesionalOption[]> {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  sp.set("limit", String(limit));
  const r = await fetch(`/api/profesionales/options?${sp.toString()}`, { cache: "no-store" });
  if (!r.ok) throw new Error("Error buscando profesionales");
  return (await r.json()) as ProfesionalOption[];
}
