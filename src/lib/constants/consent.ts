export const EDAD_MAYORIA = 18
export const VIGENCIA_CONSENTIMIENTO_MESES = 12

export const ConsentErrors = {
  MISSING_DOB_FOR_MINOR_CHECK: {
    code: "MISSING_DOB_FOR_MINOR_CHECK",
    message: "No se puede verificar si es menor de edad sin fecha de nacimiento",
  },
  NO_RESPONSIBLE_LINKED: {
    code: "NO_RESPONSIBLE_LINKED",
    message: "El paciente menor de edad no tiene un responsable vinculado",
  },
  CONSENT_REQUIRED_FOR_MINOR: {
    code: "CONSENT_REQUIRED_FOR_MINOR",
    message: "Se requiere consentimiento firmado del responsable para atender a un menor de edad",
  },
} as const
