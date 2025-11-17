// src/app/api/pacientes/_errors.ts
/**
 * Errores de dominio para el módulo de pacientes
 */

export class PacienteDomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = "PacienteDomainError"
    // Mantiene el stack trace para debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PacienteDomainError)
    }
  }
}

/**
 * Error específico para cuando ya existe un paciente con el mismo documento
 */
export class PacienteAlreadyExistsError extends PacienteDomainError {
  constructor(
    tipoDocumento: string,
    numeroDocumento: string,
    public readonly existingPacienteId?: number,
  ) {
    const tipoLabel = tipoDocumento === "CI" ? "CI" : tipoDocumento === "DNI" ? "DNI" : tipoDocumento
    super(
      "PACIENTE_ALREADY_EXISTS",
      `Ya existe un paciente registrado con este ${tipoLabel}: ${numeroDocumento}`,
      409, // Conflict
      {
        tipoDocumento,
        numeroDocumento,
        existingPacienteId,
      },
    )
    this.name = "PacienteAlreadyExistsError"
  }
}

/**
 * Helper para verificar si un error es de tipo PacienteDomainError
 */
export function isPacienteDomainError(error: unknown): error is PacienteDomainError {
  return error instanceof PacienteDomainError
}

