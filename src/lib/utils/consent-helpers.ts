import { differenceInYears, addMonths } from "date-fns"
import { EDAD_MAYORIA, VIGENCIA_CONSENTIMIENTO_MESES } from "@/lib/constants/consent"

export function isMinorAt(birthDate: Date | null | undefined, referenceDate: Date = new Date()): boolean | null {
  if (!birthDate) return null
  return differenceInYears(referenceDate, birthDate) < EDAD_MAYORIA
}

export function calculateVigenciaHasta(firmadoEn: Date): Date {
  return addMonths(firmadoEn, VIGENCIA_CONSENTIMIENTO_MESES)
}

export function isConsentimientoVigente(vigenteHasta: Date, referenceDate: Date = new Date()): boolean {
  return vigenteHasta >= referenceDate
}
