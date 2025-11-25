/**
 * Server-side file validation utilities
 * Includes magic number (file signature) validation
 */

import type { FileValidationResult } from "./file-validation"

// Magic number signatures (first bytes of file)
export const FILE_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/gif": [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF...WEBP (check after)
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
  // DICOM files start with DICM at offset 128
  "image/dicom": [[0x44, 0x49, 0x43, 0x4d]], // DICM
}

/**
 * Validate file signature (magic numbers)
 * Returns validation result with detected MIME type if signature doesn't match
 */
export function validateFileSignature(
  buffer: Buffer,
  declaredMimeType: string,
): { valid: boolean; error?: string; detectedMimeType?: string } {
  if (buffer.length === 0) {
    return { valid: false, error: "Archivo vacío" }
  }

  const signatures = FILE_SIGNATURES[declaredMimeType]
  if (!signatures) {
    // If we don't have a signature for this type, try to detect it
    const detected = detectMimeTypeFromSignature(buffer)
    if (detected && detected !== declaredMimeType) {
      return {
        valid: false,
        error: `Firma de archivo no coincide con tipo declarado. Tipo detectado: ${detected}`,
        detectedMimeType: detected,
      }
    }
    // If we can't detect and don't have signature, allow it (for unknown types we might add later)
    return { valid: true }
  }

  // Check each possible signature for this MIME type
  for (const signature of signatures) {
    if (buffer.length < signature.length) {
      continue
    }

    const matches = signature.every((byte, index) => buffer[index] === byte)
    if (matches) {
      // Special handling for WebP (RIFF...WEBP)
      if (declaredMimeType === "image/webp" && buffer.length >= 12) {
        const webpCheck = buffer.slice(8, 12).toString("ascii")
        if (webpCheck !== "WEBP") {
          continue
        }
      }

      // Special handling for DICOM (DICM at offset 128)
      if (declaredMimeType === "image/dicom" && buffer.length >= 132) {
        const dicomCheck = buffer.slice(128, 132).toString("ascii")
        if (dicomCheck !== "DICM") {
          // Check if it's at the beginning (some DICOM files don't have preamble)
          const dicomCheckStart = buffer.slice(0, 4).toString("ascii")
          if (dicomCheckStart !== "DICM") {
            continue
          }
        }
      }

      return { valid: true, detectedMimeType: declaredMimeType }
    }
  }

  // Signature doesn't match - try to detect actual type
  const detected = detectMimeTypeFromSignature(buffer)
  return {
    valid: false,
    error: detected
      ? `Firma de archivo no coincide con tipo declarado. Tipo detectado: ${detected}`
      : "Firma de archivo no válida o no reconocida",
    detectedMimeType: detected,
  }
}

/**
 * Detect MIME type from file signature
 */
export function detectMimeTypeFromSignature(buffer: Buffer): string | null {
  if (buffer.length === 0) {
    return null
  }

  // Check each known signature
  for (const [mimeType, signatures] of Object.entries(FILE_SIGNATURES)) {
    for (const signature of signatures) {
      if (buffer.length < signature.length) {
        continue
      }

      const matches = signature.every((byte, index) => buffer[index] === byte)
      if (matches) {
        // Special WebP check
        if (mimeType === "image/webp" && buffer.length >= 12) {
          const webpCheck = buffer.slice(8, 12).toString("ascii")
          if (webpCheck === "WEBP") {
            return mimeType
          }
        } else if (mimeType === "image/dicom") {
          // Check DICOM at offset 128
          if (buffer.length >= 132) {
            const dicomCheck = buffer.slice(128, 132).toString("ascii")
            if (dicomCheck === "DICM") {
              return mimeType
            }
          }
          // Check at start (some DICOM files don't have preamble)
          if (buffer.length >= 4) {
            const dicomCheckStart = buffer.slice(0, 4).toString("ascii")
            if (dicomCheckStart === "DICM") {
              return mimeType
            }
          }
        } else {
          return mimeType
        }
      }
    }
  }

  return null
}

/**
 * Validate file with signature check (server-side)
 */
export async function validateFileWithSignature(
  file: File | { size: number; type: string; name: string },
  buffer: Buffer,
): Promise<FileValidationResult> {
  // Import frontend validation
  const { validateFile } = await import("./file-validation")

  // First do basic validation
  const basicValidation = validateFile(file)
  if (!basicValidation.valid) {
    return basicValidation
  }

  // Then validate signature
  const signatureValidation = validateFileSignature(buffer, file.type)
  if (!signatureValidation.valid) {
    return {
      valid: false,
      error: signatureValidation.error,
      errorCode: "INVALID_TYPE",
      detectedMimeType: signatureValidation.detectedMimeType,
    }
  }

  return { valid: true }
}

/**
 * Read file buffer for signature validation (only first bytes needed)
 */
export async function readFileSignature(file: File, bytesToRead = 132): Promise<Buffer> {
  const blob = file.slice(0, bytesToRead)
  const arrayBuffer = await blob.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

