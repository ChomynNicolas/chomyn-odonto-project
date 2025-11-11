// GET detalle


// POST crear (agrega defaults requeridos por tu schema)
type CreateReq = {
  pacienteId: number
  profesionalId: number
  consultorioId?: number
  inicio: string // ISO
  fin?: string // opcional si mandás duracionMinutos
  motivo?: string
  tipo?: string // default "CONSULTA"
  duracionMinutos?: number // default 30
  notas?: string
}

export async function apiCreateCita(payload: CreateReq) {
  const duracionMin =
    payload.duracionMinutos ??
    (payload.fin ? Math.max(5, Math.round((+new Date(payload.fin) - +new Date(payload.inicio)) / 60000)) : 30)
  const body = {
    pacienteId: payload.pacienteId,
    profesionalId: payload.profesionalId,
    consultorioId: payload.consultorioId,
    inicio: payload.inicio,
    duracionMinutos: duracionMin,
    tipo: (payload.tipo ?? "CONSULTA") as any,
    motivo: payload.motivo ?? "Cita",
    notas: payload.notas ?? undefined,
  }

  const r = await fetch(`/api/agenda/citas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const j = await r.json().catch(() => null)
  if (!r.ok || !j?.ok) throw new Error(j?.error ?? "Error creando cita")
  return j.data
}




// GET detalle (igual que ya tenías)
export async function apiGetCitaDetalle(id: number) {
  // Usar cache: "no-store" y agregar timestamp para evitar cache del navegador
  const r = await fetch(`/api/agenda/citas/${id}?t=${Date.now()}`, {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  })
  if (!r.ok) throw new Error("No se pudo cargar el detalle de la cita")
  const j = await r.json()
  return j?.data ?? j
}

// POST transición de estado (ahora soporta cancelReason)
export async function apiTransitionCita(
  id: number,
  action: "CONFIRM" | "CHECKIN" | "START" | "COMPLETE" | "CANCEL" | "NO_SHOW",
  note?: string,
  cancelReason?: "PACIENTE" | "PROFESIONAL" | "CLINICA" | "EMERGENCIA" | "OTRO",
) {
  const body: any = { action, note }
  if (action === "CANCEL") body.cancelReason = cancelReason // requerido por /transition

  const r = await fetch(`/api/agenda/citas/${id}/transition`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const j = await r.json().catch(() => null)
  if (!r.ok || !j?.ok) {
    // Preservar el código de error para manejo específico en el frontend
    const error: any = new Error(j?.message ?? j?.error ?? "Error en transición")
    error.code = j?.code
    error.status = r.status
    throw error
  }
  return j.data
}

// PATCH cancelar (endpoint dedicado)
export async function apiCancelCita(
  id: number,
  motivoCancelacion: "PACIENTE" | "PROFESIONAL" | "CLINICA" | "EMERGENCIA" | "OTRO",
  notas?: string,
) {
  const r = await fetch(`/api/agenda/citas/${id}/cancelar`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ motivoCancelacion, notas }),
  })
  const j = await r.json().catch(() => null)
  if (!r.ok || !j?.ok) throw new Error(j?.message ?? j?.error ?? "Error cancelando cita")
  return j.data
}

// PUT reprogramar cita
export async function apiReprogramarCita(
  idCita: number,
  payload: {
    inicio: string // ISO datetime
    duracionMinutos: number
    profesionalId?: number
    consultorioId?: number
    motivo?: string
    notas?: string
  },
) {
  // Convertir a nuevo formato: inicioISO (compatibilidad con backend)
  const body: any = {
    inicioISO: payload.inicio, // Backend espera inicioISO
    duracionMinutos: payload.duracionMinutos,
    profesionalId: payload.profesionalId,
    consultorioId: payload.consultorioId,
    motivo: payload.motivo,
    notas: payload.notas,
  }

  const r = await fetch(`/api/agenda/citas/${idCita}/reprogramar`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  
  const j = await r.json().catch(() => null)
  
  if (!r.ok || !j?.ok) {
    const error: any = new Error(j?.error ?? "Error reprogramando cita")
    error.code = j?.code ?? j?.error
    error.status = r.status
    // Incluir conflictos si están disponibles (409 OVERLAP)
    if (j?.conflicts) {
      error.conflicts = j.conflicts
    }
    error.details = j?.details
    throw error
  }
  
  return j.data
}