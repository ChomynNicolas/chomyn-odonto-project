/**
 * Shared file validation constants and utilities
 * Used by both frontend and backend for consistent validation
 */

// File size limits (15MB for medical images/DICOM files)
export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024 // 15MB
export const MAX_FILE_SIZE_MB = 15

// Allowed MIME types
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/dicom",
  "application/pdf",
] as const

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

// Allowed file extensions
export const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".dcm",
  ".pdf",
] as const

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number]

// Validation result type
export interface FileValidationResult {
  valid: boolean
  error?: string
  errorCode?: "INVALID_TYPE" | "INVALID_SIZE" | "INVALID_EXTENSION" | "EMPTY_FILE"
  detectedMimeType?: string
}

// Error messages
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: (sizeMB: number) =>
    `El archivo es demasiado grande (${sizeMB.toFixed(2)} MB). El tamaño máximo permitido es ${MAX_FILE_SIZE_MB}MB.`,
  INVALID_FILE_TYPE: (type: string) =>
    `Tipo de archivo no permitido: ${type}. Solo se permiten imágenes (JPEG, PNG, GIF, WebP, DICOM) y PDFs.`,
  INVALID_EXTENSION: (ext: string) =>
    `Extensión de archivo no permitida: ${ext}. Solo se permiten: ${ALLOWED_EXTENSIONS.join(", ")}`,
  EMPTY_FILE: "El archivo está vacío.",
} as const

/**
 * Validate file size
 */
export function validateFileSize(size: number): { valid: boolean; error?: string } {
  if (size === 0) {
    return { valid: false, error: ERROR_MESSAGES.EMPTY_FILE }
  }
  if (size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = size / 1024 / 1024
    return { valid: false, error: ERROR_MESSAGES.FILE_TOO_LARGE(sizeMB) }
  }
  return { valid: true }
}

/**
 * Validate MIME type
 */
export function validateMimeType(mimeType: string): { valid: boolean; error?: string } {
  if (!mimeType) {
    return { valid: false, error: "Tipo MIME no proporcionado" }
  }
  if (!ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)) {
    return { valid: false, error: ERROR_MESSAGES.INVALID_FILE_TYPE(mimeType) }
  }
  return { valid: true }
}

/**
 * Validate file extension
 */
export function validateFileExtension(filename: string): { valid: boolean; error?: string } {
  if (!filename) {
    return { valid: false, error: "Nombre de archivo no proporcionado" }
  }

  const extension = filename.toLowerCase().substring(filename.lastIndexOf("."))
  if (!extension || extension === filename) {
    return { valid: false, error: "El archivo debe tener una extensión" }
  }

  if (!ALLOWED_EXTENSIONS.includes(extension as AllowedExtension)) {
    return { valid: false, error: ERROR_MESSAGES.INVALID_EXTENSION(extension) }
  }

  return { valid: true }
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string | null {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf("."))
  if (!extension || extension === filename) {
    return null
  }
  return extension
}

/**
 * Validate file (frontend version - uses File object)
 */
export function validateFile(file: File | { size: number; type: string; name: string }): FileValidationResult {
  // Validate size
  const sizeValidation = validateFileSize(file.size)
  if (!sizeValidation.valid) {
    return {
      valid: false,
      error: sizeValidation.error,
      errorCode: "INVALID_SIZE",
    }
  }

  // Validate MIME type
  const mimeValidation = validateMimeType(file.type)
  if (!mimeValidation.valid) {
    return {
      valid: false,
      error: mimeValidation.error,
      errorCode: "INVALID_TYPE",
    }
  }

  // Validate extension
  const extValidation = validateFileExtension(file.name)
  if (!extValidation.valid) {
    return {
      valid: false,
      error: extValidation.error,
      errorCode: "INVALID_EXTENSION",
    }
  }

  return { valid: true }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

