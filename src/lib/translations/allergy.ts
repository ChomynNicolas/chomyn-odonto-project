export const ALLERGY_SEVERITY_TRANSLATIONS: Record<string, string> = {
    MILD: "Leve",
    MODERATE: "Moderada",
    SEVERE: "Severa",
  } as const;
  
  export const getAllergySevertiyLabel = (severity: string): string => {
    return ALLERGY_SEVERITY_TRANSLATIONS[severity] || severity;
  };
  