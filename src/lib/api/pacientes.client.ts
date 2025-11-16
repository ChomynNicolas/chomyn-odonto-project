import { zPacientesResponse, type PacientesResponse } from "./pacientes.types";

export type PacientesQueryParams = {
  q?: string;
  limit?: number;
  cursor?: string | null;
  soloActivos?: boolean;
  signal?: AbortSignal;
};

type FetchError = Error & {
  status: number
}

type ValidationError = Error & {
  status: number
  zod: unknown
}

export async function fetchPacientes(params: PacientesQueryParams): Promise<PacientesResponse> {
  const url = new URL("/api/pacientes", typeof window !== "undefined" ? window.location.origin : "http://localhost");
  if (params.q) url.searchParams.set("q", params.q);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (params.cursor) url.searchParams.set("cursor", params.cursor);
  if (typeof params.soloActivos === "boolean") url.searchParams.set("soloActivos", String(params.soloActivos));

  const res = await fetch(url.toString(), { signal: params.signal, headers: { "accept": "application/json" } });
  if (!res.ok) {
    const err: FetchError = new Error("Network error") as FetchError;
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  const parsed = zPacientesResponse.safeParse(json);
  if (!parsed.success) {
    const err: ValidationError = new Error("Invalid API response") as ValidationError;
    err.status = 500;
    err.zod = parsed.error.format();
    throw err;
  }
  return parsed.data;
}
