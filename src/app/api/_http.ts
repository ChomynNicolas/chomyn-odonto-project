// src/app/api/_http.ts
import { NextResponse, type NextRequest } from "next/server"

export type ApiSuccess<T> = { ok: true; data: T }
export type ApiError = { ok: false; code: string; error: string }

function withNoStore(res: NextResponse, extra?: Record<string, string>) {
  res.headers.set("Cache-Control", "no-store")
  if (extra) for (const [k, v] of Object.entries(extra)) res.headers.set(k, v)
  return res
}

export function ok<T>(data: T, status = 200, headers?: Record<string, string>) {
  return withNoStore(NextResponse.json<ApiSuccess<T>>({ ok: true, data }, { status }), headers)
}

export function okCreated<T>(data: T, headers?: Record<string, string>) {
  return ok<T>(data, 201, headers)
}

export function okCreatedWithIdempotency<T>(req: NextRequest, data: T) {
  const key = req.headers.get("x-idempotency-key")
  const headers: Record<string, string> = {}
  if (key) headers["X-Idempotency-Key"] = key
  return okCreated<T>(data, headers)
}

export function apiError(status: number, code: string, errorMsg: string, headers?: Record<string, string>) {
  return withNoStore(NextResponse.json<ApiError>({ ok: false, code, error: errorMsg }, { status }), headers)
}

export const errors = {
  validation: (msg = "Datos inválidos") => apiError(400, "VALIDATION_ERROR", msg),
  forbidden: (msg = "No autorizado") => apiError(403, "RBAC_FORBIDDEN", msg),
  conflict: (msg = "Conflicto de unicidad") => apiError(409, "UNIQUE_CONFLICT", msg),
  notFound: (msg = "No encontrado") => apiError(404, "NOT_FOUND", msg),
  fk: (msg = "Restricción de integridad") => apiError(409, "FK_CONSTRAINT", msg),
  db: (msg = "Error de base de datos") => apiError(400, "DB_ERROR", msg),
  internal: (msg = "Error inesperado") => apiError(500, "INTERNAL_ERROR", msg),
}
