import {
  CitasListApiResponseSchema,
  CitaItemSchema,
  type CreateCitaBody,
  CreateCitaBodySchema,
  type CitaItem,
} from "@/lib/schema/cita.calendar";

type ListParams = {
  start?: string; // ISO
  end?: string;   // ISO
  profesionalId?: number | string;
  consultorioId?: number | string;
  page?: number;
  limit?: number;
};

function buildQuery(params: ListParams) {
  const q = new URLSearchParams();
  // Usa los nombres que el backend espera (ajustado previamente)
  if (params.start) q.set("start", params.start);
  if (params.end) q.set("end", params.end);
  if (params.profesionalId) q.set("profesionalId", String(params.profesionalId));
  if (params.consultorioId) q.set("consultorioId", String(params.consultorioId));
  q.set("page", String(params.page ?? 1));
  q.set("limit", String(params.limit ?? 500));
  return q.toString();
}

export async function apiListCitas(params: ListParams): Promise<{ data: CitaItem[]; meta: any }> {
  const qs = buildQuery(params);
  const res = await fetch(`/api/agenda/citas?${qs}`, {
    credentials: "include",
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("GET /api/agenda/citas error body:", json);
    throw new Error(`GET /api/agenda/citas failed: ${res.status}`);
  }

  // 1) valida contra el shape REAL de la API
  const parsedApi = CitasListApiResponseSchema.safeParse(json);
  if (!parsedApi.success) {
    console.error("API response not matching API schema:", parsedApi.error.format());
    throw new Error("Invalid citas API response");
  }

  // 2) normaliza cada item y valida contra CitaItemSchema (DTO)
  const normalized = parsedApi.data.data.map((c) => {
    const norm = {
      idCita: c.idCita,
      inicio: c.inicio,
      fin: c.fin,
      motivo: c.motivo ?? null,
      estado: c.estado,
      pacienteId: c.paciente.id,
      profesionalId: c.profesional.id,
      consultorioId: c.consultorio?.id ?? null,
      profesionalNombre: c.profesional.nombre,
      pacienteNombre: c.paciente.nombre,
      consultorioNombre: c.consultorio?.nombre,
      consultorioColorHex: c.consultorio?.colorHex,
    };
    const v = CitaItemSchema.parse(norm);
    return v;
  });

  return { data: normalized, meta: parsedApi.data.meta };
}

export async function apiCreateCita(body: CreateCitaBody) {
  const parsed = CreateCitaBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new Error("Invalid create cita body");
  }
  const res = await fetch("/api/agenda/citas", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error ?? `POST /api/agenda/citas failed: ${res.status}`);
  }
  return json;
}
