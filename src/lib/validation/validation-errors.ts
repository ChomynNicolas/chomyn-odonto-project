/**
 * Standardized validation error types and creation functions
 */

export interface FileValidationError {
  code:
    | "FILE_TOO_LARGE"
    | "INVALID_FILE_TYPE"
    | "INVALID_SIGNATURE"
    | "INVALID_EXTENSION"
    | "EMPTY_FILE"
    | "MISSING_FILE"
    | "VALIDATION_ERROR"
  message: string
  details?: {
    fileSize?: number
    maxSize?: number
    fileType?: string
    allowedTypes?: string[]
    fileName?: string
    detectedMimeType?: string
  }
}

/**
 * Create a standardized file validation error
 */
export function createFileValidationError(
  code: FileValidationError["code"],
  message: string,
  details?: FileValidationError["details"],
): FileValidationError {
  return {
    code,
    message,
    details,
  }
}

/**
 * Convert FileValidationError to API error response format
 */
export function toApiErrorResponse(error: FileValidationError) {
  return {
    ok: false,
    code: error.code,
    error: error.message,
    ...(error.details ? { details: error.details } : {}),
  }
}

