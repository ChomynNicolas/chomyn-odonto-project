/**
 * Módulo centralizado de mensajes para el sistema de agenda/citas
 * 
 * Proporciona mensajes profesionales, contextuales y consistentes
 * para errores, advertencias y éxitos en operaciones de citas.
 */

export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "OVERLAP"
  | "OUTSIDE_WORKING_HOURS"
  | "NO_WORKING_DAY"
  | "INCOMPATIBLE_SPECIALTY"
  | "PROFESSIONAL_HAS_NO_SPECIALTIES"
  | "CONSULTORIO_INACTIVO"
  | "CONSULTORIO_BLOCKED"
  | "CONSULTORIO_NOT_FOUND"
  | "PROFESIONAL_BLOCKED"
  | "PACIENTE_NOT_FOUND"
  | "PROFESIONAL_NOT_FOUND"
  | "PACIENTE_INACTIVO"
  | "PROFESIONAL_INACTIVO"
  | "NOT_REPROGRAMMABLE"
  | "NOT_CANCELLABLE"
  | "INVALID_DATETIME"
  | "INVALID_TIME_RANGE"
  | "NO_PAST_APPOINTMENTS"
  | "FOREIGN_KEY_CONSTRAINT"
  | "DUPLICATE"
  | "INTERNAL_ERROR"
  | "CONSENT_REQUIRED_FOR_MINOR"
  | "STATE_TERMINAL"
  | "TRANSITION_NOT_ALLOWED"
  | "CONCURRENT_MODIFICATION"

export interface ErrorDetails {
  code: ErrorCode
  title: string
  message: string
  userMessage: string // Mensaje amigable para el usuario
  suggestions?: string[] // Sugerencias para resolver el problema
}

export interface SuccessMessage {
  title: string
  message: string
  duration?: number
}

/**
 * Mensajes de error estructurados y profesionales
 */
export const ERROR_MESSAGES: Record<ErrorCode, ErrorDetails> = {
  BAD_REQUEST: {
    code: "BAD_REQUEST",
    title: "Solicitud inválida",
    message: "Los datos proporcionados no son válidos",
    userMessage: "Por favor, verifique que todos los campos estén completos y sean correctos.",
    suggestions: ["Revise los campos marcados con error", "Asegúrese de que los formatos sean correctos"],
  },
  UNAUTHORIZED: {
    code: "UNAUTHORIZED",
    title: "No autorizado",
    message: "No tiene permisos para realizar esta acción",
    userMessage: "Su sesión ha expirado o no tiene los permisos necesarios.",
    suggestions: ["Inicie sesión nuevamente", "Contacte al administrador si el problema persiste"],
  },
  NOT_FOUND: {
    code: "NOT_FOUND",
    title: "No encontrado",
    message: "El recurso solicitado no existe",
    userMessage: "No se encontró el elemento solicitado. Puede haber sido eliminado o no existir.",
    suggestions: ["Verifique que el ID sea correcto", "Recargue la página"],
  },
  OVERLAP: {
    code: "OVERLAP",
    title: "Conflicto de horario",
    message: "El horario seleccionado se solapa con citas existentes",
    userMessage: "El horario seleccionado ya está ocupado. Por favor, elija otro horario disponible.",
    suggestions: [
      "Seleccione un horario diferente",
      "Use las recomendaciones de horarios disponibles",
      "Verifique el calendario para ver los horarios ocupados",
    ],
  },
  OUTSIDE_WORKING_HOURS: {
    code: "OUTSIDE_WORKING_HOURS",
    title: "Fuera del horario de trabajo",
    message: "El horario seleccionado está fuera del horario de trabajo del profesional",
    userMessage: "El profesional no trabaja en ese horario. Por favor, seleccione un horario dentro de su disponibilidad.",
    suggestions: [
      "Seleccione un horario dentro del horario de trabajo del profesional",
      "Use las recomendaciones de horarios disponibles",
      "Verifique la disponibilidad del profesional",
    ],
  },
  NO_WORKING_DAY: {
    code: "NO_WORKING_DAY",
    title: "Día no laboral",
    message: "El profesional no trabaja en el día seleccionado",
    userMessage: "El profesional no trabaja en ese día. Por favor, seleccione otro día.",
    suggestions: [
      "Seleccione un día en que el profesional trabaje",
      "Verifique la disponibilidad del profesional",
      "Use las recomendaciones de días disponibles",
    ],
  },
  INCOMPATIBLE_SPECIALTY: {
    code: "INCOMPATIBLE_SPECIALTY",
    title: "Especialidad incompatible",
    message: "El profesional no tiene la especialidad requerida para este tipo de cita",
    userMessage: "El profesional seleccionado no puede realizar este tipo de cita. Por favor, seleccione otro profesional o cambie el tipo de cita.",
    suggestions: [
      "Seleccione un profesional con la especialidad adecuada",
      "Cambie el tipo de cita según las especialidades del profesional",
      "Verifique las especialidades disponibles del profesional",
    ],
  },
  PROFESSIONAL_HAS_NO_SPECIALTIES: {
    code: "PROFESSIONAL_HAS_NO_SPECIALTIES",
    title: "Profesional sin especialidades",
    message: "El profesional no tiene especialidades registradas",
    userMessage: "El profesional seleccionado no tiene especialidades registradas. Por favor, seleccione otro profesional.",
    suggestions: [
      "Seleccione otro profesional",
      "Contacte al administrador para registrar especialidades del profesional",
    ],
  },
  CONSULTORIO_INACTIVO: {
    code: "CONSULTORIO_INACTIVO",
    title: "Consultorio no disponible",
    message: "El consultorio seleccionado está inactivo",
    userMessage: "El consultorio seleccionado no está disponible en este momento. Por favor, seleccione otro consultorio.",
    suggestions: [
      "Seleccione otro consultorio disponible",
      "Deje el campo de consultorio vacío si no es necesario",
      "Contacte al administrador si necesita activar este consultorio",
    ],
  },
  CONSULTORIO_BLOCKED: {
    code: "CONSULTORIO_BLOCKED",
    title: "Consultorio bloqueado",
    message: "El consultorio está bloqueado en el horario solicitado",
    userMessage: "El consultorio está bloqueado en ese horario. Por favor, seleccione otro horario o consultorio.",
    suggestions: [
      "Seleccione otro horario disponible",
      "Seleccione otro consultorio",
      "Verifique el calendario para ver los bloqueos",
    ],
  },
  CONSULTORIO_NOT_FOUND: {
    code: "CONSULTORIO_NOT_FOUND",
    title: "Consultorio no encontrado",
    message: "El consultorio especificado no existe",
    userMessage: "El consultorio especificado no existe. Por favor, verifique el ID o seleccione otro consultorio.",
    suggestions: [
      "Verifique que el ID del consultorio sea correcto",
      "Seleccione otro consultorio de la lista",
      "Deje el campo vacío si no es necesario",
    ],
  },
  PROFESIONAL_BLOCKED: {
    code: "PROFESIONAL_BLOCKED",
    title: "Profesional no disponible",
    message: "El profesional tiene un bloqueo de agenda en el horario solicitado",
    userMessage: "El profesional no está disponible en ese horario debido a un bloqueo de agenda. Por favor, seleccione otro horario.",
    suggestions: [
      "Seleccione otro horario disponible",
      "Verifique la disponibilidad del profesional",
      "Use las recomendaciones de horarios disponibles",
    ],
  },
  PACIENTE_NOT_FOUND: {
    code: "PACIENTE_NOT_FOUND",
    title: "Paciente no encontrado",
    message: "El paciente especificado no existe",
    userMessage: "El paciente especificado no existe. Por favor, verifique el ID o seleccione otro paciente.",
    suggestions: [
      "Verifique que el ID del paciente sea correcto",
      "Busque el paciente por nombre o documento",
      "Cree el paciente si no existe",
    ],
  },
  PROFESIONAL_NOT_FOUND: {
    code: "PROFESIONAL_NOT_FOUND",
    title: "Profesional no encontrado",
    message: "El profesional especificado no existe",
    userMessage: "El profesional especificado no existe. Por favor, verifique el ID o seleccione otro profesional.",
    suggestions: [
      "Verifique que el ID del profesional sea correcto",
      "Seleccione otro profesional de la lista",
      "Contacte al administrador si el problema persiste",
    ],
  },
  PACIENTE_INACTIVO: {
    code: "PACIENTE_INACTIVO",
    title: "Paciente inactivo",
    message: "El paciente está inactivo y no puede recibir citas",
    userMessage: "El paciente está inactivo y no puede recibir citas. Por favor, active el paciente primero.",
    suggestions: [
      "Active el paciente desde su ficha",
      "Seleccione otro paciente activo",
      "Contacte al administrador si necesita activar este paciente",
    ],
  },
  PROFESIONAL_INACTIVO: {
    code: "PROFESIONAL_INACTIVO",
    title: "Profesional inactivo",
    message: "El profesional está inactivo y no puede recibir citas",
    userMessage: "El profesional está inactivo y no puede recibir citas. Por favor, seleccione otro profesional.",
    suggestions: [
      "Seleccione otro profesional activo",
      "Contacte al administrador si necesita activar este profesional",
    ],
  },
  NOT_REPROGRAMMABLE: {
    code: "NOT_REPROGRAMMABLE",
    title: "No se puede reprogramar",
    message: "La cita no puede ser reprogramada en su estado actual",
    userMessage: "Esta cita no puede ser reprogramada porque ya está completada, cancelada o en un estado final.",
    suggestions: [
      "Cancele la cita actual y cree una nueva",
      "Verifique el estado de la cita",
    ],
  },
  NOT_CANCELLABLE: {
    code: "NOT_CANCELLABLE",
    title: "No se puede cancelar",
    message: "La cita no puede ser cancelada en su estado actual",
    userMessage: "Esta cita no puede ser cancelada porque ya está completada o en un estado final.",
    suggestions: [
      "Verifique el estado de la cita",
      "Contacte al administrador si necesita cancelar esta cita",
    ],
  },
  INVALID_DATETIME: {
    code: "INVALID_DATETIME",
    title: "Fecha u hora inválida",
    message: "La fecha u hora proporcionada no es válida",
    userMessage: "La fecha u hora proporcionada no es válida. Por favor, verifique el formato.",
    suggestions: [
      "Verifique que la fecha y hora sean correctas",
      "Asegúrese de usar el formato correcto",
    ],
  },
  INVALID_TIME_RANGE: {
    code: "INVALID_TIME_RANGE",
    title: "Rango de tiempo inválido",
    message: "El rango de tiempo especificado no es válido",
    userMessage: "La hora de fin debe ser posterior a la hora de inicio. Por favor, verifique los horarios.",
    suggestions: [
      "Verifique que la hora de fin sea posterior a la hora de inicio",
      "Ajuste la duración de la cita",
    ],
  },
  NO_PAST_APPOINTMENTS: {
    code: "NO_PAST_APPOINTMENTS",
    title: "No se pueden crear citas en el pasado",
    message: "No se pueden crear citas con fecha y hora en el pasado",
    userMessage: "No se pueden crear citas en el pasado. Por favor, seleccione una fecha y hora futura.",
    suggestions: [
      "Seleccione una fecha y hora futura",
      "Use el calendario para seleccionar fechas disponibles",
    ],
  },
  FOREIGN_KEY_CONSTRAINT: {
    code: "FOREIGN_KEY_CONSTRAINT",
    title: "Error de referencia",
    message: "Uno de los elementos referenciados no existe",
    userMessage: "Uno de los elementos seleccionados no existe o fue eliminado. Por favor, recargue la página y vuelva a intentar.",
    suggestions: [
      "Recargue la página",
      "Verifique que todos los elementos existan",
      "Contacte al administrador si el problema persiste",
    ],
  },
  DUPLICATE: {
    code: "DUPLICATE",
    title: "Elemento duplicado",
    message: "Ya existe un elemento con estos datos",
    userMessage: "Ya existe una cita con estos datos. Por favor, verifique que no esté duplicando la información.",
    suggestions: [
      "Verifique que no esté creando una cita duplicada",
      "Revise el calendario para ver citas existentes",
    ],
  },
  INTERNAL_ERROR: {
    code: "INTERNAL_ERROR",
    title: "Error interno",
    message: "Ocurrió un error interno en el servidor",
    userMessage: "Ocurrió un error inesperado. Por favor, intente nuevamente. Si el problema persiste, contacte al administrador.",
    suggestions: [
      "Intente nuevamente en unos momentos",
      "Recargue la página",
      "Contacte al administrador si el problema persiste",
    ],
  },
  CONSENT_REQUIRED_FOR_MINOR: {
    code: "CONSENT_REQUIRED_FOR_MINOR",
    title: "Consentimiento requerido",
    message: "Se requiere consentimiento informado para pacientes menores de edad",
    userMessage: "El paciente es menor de edad y requiere un consentimiento informado vigente firmado por su responsable antes de iniciar la consulta.",
    suggestions: [
      "Suba el consentimiento firmado desde la ficha del paciente",
      "Verifique que el consentimiento esté vigente",
      "Contacte al responsable del paciente si es necesario",
    ],
  },
  STATE_TERMINAL: {
    code: "STATE_TERMINAL",
    title: "Estado terminal",
    message: "La cita está en un estado terminal y no puede ser modificada",
    userMessage: "Esta cita está en un estado final (completada o cancelada) y no puede ser modificada.",
    suggestions: [
      "Verifique el estado de la cita",
      "Cree una nueva cita si necesita agendar nuevamente",
    ],
  },
  TRANSITION_NOT_ALLOWED: {
    code: "TRANSITION_NOT_ALLOWED",
    title: "Transición no permitida",
    message: "No se puede realizar esta transición de estado desde el estado actual",
    userMessage: "No se puede realizar esta acción desde el estado actual de la cita. Por favor, verifique el estado de la cita.",
    suggestions: [
      "Verifique el estado actual de la cita",
      "Siga el flujo correcto de estados",
    ],
  },
  CONCURRENT_MODIFICATION: {
    code: "CONCURRENT_MODIFICATION",
    title: "Modificación concurrente",
    message: "La cita fue modificada por otro usuario mientras se procesaba su solicitud",
    userMessage: "La cita fue modificada por otro usuario. Por favor, recargue la página y vuelva a intentar.",
    suggestions: [
      "Recargue la página para ver el estado actual",
      "Vuelva a intentar la operación",
    ],
  },
}

/**
 * Obtiene el mensaje de error estructurado por código
 */
export function getErrorMessage(code: ErrorCode | string, details?: unknown): ErrorDetails {
  const error = ERROR_MESSAGES[code as ErrorCode]
  if (!error) {
    return {
      code: "INTERNAL_ERROR",
      title: "Error desconocido",
      message: `Error inesperado: ${code}`,
      userMessage: "Ocurrió un error inesperado. Por favor, intente nuevamente.",
      suggestions: ["Intente nuevamente", "Contacte al administrador si el problema persiste"],
    }
  }

  // Personalizar mensaje con detalles si están disponibles
  if (details && typeof details === "object") {
    const detailsObj = details as Record<string, unknown>
    
    // Personalizar mensaje de especialidad
    if (code === "INCOMPATIBLE_SPECIALTY" || code === "PROFESSIONAL_HAS_NO_SPECIALTIES") {
      const requiredEspecialidades = detailsObj.requiredEspecialidades as string[] | undefined
      const profesionalEspecialidades = detailsObj.profesionalEspecialidades as string[] | undefined
      
      if (requiredEspecialidades && profesionalEspecialidades) {
        return {
          ...error,
          userMessage: `Se requiere una de estas especialidades: ${requiredEspecialidades.join(", ")}. El profesional tiene: ${profesionalEspecialidades.join(", ") || "ninguna"}.`,
        }
      }
    }

    // Personalizar mensaje de consultorio bloqueado
    if (code === "CONSULTORIO_BLOCKED" && detailsObj.motivo) {
      return {
        ...error,
        userMessage: `El consultorio está bloqueado: ${detailsObj.motivo}. Por favor, seleccione otro horario o consultorio.`,
      }
    }

    // Personalizar mensaje de disponibilidad
    if ((code === "OUTSIDE_WORKING_HOURS" || code === "NO_WORKING_DAY") && detailsObj.workingHours) {
      const workingHours = detailsObj.workingHours as string | undefined
      return {
        ...error,
        userMessage: `${error.userMessage} ${workingHours ? `Horarios disponibles: ${workingHours}` : ""}`,
      }
    }
  }

  return error
}

/**
 * Mensajes de éxito estructurados
 */
export const SUCCESS_MESSAGES = {
  CITA_CREATED: {
    title: "Cita creada",
    message: "La cita ha sido creada exitosamente",
    duration: 4000,
  },
  CITA_REPROGRAMADA: {
    title: "Cita reprogramada",
    message: "La cita ha sido reprogramada exitosamente. La cita original fue cancelada.",
    duration: 4000,
  },
  CITA_CANCELADA: {
    title: "Cita cancelada",
    message: "La cita ha sido cancelada exitosamente",
    duration: 4000,
  },
  CITA_CONFIRMADA: {
    title: "Cita confirmada",
    message: "La cita ha sido confirmada exitosamente",
    duration: 3000,
  },
  CHECKIN_REALIZADO: {
    title: "Check-in realizado",
    message: "El check-in se ha registrado exitosamente",
    duration: 3000,
  },
  CONSULTA_INICIADA: {
    title: "Consulta iniciada",
    message: "La consulta ha sido iniciada exitosamente",
    duration: 3000,
  },
  CONSULTA_COMPLETADA: {
    title: "Consulta completada",
    message: "La consulta ha sido completada exitosamente",
    duration: 4000,
  },
  CONSENTIMIENTO_REGISTRADO: {
    title: "Consentimiento registrado",
    message: "El consentimiento ha sido subido exitosamente. Ahora puede iniciar la consulta.",
    duration: 4000,
  },
  ESTADO_ACTUALIZADO: {
    title: "Estado actualizado",
    message: "El estado de la cita ha sido actualizado exitosamente",
    duration: 3000,
  },
} as const satisfies Record<string, SuccessMessage>

/**
 * Obtiene el mensaje de éxito por clave
 */
export function getSuccessMessage(key: keyof typeof SUCCESS_MESSAGES): SuccessMessage {
  return SUCCESS_MESSAGES[key]
}

/**
 * Helper para formatear mensajes de conflicto con detalles
 */
export function formatConflictMessage(conflicts: Array<{
  citaId: number
  inicioISO: string
  finISO: string
  profesional: { id: number; nombre: string }
  consultorio?: { id: number; nombre: string }
}>): string {
  if (conflicts.length === 0) return ""
  
  const conflictCount = conflicts.length
  const conflictText = conflictCount === 1 ? "cita existente" : `${conflictCount} citas existentes`
  
  return `El horario seleccionado se solapa con ${conflictText}. Por favor, seleccione otro horario disponible.`
}

