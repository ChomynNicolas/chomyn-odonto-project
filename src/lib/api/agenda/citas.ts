// GET detalle
export async function apiGetCitaDetalle(id: number) {
  const r = await fetch(`/api/agenda/citas/${id}`, { cache: "no-store" });
  if (!r.ok) throw new Error("No se pudo cargar el detalle de la cita");
  const j = await r.json();
  return j?.data ?? j;
}

// POST crear (agrega defaults requeridos por tu schema)
type CreateReq = {
  pacienteId: number;
  profesionalId: number;
  consultorioId?: number;
  inicio: string; // ISO
  fin?: string;   // opcional si mandás duracionMinutos
  motivo?: string;
  tipo?: string;             // default "CONSULTA"
  duracionMinutos?: number;  // default 30
  notas?: string;
};

export async function apiCreateCita(payload: CreateReq) {
  const duracionMin = payload.duracionMinutos ?? (
    payload.fin ? Math.max(5, Math.round((+new Date(payload.fin) - +new Date(payload.inicio)) / 60000)) : 30
  );
  const body = {
    pacienteId: payload.pacienteId,
    profesionalId: payload.profesionalId,
    consultorioId: payload.consultorioId,
    inicio: payload.inicio,
    duracionMinutos: duracionMin,
    tipo: (payload.tipo ?? "CONSULTA") as any,
    motivo: payload.motivo ?? "Cita",
    notas: payload.notas ?? undefined,
  };

  const r = await fetch(`/api/agenda/citas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.ok) throw new Error(j?.error ?? "Error creando cita");
  return j.data;
}

// POST transición de estado
export async function apiTransitionCita(id: number, action: "CONFIRM" | "CHECKIN" | "START" | "COMPLETE" | "CANCEL" | "NO_SHOW", note?: string) {
  const r = await fetch(`/api/agenda/citas/${id}/transition`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, note }),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.ok) throw new Error(j?.error ?? "Error en transición");
  return j.data;
}
