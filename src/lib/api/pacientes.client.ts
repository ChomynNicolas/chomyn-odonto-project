import { zPacientesResponse, type PacientesResponse } from "./pacientes.types";

export type PacientesQueryParams = {
  q?: string;
  limit?: number;
  cursor?: string | null;
  soloActivos?: boolean;
  signal?: AbortSignal;
};

export async function fetchPacientes(params: PacientesQueryParams): Promise<PacientesResponse> {
  const url = new URL("/api/pacientes", typeof window !== "undefined" ? window.location.origin : "http://localhost");
  if (params.q) url.searchParams.set("q", params.q);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (params.cursor) url.searchParams.set("cursor", params.cursor);
  if (typeof params.soloActivos === "boolean") url.searchParams.set("soloActivos", String(params.soloActivos));

  const res = await fetch(url.toString(), { signal: params.signal, headers: { "accept": "application/json" } });
  if (!res.ok) {
    const err: any = new Error("Network error");
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  const parsed = zPacientesResponse.safeParse(json);
  if (!parsed.success) {
    const err: any = new Error("Invalid API response");
    err.status = 500;
    err.zod = parsed.error.format();
    throw err;
  }
  return parsed.data;
}
