// Helper functions for patient data formatting and calculations

import type { AllergySeverity, DiagnosisStatus, ToothCondition } from "@/lib/types/patient"

type GenderUI = "MALE" | "FEMALE" | "OTHER"
type GeneroDB = "MASCULINO" | "FEMENINO" | "OTRO" | "NO_ESPECIFICADO"

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}

/**
 * Format full name
 */
export function formatFullName(firstName: string, lastName: string, secondLastName?: string): string {
  return secondLastName ? `${firstName} ${lastName} ${secondLastName}` : `${firstName} ${lastName}`
}

/**
 * Format gender for display
 */
export function formatGender(gender: GenderUI | GeneroDB): string {
  const map: Record<string, string> = {
    MALE: "Masculino",
    FEMALE: "Femenino",
    OTHER: "Otro",

    MASCULINO: "Masculino",
    FEMENINO: "Femenino",
    OTRO: "Otro",
    NO_ESPECIFICADO: "No especificado",
  }
  return map[gender] ?? String(gender)
}

/**
 * Format phone number (Paraguay format)
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, "")

  // Paraguay mobile: +595 9XX XXX XXX
  if (cleaned.startsWith("595") && cleaned.length === 12) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`
  }

  // Local mobile: 09XX XXX XXX
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`
  }

  return phone
}

/**
 * Get severity badge color
 */
export function getSeverityColor(severity: AllergySeverity): string {
  const colorMap: Record<AllergySeverity, string> = {
    MILD: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    MODERATE: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    SEVERE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  }
  return colorMap[severity]
}

/**
 * Get diagnosis status color
 */
export function getDiagnosisStatusColor(status: DiagnosisStatus): string {
  const colorMap: Record<DiagnosisStatus, string> = {
    ACTIVE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    RESOLVED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    CHRONIC: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    MONITORING: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  }
  return colorMap[status]
}

/**
 * Get tooth condition color
 */
export function getToothConditionColor(condition: ToothCondition): string {
  const colorMap: Record<ToothCondition, string> = {
    INTACT: "bg-green-500",
    CARIES: "bg-red-500",
    FILLED: "bg-blue-500",
    CROWN: "bg-yellow-500",
    MISSING: "bg-gray-300",
    IMPLANT: "bg-purple-500",
    ROOT_CANAL: "bg-orange-500",
    FRACTURED: "bg-red-700",
  }
  return colorMap[condition]
}

/**
 * Format date for display
 */
export function formatDate(date: string, includeTime = false): string {
  const d = new Date(date)
  const dateStr = d.toLocaleDateString("es-PY", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  if (includeTime) {
    const timeStr = d.toLocaleTimeString("es-PY", {
      hour: "2-digit",
      minute: "2-digit",
    })
    return `${dateStr} ${timeStr}`
  }

  return dateStr
}

/**
 * Format relative time (e.g., "hace 2 horas")
 */
export function formatRelativeTime(date: string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)


  
  if (diffMins < 1) return "Ahora"
  if (diffMins < 60) return `Hace ${diffMins} min`
  if (diffHours < 24) return `Hace ${diffHours}h`
  if (diffDays < 7) return `Hace ${diffDays}d`
  

  return formatDate(date)
}

/**
 * Calculate BMI
 */
export function calculateBMI(weight: number, height: number): number {
  // weight in kg, height in cm
  const heightM = height / 100
  return Math.round((weight / (heightM * heightM)) * 10) / 10
}

/**
 * Validate email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate Paraguay phone
 */
export function isValidParaguayPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "")
  // Accept 09XX XXX XXX or +595 9XX XXX XXX
  return /^(0[0-9]{9}|595[0-9]{9})$/.test(cleaned)
}

/**
 * Normalize phone for storage
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "")
}
