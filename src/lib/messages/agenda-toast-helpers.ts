/**
 * Helpers para mostrar toasts de error y éxito en el frontend
 * Usa el módulo centralizado de mensajes para consistencia
 */

import { toast } from "sonner"
import { getErrorMessage, getSuccessMessage, formatConflictMessage, type ErrorCode } from "./agenda-messages"

/**
 * Muestra un toast de error basado en el código de error
 */
export function showErrorToast(
  code: ErrorCode | string,
  details?: unknown,
  customMessage?: string
): void {
  const error = getErrorMessage(code as ErrorCode, details)
  
  toast.error(error.title, {
    description: customMessage || error.userMessage,
    duration: 6000,
  })
}

/**
 * Muestra un toast de error con conflictos (para OVERLAP)
 */
export function showConflictErrorToast(conflicts: Array<{
  citaId: number
  inicioISO: string
  finISO: string
  profesional: { id: number; nombre: string }
  consultorio?: { id: number; nombre: string }
}>): void {
  const error = getErrorMessage("OVERLAP")
  const conflictMessage = formatConflictMessage(conflicts)
  
  toast.error(error.title, {
    description: conflictMessage,
    duration: 7000,
  })
}

/**
 * Muestra un toast de éxito
 */
export function showSuccessToast(
  key: keyof typeof import("./agenda-messages").SUCCESS_MESSAGES
): void {
  const success = getSuccessMessage(key)
  
  toast.success(success.title, {
    description: success.message,
    duration: success.duration,
  })
}

/**
 * Maneja errores de API y muestra toasts apropiados
 */
export function handleApiError(error: unknown): void {
  const apiError = error as {
    status?: number
    code?: string
    message?: string
    details?: unknown
    conflicts?: Array<{
      citaId: number
      inicioISO: string
      finISO: string
      profesional: { id: number; nombre: string }
      consultorio?: { id: number; nombre: string }
    }>
  }

  // Manejar conflictos de overlap
  if (apiError.status === 409 && apiError.code === "OVERLAP" && apiError.conflicts) {
    showConflictErrorToast(apiError.conflicts)
    return
  }

  // Manejar otros errores con código
  if (apiError.code) {
    showErrorToast(apiError.code, apiError.details, apiError.message)
    return
  }

  // Error genérico
  const errorMsg = getErrorMessage("INTERNAL_ERROR")
  toast.error(errorMsg.title, {
    description: apiError.message || errorMsg.userMessage,
    duration: 6000,
  })
}

