// src/lib/normalize.ts
/**
 * Utility functions for normalizing contact data
 */

/**
 * Normalizes email addresses to lowercase
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Normalizes Paraguayan phone numbers
 * Removes spaces, dashes, and parentheses
 * Ensures +595 country code format
 */
export function normalizePhonePY(phone: string): string {
  // Remove all non-digit characters except +
  let normalized = phone.replace(/[^\d+]/g, "")

  // If starts with 0, remove it (local format)
  if (normalized.startsWith("0")) {
    normalized = normalized.substring(1)
  }

  // If doesn't start with +, add +595
  if (!normalized.startsWith("+")) {
    normalized = "+595" + normalized
  }

  // If starts with +595 but has extra 0, remove it
  if (normalized.startsWith("+5950")) {
    normalized = "+595" + normalized.substring(5)
  }

  return normalized
}

/**
 * Splits a full name into nombres and apellidos
 * Simple heuristic: last word is apellido, rest is nombres
 */
export function splitNombreCompleto(nombreCompleto: string): { nombres: string; apellidos: string } {
  const parts = nombreCompleto.trim().split(/\s+/)

  if (parts.length === 1) {
    return { nombres: parts[0], apellidos: "" }
  }

  // Last word is apellido, rest is nombres
  const apellidos = parts[parts.length - 1]
  const nombres = parts.slice(0, -1).join(" ")

  return { nombres, apellidos }
}
