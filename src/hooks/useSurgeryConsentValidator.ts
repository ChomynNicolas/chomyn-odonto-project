import { useState, useEffect } from "react"

interface SurgeryConsentValidationResult {
  isChecking: boolean
  requiresConsent: boolean
  isValid: boolean
  error?: string
  patientIsMinor?: boolean
  responsiblePartyId?: number
}

/**
 * Hook to validate surgery consent requirements based on appointment type
 * This is a simplified validation for the frontend - the backend will do the full validation
 */
export function useSurgeryConsentValidator({
  pacienteId,
  tipo,
  enabled = true,
}: {
  pacienteId?: number
  tipo?: string
  enabled?: boolean
}): SurgeryConsentValidationResult {
  const [result, setResult] = useState<SurgeryConsentValidationResult>({
    isChecking: false,
    requiresConsent: false,
    isValid: true,
  })

  useEffect(() => {
    if (!enabled || !pacienteId || !tipo) {
      setResult({
        isChecking: false,
        requiresConsent: false,
        isValid: true,
      })
      return
    }

    // Check if the appointment type is surgical
    const surgicalTypes = ["EXTRACCION", "URGENCIA"] // URGENCIA might be surgical
    const isSurgical = surgicalTypes.includes(tipo)

    if (!isSurgical) {
      setResult({
        isChecking: false,
        requiresConsent: false,
        isValid: true,
      })
      return
    }

    // For surgical appointments, we need to validate consent
    setResult(prev => ({ ...prev, isChecking: true, requiresConsent: true }))

    // Make API call to validate surgery consent
    fetch(`/api/pacientes/${pacienteId}/surgery-consent-status`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const data = await response.json()
        
        setResult({
          isChecking: false,
          requiresConsent: true,
          isValid: data.isValid || false,
          error: data.isValid ? undefined : (data.errorMessage || "Se requiere consentimiento de cirugía"),
          patientIsMinor: data.patientIsMinor,
          responsiblePartyId: data.responsiblePartyId,
        })
      })
      .catch((error) => {
        console.error("Error validating surgery consent:", error)
        setResult({
          isChecking: false,
          requiresConsent: true,
          isValid: false,
          error: "Error al validar consentimiento de cirugía. Verifique que el paciente tenga un consentimiento vigente.",
        })
      })
  }, [pacienteId, tipo, enabled])

  return result
}

/**
 * Simplified check for surgical appointment types
 * This is used for immediate UI feedback before the API validation
 */
export function isSurgicalAppointmentType(tipo: string): boolean {
  const surgicalTypes = ["EXTRACCION"]
  return surgicalTypes.includes(tipo)
}
