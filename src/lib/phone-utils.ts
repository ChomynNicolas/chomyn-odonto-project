// src/lib/phone-utils.ts
/**
 * Centralized phone number normalization and validation utilities
 * 
 * This module provides a single source of truth for phone number handling
 * across the application, ensuring consistency between:
 * - Full patient creation wizard
 * - Quick-create patient flow
 * - Any future components handling phone numbers
 */

/**
 * Normalizes a phone number to E.164 format (+595XXXXXXXXX)
 * Handles various input formats:
 * - Local format: 09XXXXXXXX or 0XX XXX XXX
 * - International format: +595XXXXXXXXX or 595XXXXXXXXX
 * - With spaces/dashes: +595 XXX XXX XXX
 * 
 * @param phone - Raw phone number input
 * @param defaultCountryCode - Default country code if not present (default: "+595")
 * @returns Normalized phone number in E.164 format, or empty string if invalid
 * 
 * @example
 * normalizePhone("0991234567") => "+595991234567"
 * normalizePhone("+595 991 234 567") => "+595991234567"
 * normalizePhone("0991-234-567") => "+595991234567"
 */
export function normalizePhone(phone: string, defaultCountryCode = "+595"): string {
  if (!phone || typeof phone !== "string") return ""

  // Remove all non-digit characters except +
  const clean = phone.replace(/[^\d+]/g, "")

  // Handle empty input
  if (!clean) return ""

  // If already in international format with +
  if (clean.startsWith("+595")) {
    return clean
  }

  // If starts with 595 (without +)
  if (clean.startsWith("595") && clean.length >= 6) {
    return `+${clean}`
  }

  // Handle local Paraguayan format (starts with 0)
  if (clean.startsWith("0")) {
    // Remove leading 0
    const withoutZero = clean.substring(1)
    // Ensure we have enough digits (7-9 digits after removing 0)
    if (withoutZero.length >= 7 && withoutZero.length <= 9) {
      return `+595${withoutZero}`
    }
  }

  // If no country code detected, add default
  if (!clean.startsWith("+") && !clean.startsWith("595")) {
    // Remove any leading zeros
    const withoutZeros = clean.replace(/^0+/, "")
    if (withoutZeros.length >= 7 && withoutZeros.length <= 9) {
      return `${defaultCountryCode}${withoutZeros}`
    }
  }

  // Fallback: add + if missing
  if (!clean.startsWith("+")) {
    return `+${clean}`
  }

  return clean
}

/**
 * Validates if a phone number is in a valid format
 * 
 * @param phone - Phone number to validate (can be raw or normalized)
 * @param countryCode - Country code to use for validation (default: "+595" for Paraguay)
 * @returns Object with validation result and optional error message
 */
export function validatePhone(phone: string, countryCode = "+595"): { isValid: boolean; error?: string } {
  if (!phone || !phone.trim()) {
    return { isValid: false, error: "El teléfono es requerido" }
  }

  const normalized = normalizePhone(phone, countryCode)

  // Must start with the expected country code
  if (!normalized.startsWith(countryCode)) {
    return { isValid: false, error: `El teléfono debe incluir el código de país (${countryCode})` }
  }

  // For Paraguay: 7-9 digits after country code
  if (countryCode === "+595") {
    const digits = normalized.replace("+595", "")
    if (digits.length < 7 || digits.length > 9) {
      return { isValid: false, error: "El número de teléfono debe tener entre 7 y 9 dígitos" }
    }
    if (!/^\d+$/.test(digits)) {
      return { isValid: false, error: "El teléfono solo puede contener números" }
    }
  } else {
    // For other countries: 7-15 digits after country code (E.164 standard)
    const digits = normalized.replace(/^\+\d{1,3}/, "")
    if (digits.length < 7 || digits.length > 15) {
      return { isValid: false, error: "El número de teléfono debe tener entre 7 y 15 dígitos" }
    }
    if (!/^\d+$/.test(digits)) {
      return { isValid: false, error: "El teléfono solo puede contener números" }
    }
  }

  return { isValid: true }
}

/**
 * Mobile phone prefixes for Paraguay
 * These prefixes indicate a mobile number capable of WhatsApp/SMS
 */
const PARAGUAY_MOBILE_PREFIXES = [
  "961", "971", "972", "973", "974", "975", "976",
  "981", "982", "983", "984", "985", "986",
  "991", "992", "994", "995",
] as const

/**
 * Determines if a phone number is a Paraguayan mobile number
 * Mobile numbers are capable of WhatsApp and SMS
 * 
 * @param phone - Phone number (can be raw or normalized)
 * @returns true if the number is a Paraguayan mobile number
 * 
 * @example
 * isMobilePhone("+595991234567") => true
 * isMobilePhone("0991234567") => true
 * isMobilePhone("+59521234567") => false (landline)
 */
export function isMobilePhone(phone: string): boolean {
  if (!phone) return false

  const normalized = normalizePhone(phone)

  // Must be Paraguayan number
  if (!normalized.startsWith("+595")) {
    return false
  }

  // Extract digits after country code
  const digits = normalized.replace("+595", "")

  // Check if starts with mobile prefix (3 digits)
  if (digits.length >= 3) {
    const prefix = digits.substring(0, 3)
    return (PARAGUAY_MOBILE_PREFIXES as readonly string[]).includes(prefix)
  }

  return false
}

/**
 * Determines if a phone number is valid for WhatsApp
 * Requirements:
 * - Must be a valid phone number
 * - Must be a mobile number (not landline)
 * 
 * @param phone - Phone number to check
 * @returns true if the number can be used for WhatsApp
 */
export function isValidForWhatsApp(phone: string): boolean {
  const validation = validatePhone(phone)
  if (!validation.isValid) {
    return false
  }

  return isMobilePhone(phone)
}

/**
 * Formats a phone number for WhatsApp URL
 * Removes the + sign for use in wa.me links
 * 
 * @param phone - Phone number (can be raw or normalized)
 * @returns Phone number without + for WhatsApp URL
 * 
 * @example
 * formatForWhatsApp("+595991234567") => "595991234567"
 */
export function formatForWhatsApp(phone: string): string {
  const normalized = normalizePhone(phone)
  return normalized.replace(/^\+/, "")
}

/**
 * Formats a phone number for display
 * Converts +595991234567 to (0991) 234-567
 * 
 * @param phone - Phone number to format
 * @returns Formatted phone number for display
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return ""

  const normalized = normalizePhone(phone)
  if (!normalized.startsWith("+595")) {
    return phone // Return original if not Paraguayan
  }

  const digits = normalized.replace("+595", "")

  // Mobile format: (0XXX) XXX-XXX
  if (digits.length === 9 && isMobilePhone(normalized)) {
    return `(0${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  // Landline format: (0XX) XXX-XXX
  if (digits.length >= 6) {
    const areaCode = digits.slice(0, 2)
    const rest = digits.slice(2)
    return `(0${areaCode}) ${rest.slice(0, 3)}-${rest.slice(3)}`
  }

  return phone
}

/**
 * Type definitions for phone utilities
 */
export type PhoneValidationResult = {
  isValid: boolean
  normalized?: string
  isMobile?: boolean
  isValidForWhatsApp?: boolean
  error?: string
}

/**
 * Comprehensive phone validation and analysis
 * Returns all relevant information about a phone number in one call
 * 
 * @param phone - Raw phone number input
 * @returns Complete validation result with normalized value and capabilities
 */
export function analyzePhone(phone: string): PhoneValidationResult {
  if (!phone || !phone.trim()) {
    return {
      isValid: false,
      error: "El teléfono es requerido",
    }
  }

  const normalized = normalizePhone(phone)
  const validation = validatePhone(phone)
  const isMobile = isMobilePhone(phone)
  const isValidForWA = isValidForWhatsApp(phone)

  return {
    isValid: validation.isValid,
    normalized: validation.isValid ? normalized : undefined,
    isMobile,
    isValidForWhatsApp: isValidForWA,
    error: validation.error,
  }
}

