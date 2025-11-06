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


/**
 * Normalization utilities for contact data
 * Ensures consistent formatting for emails and phone numbers
 */



/**
 * Format phone number for display
 * Converts +595XXXXXXXXX to (0XXX) XXX-XXX
 */
export function formatPhonePY(phone: string | null | undefined): string {
  if (!phone) return ""

  const normalized = normalizePhonePY(phone)
  if (!normalized) return phone

  const digits = normalized.replace("+595", "")

  if (digits.length === 9) {
    // Mobile: (0XXX) XXX-XXX
    return `(0${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  } else if (digits.length >= 6) {
    // Landline: (0XX) XXX-XXX or similar
    const areaCode = digits.slice(0, 2)
    const rest = digits.slice(2)
    return `(0${areaCode}) ${rest}`
  }

  return phone
}


export function normalizarTelefono(telefono: string): string {
  let clean = telefono.replace(/[\s\-()]/g, "")

  if (clean.startsWith("0")) {
    clean = clean.substring(1)
  }

  if (!clean.startsWith("+595")) {
    if (!clean.startsWith("595")) {
      clean = "595" + clean
    }
    clean = "+" + clean
  }

  return clean
}

export function normalizarEmail(email: string): string {
  const trimmed = email.trim()
  const [localPart, domain] = trimmed.split("@")
  if (!domain) return trimmed.toLowerCase()
  return `${localPart}@${domain.toLowerCase()}`
}

export function validarTelefonoPY(telefono: string): boolean {
  const normalized = normalizarTelefono(telefono)
  return /^\+595[0-9]{7,9}$/.test(normalized)
}

export function esMovilPY(telefono: string): boolean {
  const normalized = normalizarTelefono(telefono)
  const prefijosMoviles = [
    "961",
    "971",
    "972",
    "973",
    "974",
    "975",
    "976",
    "981",
    "982",
    "983",
    "984",
    "985",
    "986",
    "991",
    "992",
    "994",
    "995",
  ]

  for (const prefijo of prefijosMoviles) {
    if (normalized.startsWith(`+595${prefijo}`)) {
      return true
    }
  }
  return false
}

export function validarDocumento(numero: string, tipo: string): boolean {
  const clean = numero.replace(/[.\-\s]/g, "")

  switch (tipo) {
    case "CI":
    case "DNI":
      return /^[0-9]{6,8}$/.test(clean)

    case "RUC":
      if (!/^[0-9]{2}[0-9]{6}[0-9]$/.test(clean)) {
        return false
      }
      return true

    case "PASAPORTE":
      return /^[A-Z0-9]{6,12}$/i.test(clean)

    default:
      return false
  }
}

export function calcularEdad(fechaNacimiento: Date): number {
  const hoy = new Date()
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear()
  const mes = hoy.getMonth() - fechaNacimiento.getMonth()

  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
    edad--
  }

  return edad
}

