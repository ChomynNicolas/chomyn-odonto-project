// src/lib/utils/age-utils.ts

export interface AgeInfo {
    years: number
    months: number
    category: "INFANT" | "CHILD" | "ADOLESCENT" | "ADULT"
  }
  
  export interface AnamnesisAgeRules {
    canShowWomenSpecific: boolean
    canShowPregnancyQuestions: boolean
    canShowMenstrualQuestions: boolean
    canShowFamilyPlanningQuestions: boolean
    canShowSexualHealthQuestions: boolean
    canShowLactationHistory: boolean
    canShowSuctionHabits: boolean
    requiresGuardianPresence: boolean
    simplifiedLanguage: boolean
    showPediatricQuestions: boolean
  }
  
  /**
   * Calcula la edad en años y meses desde una fecha de nacimiento
   */
  export function calculateAge(birthDate: Date | string | null): AgeInfo | null {
    if (!birthDate) return null
  
    const birth = typeof birthDate === "string" ? new Date(birthDate) : birthDate
    const today = new Date()
  
    let years = today.getFullYear() - birth.getFullYear()
    let months = today.getMonth() - birth.getMonth()
  
    if (months < 0) {
      years--
      months += 12
    }
  
    // Ajuste si el día actual es menor al día de nacimiento
    if (today.getDate() < birth.getDate()) {
      months--
      if (months < 0) {
        years--
        months += 12
      }
    }
  
    let category: AgeInfo["category"]
    if (years < 2) {
      category = "INFANT"
    } else if (years < 12) {
      category = "CHILD"
    } else if (years < 18) {
      category = "ADOLESCENT"
    } else {
      category = "ADULT"
    }
  
    return { years, months, category }
  }
  
  /**
   * Determina qué secciones y preguntas mostrar según edad y género
   */
  export function getAnamnesisRulesByAge(
    ageInfo: AgeInfo | null,
    gender: "MASCULINO" | "FEMENINO" | "OTRO" | "NO_ESPECIFICADO"
  ): AnamnesisAgeRules {
    // Valores por defecto (adultos)
    const defaultRules: AnamnesisAgeRules = {
      canShowWomenSpecific: false,
      canShowPregnancyQuestions: false,
      canShowMenstrualQuestions: false,
      canShowFamilyPlanningQuestions: false,
      canShowSexualHealthQuestions: false,
      canShowLactationHistory: false,
      canShowSuctionHabits: false,
      requiresGuardianPresence: false,
      simplifiedLanguage: false,
      showPediatricQuestions: false,
    }
  
    if (!ageInfo) return defaultRules
  
    const { years, category } = ageInfo
  
    // Reglas para infantes (0-2 años)
    if (category === "INFANT") {
      return {
        ...defaultRules,
        canShowLactationHistory: true,
        canShowSuctionHabits: true,
        requiresGuardianPresence: true,
        simplifiedLanguage: true,
        showPediatricQuestions: true,
      }
    }
  
    // Reglas para niños (2-11 años)
    if (category === "CHILD") {
      return {
        ...defaultRules,
        canShowLactationHistory: true,
        canShowSuctionHabits: true,
        requiresGuardianPresence: true,
        simplifiedLanguage: true,
        showPediatricQuestions: true,
      }
    }
  
    // Reglas para adolescentes (12-17 años)
    if (category === "ADOLESCENT") {
      return {
        ...defaultRules,
        canShowWomenSpecific: gender === "FEMENINO",
        // A partir de 12 años (menarquia promedio), preguntas menstruales
        canShowMenstrualQuestions: gender === "FEMENINO" && years >= 12,
        // A partir de 15 años, preguntas sobre planificación familiar y salud sexual
        canShowFamilyPlanningQuestions: gender === "FEMENINO" && years >= 15,
        canShowSexualHealthQuestions: years >= 15,
        // Preguntas sobre embarazo solo a partir de 15 años
        canShowPregnancyQuestions: gender === "FEMENINO" && years >= 15,
        canShowSuctionHabits: years < 15, // Hasta la adolescencia temprana
        requiresGuardianPresence: true,
        simplifiedLanguage: false,
        showPediatricQuestions: false,
      }
    }
  
    // Reglas para adultos (18+ años)
    return {
      ...defaultRules,
      canShowWomenSpecific: gender === "FEMENINO",
      canShowPregnancyQuestions: gender === "FEMENINO",
      canShowMenstrualQuestions: gender === "FEMENINO",
      canShowFamilyPlanningQuestions: gender === "FEMENINO",
      canShowSexualHealthQuestions: true,
      requiresGuardianPresence: false,
      simplifiedLanguage: false,
      showPediatricQuestions: false,
    }
  }
  
  /**
   * Genera un mensaje contextual sobre las restricciones por edad
   */
  export function getAgeContextMessage(ageInfo: AgeInfo | null): string | null {
    if (!ageInfo) return null
  
    const { years, months, category } = ageInfo
  
    switch (category) {
      case "INFANT":
        return `Paciente infante (${years} año${years !== 1 ? "s" : ""} y ${months} mes${
          months !== 1 ? "es" : ""
        }). Se mostrarán preguntas específicas pediátricas. La información debe ser proporcionada por el tutor o padre.`
      case "CHILD":
        return `Paciente pediátrico (${years} años). Se mostrarán preguntas adaptadas a la edad. La información debe ser proporcionada con ayuda del tutor o padre.`
      case "ADOLESCENT":
        return `Paciente adolescente (${years} años). Las preguntas están adaptadas a su etapa de desarrollo. Se recomienda presencia del tutor.`
      case "ADULT":
        return null // Sin mensaje para adultos
      default:
        return null
    }
  }
  