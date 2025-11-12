// src/app/api/pacientes/_http.ts
import { NextResponse } from "next/server"
import crypto from "crypto"

/**
 * HTTP utilities for consistent API responses
 */

export type ApiError = {
  ok: false
  code: string
  error: string
  details?: unknown
  timestamp?: string
}

export type ApiSuccess<T = unknown> = {
  ok: true
  data: T
  meta?: unknown
}

/**
 * Success response builder
 */
export function ok<T>(data: T, meta?: unknown, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data, ...(meta && { meta }) } as ApiSuccess<T>, { status })
}

/**
 * Error response builders
 */
export const errors = {
  validation: (message = "Datos inválidos", details?: unknown) =>
    NextResponse.json(
      {
        ok: false,
        code: "VALIDATION_ERROR",
        error: message,
        ...(details && { details }),
        timestamp: new Date().toISOString(),
      } as ApiError,
      { status: 400 },
    ),

  unauthenticated: (message = "No autenticado") =>
    NextResponse.json(
      {
        ok: false,
        code: "UNAUTHENTICATED",
        error: message,
        timestamp: new Date().toISOString(),
      } as ApiError,
      { status: 401 },
    ),

  forbidden: (message = "No autorizado") =>
    NextResponse.json(
      {
        ok: false,
        code: "FORBIDDEN",
        error: message,
        timestamp: new Date().toISOString(),
      } as ApiError,
      { status: 403 },
    ),

  notFound: (message = "Recurso no encontrado") =>
    NextResponse.json(
      {
        ok: false,
        code: "NOT_FOUND",
        error: message,
        timestamp: new Date().toISOString(),
      } as ApiError,
      { status: 404 },
    ),

  conflict: (message = "Conflicto de recursos", code = "CONFLICT") =>
    NextResponse.json(
      {
        ok: false,
        code,
        error: message,
        timestamp: new Date().toISOString(),
      } as ApiError,
      { status: 409 },
    ),

  optimisticLock: (message = "El recurso fue modificado. Por favor, refresque y vuelva a intentar.") =>
    NextResponse.json(
      {
        ok: false,
        code: "OPTIMISTIC_LOCK_FAILED",
        error: message,
        timestamp: new Date().toISOString(),
      } as ApiError,
      { status: 409 },
    ),

  domainRule: (message: string, code = "DOMAIN_RULE_VIOLATION") =>
    NextResponse.json(
      {
        ok: false,
        code,
        error: message,
        timestamp: new Date().toISOString(),
      } as ApiError,
      { status: 422 },
    ),

  rateLimit: (message = "Demasiadas solicitudes. Intente más tarde.") =>
    NextResponse.json(
      {
        ok: false,
        code: "RATE_LIMIT_EXCEEDED",
        error: message,
        timestamp: new Date().toISOString(),
      } as ApiError,
      { status: 429 },
    ),

  internal: (message = "Error interno del servidor", details?: unknown) =>
    NextResponse.json(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        error: message,
        ...(process.env.NODE_ENV !== "production" && details && { details }),
        timestamp: new Date().toISOString(),
      } as ApiError,
      { status: 500 },
    ),

  db: (message = "Error de base de datos") =>
    NextResponse.json(
      {
        ok: false,
        code: "DATABASE_ERROR",
        error: message,
        timestamp: new Date().toISOString(),
      } as ApiError,
      { status: 500 },
    ),

  fk: (message = "No se puede eliminar por restricciones de integridad") =>
    NextResponse.json(
      {
        ok: false,
        code: "FOREIGN_KEY_CONSTRAINT",
        error: message,
        timestamp: new Date().toISOString(),
      } as ApiError,
      { status: 409 },
    ),

  apiError: (status: number, code: string, message: string, details?: unknown) =>
    NextResponse.json(
      {
        ok: false,
        code,
        error: message,
        ...(details && { details }),
        timestamp: new Date().toISOString(),
      } as ApiError,
      { status },
    ),
}

/**
 * ETag generation and validation
 */
export function generateETag(data: unknown): string {
  const hash = crypto.createHash("md5").update(JSON.stringify(data)).digest("hex")
  return `"${hash}"`
}

export function checkETag(requestETag: string | null, currentETag: string): boolean {
  if (!requestETag) return false
  // Handle weak ETags
  const cleanRequestETag = requestETag.replace(/^W\//, "")
  const cleanCurrentETag = currentETag.replace(/^W\//, "")
  return cleanRequestETag === cleanCurrentETag
}

/**
 * Pagination helpers
 */
export type PaginationParams = {
  page?: number
  pageSize?: number
  cursor?: string
  limit?: number
}

export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const page = Number.parseInt(searchParams.get("page") ?? "1")
  const pageSize = Math.min(Number.parseInt(searchParams.get("pageSize") ?? "20"), 100)
  const cursor = searchParams.get("cursor") ?? undefined
  const limit = Math.min(Number.parseInt(searchParams.get("limit") ?? "20"), 100)

  return {
    page: isNaN(page) ? 1 : Math.max(1, page),
    pageSize: isNaN(pageSize) ? 20 : pageSize,
    cursor,
    limit: isNaN(limit) ? 20 : limit,
  }
}

/**
 * Simple in-memory rate limiter (use Redis in production)
 */
type RateLimitEntry = {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

export function checkRateLimit(
  identifier: string,
  maxRequests = 100,
  windowMs = 60000,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const key = `ratelimit:${identifier}`

  // Clean expired entries periodically
  if (Math.random() < 0.01) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) {
        rateLimitStore.delete(k)
      }
    }
  }

  let entry = rateLimitStore.get(key)

  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + windowMs,
    }
    rateLimitStore.set(key, entry)
    return { allowed: true, remaining: maxRequests - 1, resetAt: entry.resetAt }
  }

  entry.count++

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt }
}

/**
 * Safe logging (avoid PHI in logs)
 */
export function safeLog(level: "info" | "error" | "warn", message: string, meta?: Record<string, unknown>) {
  const timestamp = new Date().toISOString()
  const requestId = meta?.requestId ?? "unknown"

  // Filter out sensitive fields
  const safeMeta = meta
    ? Object.fromEntries(
        Object.entries(meta).filter(
          ([key]) =>
            !["password", "passwordHash", "token", "dni", "ruc", "email", "telefono", "valorRaw", "valorNorm"].includes(
              key,
            ),
        ),
      )
    : {}

  const logEntry = {
    timestamp,
    level,
    requestId,
    message,
    ...safeMeta,
  }

  if (level === "error") {
    console.error(JSON.stringify(logEntry))
  } else if (level === "warn") {
    console.warn(JSON.stringify(logEntry))
  } else {
    console.log(JSON.stringify(logEntry))
  }
}
