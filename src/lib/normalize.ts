// src/lib/normalize.ts
/**
 * Utility functions for normalizing contact data
 */

/**
 * Normalizes email addresses to lowercase
 */


/**
 * Normalizes Paraguayan phone numbers
 * Removes spaces, dashes, and parentheses
 * Ensures +595 country code format
 */


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


export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function normalizePhonePY(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "")

  // Paraguay phone normalization
  // Mobile: 09XX XXX XXX -> +595 9XX XXX XXX
  // Landline: 0XX XXX XXX -> +595 XX XXX XXX

  if (digits.startsWith("595")) {
    return `+${digits}`
  }

  if (digits.startsWith("09") && digits.length === 10) {
    return `+595${digits.substring(1)}`
  }

  if (digits.startsWith("0") && digits.length === 9) {
    return `+595${digits.substring(1)}`
  }

  // Already in international format or unknown
  return digits.startsWith("+") ? phone : `+${digits}`
}

export function formatPhoneForWhatsApp(phone: string): string {
  // Returns E.164 format without + for WhatsApp URL
  const normalized = normalizePhonePY(phone)
  return normalized.replace(/^\+/, "")
}
