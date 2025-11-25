# File Upload Validation Implementation Plan

## Executive Summary

This document provides a comprehensive plan for implementing robust file type and size validation for attachment uploads in the Chomyn Odonto application. The implementation will enforce security best practices, ensure consistency across frontend and backend, and provide excellent user experience.

**Key Requirements:**
- Allowed types: Images (JPEG, PNG, GIF, WebP) and PDFs
- Maximum file size: **10MB** (currently 25MB in some places - needs standardization)
- Validation required in both frontend and backend
- Consistent error handling and user messaging

---

## 1. Exhaustive Analysis of Current Implementation

### 1.1 Current Upload Flow

The attachment upload process follows this flow:

```
1. User selects file in AttachmentUploadDialog.tsx
   ↓
2. Frontend validates file size and MIME type (handleFileSelect)
   ↓
3. User clicks "Subir Archivo"
   ↓
4. Frontend calls POST /api/uploads/sign
   - Generates Cloudinary upload signature
   - NO FILE VALIDATION HERE
   ↓
5. Frontend uploads file directly to Cloudinary
   - Uses signed URL from step 4
   - NO BACKEND VALIDATION HERE
   ↓
6. Frontend calls POST /api/adjuntos/route.ts OR POST /api/pacientes/[id]/adjuntos/route.ts
   - Creates database record with Cloudinary metadata
   - NO FILE VALIDATION HERE
```

### 1.2 Current Validation State

#### Frontend Validation

**AttachmentUploadDialog.tsx:**
- ✅ File size validation: `MAX_FILE_SIZE = 25 * 1024 * 1024` (25MB)
- ✅ MIME type validation: Checks against `ACCEPTED_TYPES` array
- ✅ HTML5 `accept` attribute on file input
- ❌ **Issue**: Size limit is 25MB, requirement is 10MB
- ❌ **Issue**: No file extension validation
- ❌ **Issue**: No magic number/file signature validation
- ❌ **Issue**: Relies solely on browser-provided MIME type (can be spoofed)

**AdjuntosDropzone.tsx:**
- ✅ Similar validation logic
- ❌ **Issue**: Duplicated constants (`MAX_MB = 25`)
- ❌ **Issue**: Different `ACCEPTED_TYPES` array (missing `image/dicom`)

**AdjuntosModule.tsx:**
- ✅ Similar validation logic
- ❌ **Issue**: Another duplicate of constants

#### Backend Validation

**POST /api/uploads/sign (route.ts):**
- ❌ **CRITICAL**: No file validation
- ✅ Validates request body schema (Zod)
- ✅ RBAC check
- ❌ **Issue**: Generates signature for ANY file type/size

**POST /api/adjuntos/route.ts:**
- ❌ **CRITICAL**: No file validation
- ✅ Validates request body schema (Zod)
- ✅ Checks `bytes` field is non-negative
- ❌ **Issue**: Trusts client-provided `bytes`, `format`, `resourceType`
- ❌ **Issue**: No MIME type validation
- ❌ **Issue**: No size limit enforcement

**POST /api/pacientes/[id]/adjuntos/upload/route.ts:**
- ❌ **CRITICAL**: No file validation before upload
- ✅ Receives `FormData` with file
- ❌ **Issue**: Uploads to Cloudinary without validating type/size
- ❌ **Issue**: No MIME type checking
- ❌ **Issue**: No size limit enforcement

**POST /api/pacientes/[id]/adjuntos/route.ts:**
- ❌ **CRITICAL**: No file validation
- ✅ Validates request body schema
- ❌ **Issue**: Trusts all client-provided metadata

### 1.3 Security Vulnerabilities

1. **MIME Type Spoofing**: Client can send `Content-Type: image/jpeg` but upload `.exe` file
2. **Size Limit Bypass**: No backend enforcement - malicious client can upload 100MB+ files
3. **Type Bypass**: Backend doesn't verify actual file content matches declared type
4. **Extension Mismatch**: No validation that extension matches MIME type
5. **Magic Number Missing**: No file signature validation (e.g., PDF files start with `%PDF-`)
6. **Inconsistent Limits**: Different size limits across components (25MB vs 10MB)

### 1.4 Current Constants Duplication

Validation constants are duplicated in multiple files:
- `AttachmentUploadDialog.tsx`: `MAX_FILE_SIZE = 25MB`, `ACCEPTED_TYPES = [...]`
- `AdjuntosDropzone.tsx`: `MAX_MB = 25`, `ACCEPTED_TYPES = [...]`
- `AdjuntosModule.tsx`: `MAX_FILE_SIZE = 25MB`, `ACCEPTED_TYPES = [...]`

**Issue**: Changes require updates in multiple places, risk of drift.

---

## 2. Validation Strategy Design

### 2.1 Allowed File Types

**Images:**
- JPEG (`image/jpeg`, extensions: `.jpg`, `.jpeg`)
- PNG (`image/png`, extension: `.png`)
- GIF (`image/gif`, extension: `.gif`)
- WebP (`image/webp`, extension: `.webp`)
- DICOM (`image/dicom`, extension: `.dcm`) - For X-rays

**Documents:**
- PDF (`application/pdf`, extension: `.pdf`)

**Magic Numbers (File Signatures):**
- JPEG: `FF D8 FF`
- PNG: `89 50 4E 47 0D 0A 1A 0A`
- GIF: `47 49 46 38` (GIF8)
- WebP: `52 49 46 46` + `WEBP` (RIFF...WEBP)
- PDF: `25 50 44 46` (`%PDF`)

### 2.2 Size Limits

- **Maximum file size**: 10MB (10,485,760 bytes)
- **Enforcement**: Per file (not per request)
- **Rationale**: 
  - Medical images can be large but 10MB is reasonable
  - Prevents storage abuse
  - Ensures reasonable upload times

### 2.3 Validation Layers

**Layer 1: Frontend (User Experience)**
- Immediate feedback on file selection
- Prevents invalid files from being selected
- Clear error messages
- Disables upload button for invalid files

**Layer 2: Backend Pre-Upload (Security)**
- Validates file before generating Cloudinary signature
- Checks MIME type, size, extension
- Validates magic numbers
- Prevents malicious uploads

**Layer 3: Backend Post-Upload (Verification)**
- Verifies Cloudinary response matches expectations
- Validates metadata before database insertion
- Double-checks size and type from Cloudinary response

### 2.4 Edge Cases Handling

1. **Incorrect Extension with Valid MIME Type**
   - Example: `malware.exe` with `Content-Type: image/jpeg`
   - **Solution**: Validate magic numbers, reject if mismatch

2. **Valid Extension with Incorrect MIME Type**
   - Example: `image.jpg` with `Content-Type: application/pdf`
   - **Solution**: Validate magic numbers, use detected type

3. **File Exactly 10MB**
   - **Solution**: Use `<=` comparison (allow exactly 10MB)

4. **Very Large Files (>10MB)**
   - **Solution**: Reject immediately, clear error message

5. **Malformed Files**
   - Example: Corrupted JPEG, incomplete PDF
   - **Solution**: Magic number validation catches most cases, Cloudinary may reject others

6. **Empty Files**
   - **Solution**: Size check catches (0 bytes < 10MB, but validate minimum size if needed)

7. **Multiple Files**
   - Current implementation: Single file upload
   - **Solution**: Validate each file individually if multi-file support added

8. **Network Errors During Upload**
   - **Solution**: Proper error handling in upload flow, retry logic if needed

### 2.5 Security Best Practices

1. **Never Trust Client Data**
   - Always validate on backend
   - Verify file signatures (magic numbers)
   - Check actual file size from Cloudinary response

2. **Defense in Depth**
   - Multiple validation layers
   - Frontend for UX, backend for security

3. **Sanitize Filenames**
   - Already implemented in `sanitizeFilename()` utility
   - Prevents path traversal, special characters

4. **Rate Limiting** (Future Consideration)
   - Prevent abuse with upload rate limits
   - Not in current scope but worth noting

5. **Content Security**
   - Cloudinary handles virus scanning (if enabled)
   - Consider additional scanning for sensitive medical data

---

## 3. Step-by-Step Implementation Plan

### Phase 1: Discovery & Constraints

#### Task 1.1: Document Allowed Types and Size Limits
- [x] Document allowed MIME types
- [x] Document allowed file extensions
- [x] Document magic numbers
- [x] Set size limit to 10MB

#### Task 1.2: Identify Library Limitations
- **Next.js**: FormData handling works well
- **Cloudinary**: Accepts any file type, relies on backend validation
- **Browser File API**: Provides MIME type (can be spoofed)
- **Node.js**: Can read file buffers for magic number validation

**Dependencies Needed:**
- None (use native Node.js Buffer operations for magic numbers)

---

### Phase 2: Create Shared Validation Utilities

#### Task 2.1: Create `src/lib/validation/file-validation.ts`

**Purpose**: Centralized validation constants and functions

**Contents:**
```typescript
// Constants
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
export const MAX_FILE_SIZE_MB = 10

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/dicom",
  "application/pdf",
] as const

export const ALLOWED_EXTENSIONS = [
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".dcm", ".pdf"
] as const

// Magic number signatures (first bytes of file)
export const FILE_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [[0xFF, 0xD8, 0xFF]],
  "image/png": [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  "image/gif": [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]], // GIF87a or GIF89a
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF...WEBP (check after)
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
}

// Validation result type
export interface FileValidationResult {
  valid: boolean
  error?: string
  errorCode?: "INVALID_TYPE" | "INVALID_SIZE" | "INVALID_SIGNATURE" | "EMPTY_FILE"
  detectedMimeType?: string
}

// Validation functions
export function validateFileSize(size: number): { valid: boolean; error?: string }
export function validateMimeType(mimeType: string): { valid: boolean; error?: string }
export function validateFileExtension(filename: string): { valid: boolean; error?: string }
export function validateFileSignature(buffer: Buffer, declaredMimeType: string): { valid: boolean; error?: string; detectedMimeType?: string }
export function validateFile(file: File | { size: number; type: string; name: string }, buffer?: Buffer): FileValidationResult
```

**Implementation Notes:**
- Use TypeScript const assertions for type safety
- Export both individual validators and combined validator
- Support both File objects (frontend) and file metadata + buffer (backend)

#### Task 2.2: Create `src/lib/validation/file-validation-server.ts`

**Purpose**: Server-side specific validation utilities

**Contents:**
- Functions that work with Node.js Buffer
- Magic number validation using Buffer operations
- Integration with FormData parsing

---

### Phase 3: Frontend Validation Enhancement

#### Task 3.1: Update `AttachmentUploadDialog.tsx`

**Changes:**
1. Import shared constants from `@/lib/validation/file-validation`
2. Replace local `MAX_FILE_SIZE` and `ACCEPTED_TYPES` with shared constants
3. Enhance `handleFileSelect`:
   - Add file extension validation
   - Improve error messages with specific details
   - Show file size in error message
4. Add validation state for better UX:
   - Track validation errors
   - Show inline error messages
   - Disable upload button when invalid

**Error Messages:**
- Size: "El archivo es demasiado grande (X MB). El tamaño máximo permitido es 10MB."
- Type: "Tipo de archivo no permitido: {type}. Solo se permiten imágenes (JPEG, PNG, GIF, WebP) y PDFs."
- Extension: "Extensión de archivo no permitida: {ext}. Solo se permiten: .jpg, .jpeg, .png, .gif, .webp, .dcm, .pdf"

#### Task 3.2: Update `AdjuntosDropzone.tsx`

**Changes:**
1. Import shared constants
2. Replace local constants
3. Update validation function to use shared utilities
4. Ensure consistent error messages

#### Task 3.3: Update `AdjuntosModule.tsx`

**Changes:**
1. Import shared constants
2. Replace local constants
3. Update UI text to reflect 10MB limit

#### Task 3.4: Update UI Text

**Files to update:**
- `AttachmentUploadDialog.tsx`: Change "máx. 25MB" to "máx. 10MB"
- `AdjuntosModule.tsx`: Update size limit text
- Any other components showing file size limits

---

### Phase 4: Backend Validation Implementation

#### Task 4.1: Add Validation to `/api/uploads/sign/route.ts`

**Purpose**: Prevent signature generation for invalid files

**Changes:**
1. Add optional `fileSize` and `fileType` to request body schema
2. Validate file size and type BEFORE generating signature
3. Return appropriate error codes:
   - `FILE_TOO_LARGE`: File exceeds 10MB
   - `INVALID_FILE_TYPE`: File type not allowed
   - `MISSING_FILE_INFO`: File metadata not provided

**Note**: This is a pre-validation step. The actual file isn't uploaded yet, but we validate the declared metadata.

**Request Body Schema Update:**
```typescript
const Body = z.object({
  pacienteId: z.number().int().positive().optional(),
  procedimientoId: z.number().int().positive().optional(),
  tipo: AdjuntoTipoEnum,
  accessMode: z.enum(["PUBLIC", "AUTHENTICATED"]).optional(),
  publicId: z.string().min(3).max(180).regex(/^[a-zA-Z0-9/_-]+$/).optional(),
  // NEW: File metadata for pre-validation
  fileSize: z.number().int().nonnegative().optional(),
  fileType: z.string().optional(),
  fileName: z.string().optional(),
})
```

**Validation Logic:**
```typescript
// If file metadata provided, validate before generating signature
if (parsed.data.fileSize !== undefined) {
  if (parsed.data.fileSize > MAX_FILE_SIZE_BYTES) {
    return jsonError(400, "FILE_TOO_LARGE", 
      `El archivo excede el tamaño máximo de ${MAX_FILE_SIZE_MB}MB`)
  }
}

if (parsed.data.fileType) {
  const mimeValidation = validateMimeType(parsed.data.fileType)
  if (!mimeValidation.valid) {
    return jsonError(400, "INVALID_FILE_TYPE", mimeValidation.error!)
  }
}

if (parsed.data.fileName) {
  const extValidation = validateFileExtension(parsed.data.fileName)
  if (!extValidation.valid) {
    return jsonError(400, "INVALID_FILE_TYPE", extValidation.error!)
  }
}
```

#### Task 4.2: Add Validation to `/api/pacientes/[id]/adjuntos/upload/route.ts`

**Purpose**: Validate file before uploading to Cloudinary

**Changes:**
1. After parsing FormData, validate file:
   - File size (from `file.size`)
   - MIME type (from `file.type`)
   - File extension (from `file.name`)
   - File signature (read first bytes of file buffer)
2. Return appropriate errors before Cloudinary upload
3. Only proceed to Cloudinary if all validations pass

**Implementation:**
```typescript
// After getting file from FormData
if (!file) {
  return jsonError(400, "MISSING_FILE", "No se proporcionó archivo")
}

// Read file buffer for signature validation
const buffer = Buffer.from(await file.arrayBuffer())

// Validate file
const validation = validateFile(
  { size: file.size, type: file.type, name: file.name },
  buffer
)

if (!validation.valid) {
  return jsonError(400, validation.errorCode || "VALIDATION_ERROR", validation.error!)
}

// Proceed with Cloudinary upload...
```

#### Task 4.3: Add Validation to `/api/adjuntos/route.ts`

**Purpose**: Validate metadata before creating database record

**Changes:**
1. Validate `bytes` field against size limit
2. Validate `format` field against allowed types
3. Validate `originalFilename` extension
4. Cross-validate `format` and `resourceType` consistency

**Implementation:**
```typescript
// After parsing request body
const data = parsed.data

// Validate file size
if (data.bytes > MAX_FILE_SIZE_BYTES) {
  return NextResponse.json(
    { error: "El archivo excede el tamaño máximo permitido" },
    { status: 400 }
  )
}

// Validate format
const allowedFormats = ["jpg", "jpeg", "png", "gif", "webp", "dcm", "pdf"]
if (data.format && !allowedFormats.includes(data.format.toLowerCase())) {
  return NextResponse.json(
    { error: "Formato de archivo no permitido" },
    { status: 400 }
  )
}

// Validate filename extension
if (data.originalFilename) {
  const extValidation = validateFileExtension(data.originalFilename)
  if (!extValidation.valid) {
    return NextResponse.json(
      { error: extValidation.error },
      { status: 400 }
    )
  }
}

// Proceed with database creation...
```

#### Task 4.4: Add Validation to `/api/pacientes/[id]/adjuntos/route.ts`

**Purpose**: Same as Task 4.3, but for patient-specific endpoint

**Changes:**
- Apply same validation logic as Task 4.3
- Ensure consistency between endpoints

---

### Phase 5: Consistency & Reuse

#### Task 5.1: Standardize Error Response Format

**Create**: `src/lib/validation/validation-errors.ts`

**Contents:**
```typescript
export interface FileValidationError {
  code: "FILE_TOO_LARGE" | "INVALID_FILE_TYPE" | "INVALID_SIGNATURE" | "INVALID_EXTENSION" | "EMPTY_FILE"
  message: string
  details?: {
    fileSize?: number
    maxSize?: number
    fileType?: string
    allowedTypes?: string[]
    fileName?: string
  }
}

export function createFileValidationError(
  code: FileValidationError["code"],
  details?: FileValidationError["details"]
): FileValidationError
```

**Usage**: All validation errors return consistent format

#### Task 5.2: Update Frontend to Send File Metadata

**File**: `AttachmentUploadDialog.tsx`

**Changes:**
- When calling `/api/uploads/sign`, include file metadata:
  ```typescript
  body: JSON.stringify({
    pacienteId: Number.parseInt(pacienteId),
    tipo,
    accessMode: "AUTHENTICATED",
    fileSize: file.size, // NEW
    fileType: file.type, // NEW
    fileName: file.name, // NEW
  })
  ```

#### Task 5.3: Create Validation Middleware (Optional)

**Purpose**: Reusable validation middleware for API routes

**File**: `src/lib/validation/middleware.ts`

**Contents:**
- Express-style middleware for Next.js API routes
- Validates FormData files
- Returns consistent error responses

---

### Phase 6: Testing Strategy

#### Task 6.1: Frontend Test Cases

**Manual Tests:**

1. **Valid Image Under 10MB**
   - Select JPEG file (5MB)
   - Expected: File accepted, upload button enabled
   - Expected: No error messages

2. **Valid PDF Under 10MB**
   - Select PDF file (2MB)
   - Expected: File accepted, tipo auto-set to "PDF"
   - Expected: Upload succeeds

3. **File Exactly 10MB**
   - Select file exactly 10MB
   - Expected: File accepted (boundary test)

4. **File Over 10MB**
   - Select file (15MB)
   - Expected: Error toast: "El archivo es demasiado grande (15 MB). El tamaño máximo permitido es 10MB."
   - Expected: File not selected, upload button disabled

5. **Invalid File Type**
   - Select `.exe` file
   - Expected: Error toast: "Tipo de archivo no permitido: application/x-msdownload. Solo se permiten imágenes (JPEG, PNG, GIF, WebP) y PDFs."
   - Expected: File not selected

6. **Invalid Extension**
   - Rename `.exe` to `.jpg`, try to upload
   - Expected: Frontend may accept (MIME type check), but backend should reject

7. **Empty File**
   - Select empty file (0 bytes)
   - Expected: May be accepted (0 < 10MB), but consider if this should be rejected

8. **Network Error**
   - Disconnect network, try upload
   - Expected: Error toast with network error message
   - Expected: Upload progress resets

**Unit Tests (if using testing framework):**

```typescript
describe("AttachmentUploadDialog validation", () => {
  it("should accept valid JPEG file under 10MB", () => {
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" })
    Object.defineProperty(file, "size", { value: 5 * 1024 * 1024 })
    // Test validation logic
  })

  it("should reject file over 10MB", () => {
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" })
    Object.defineProperty(file, "size", { value: 15 * 1024 * 1024 })
    // Test validation logic
  })

  it("should reject invalid file type", () => {
    const file = new File(["test"], "test.exe", { type: "application/x-msdownload" })
    // Test validation logic
  })
})
```

#### Task 6.2: Backend Test Cases

**Manual Tests (using Postman/curl):**

1. **Valid File Upload**
   ```bash
   curl -X POST /api/pacientes/1/adjuntos/upload \
     -F "file=@valid-image.jpg" \
     -F "tipo=IMAGE" \
     -F "descripcion=Test"
   ```
   - Expected: 200 OK, attachment created

2. **File Too Large**
   ```bash
   # Create 15MB file first
   dd if=/dev/zero of=large.jpg bs=1M count=15
   curl -X POST /api/pacientes/1/adjuntos/upload \
     -F "file=@large.jpg" \
     -F "tipo=IMAGE"
   ```
   - Expected: 400 Bad Request, error: "FILE_TOO_LARGE"

3. **Invalid File Type**
   ```bash
   curl -X POST /api/pacientes/1/adjuntos/upload \
     -F "file=@malware.exe" \
     -F "tipo=OTHER"
   ```
   - Expected: 400 Bad Request, error: "INVALID_FILE_TYPE"

4. **MIME Type Mismatch**
   ```bash
   # Rename .exe to .jpg, but keep actual content
   curl -X POST /api/pacientes/1/adjuntos/upload \
     -F "file=@fake-image.jpg" \
     -F "tipo=IMAGE"
   ```
   - Expected: 400 Bad Request, error: "INVALID_SIGNATURE" (magic number check fails)

5. **Invalid Signature Request**
   ```bash
   curl -X POST /api/uploads/sign \
     -H "Content-Type: application/json" \
     -d '{"pacienteId": 1, "tipo": "IMAGE", "fileSize": 15000000, "fileType": "image/jpeg"}'
   ```
   - Expected: 400 Bad Request, error: "FILE_TOO_LARGE"

6. **Valid Signature Request**
   ```bash
   curl -X POST /api/uploads/sign \
     -H "Content-Type: application/json" \
     -d '{"pacienteId": 1, "tipo": "IMAGE", "fileSize": 5000000, "fileType": "image/jpeg"}'
   ```
   - Expected: 200 OK, signature returned

**Integration Tests:**

```typescript
describe("POST /api/pacientes/[id]/adjuntos/upload", () => {
  it("should reject file over 10MB", async () => {
    const formData = new FormData()
    const largeFile = new File(["x".repeat(11 * 1024 * 1024)], "large.jpg", {
      type: "image/jpeg",
    })
    formData.append("file", largeFile)
    formData.append("tipo", "IMAGE")

    const response = await POST(request, { params: { id: "1" } })
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.code).toBe("FILE_TOO_LARGE")
  })

  it("should reject invalid file type", async () => {
    const formData = new FormData()
    const exeFile = new File(["executable"], "malware.exe", {
      type: "application/x-msdownload",
    })
    formData.append("file", exeFile)
    formData.append("tipo", "OTHER")

    const response = await POST(request, { params: { id: "1" } })
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.code).toBe("INVALID_FILE_TYPE")
  })

  it("should accept valid image file", async () => {
    // Mock valid JPEG file with correct magic numbers
    const jpegBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, // JPEG signature
      ...Array(1024).fill(0), // Dummy content
    ])
    const formData = new FormData()
    const blob = new Blob([jpegBuffer], { type: "image/jpeg" })
    const file = new File([blob], "test.jpg", { type: "image/jpeg" })
    formData.append("file", file)
    formData.append("tipo", "IMAGE")

    const response = await POST(request, { params: { id: "1" } })
    expect(response.status).toBe(200)
  })
})
```

#### Task 6.3: Edge Case Tests

1. **File Exactly 10MB**: Should be accepted
2. **File 10MB + 1 byte**: Should be rejected
3. **PDF with .jpg extension**: Should be rejected (signature mismatch)
4. **JPEG with .pdf extension**: Should be rejected (signature mismatch)
5. **Empty file (0 bytes)**: Decide if should be rejected (currently would pass size check)
6. **Very long filename**: Should be handled (sanitization)
7. **Filename with special characters**: Should be sanitized
8. **Concurrent uploads**: Should handle multiple simultaneous uploads

#### Task 6.4: Security Tests

1. **MIME Type Spoofing**: Send `.exe` with `Content-Type: image/jpeg`
   - Expected: Backend rejects (signature check fails)

2. **Size Bypass Attempt**: Send file with `Content-Length: 5MB` but actual size 15MB
   - Expected: Backend reads actual file size, rejects

3. **Extension Bypass**: Send `.exe` renamed to `.pdf`
   - Expected: Backend rejects (signature check fails)

4. **Malformed File**: Send corrupted JPEG
   - Expected: May pass signature check (has correct magic numbers), but Cloudinary may reject

---

## 4. Implementation Details & Best Practices

### 4.1 File Signature Validation Implementation

**Magic Number Checking:**

```typescript
export function validateFileSignature(
  buffer: Buffer,
  declaredMimeType: string
): { valid: boolean; error?: string; detectedMimeType?: string } {
  if (buffer.length === 0) {
    return { valid: false, error: "Archivo vacío" }
  }

  const signatures = FILE_SIGNATURES[declaredMimeType]
  if (!signatures) {
    return { valid: false, error: `Tipo MIME no reconocido: ${declaredMimeType}` }
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
      return { valid: true, detectedMimeType: declaredMimeType }
    }
  }

  // Try to detect actual type
  const detected = detectMimeTypeFromSignature(buffer)
  return {
    valid: false,
    error: `Firma de archivo no coincide con tipo declarado. Tipo detectado: ${detected || "desconocido"}`,
    detectedMimeType: detected,
  }
}

function detectMimeTypeFromSignature(buffer: Buffer): string | null {
  for (const [mimeType, signatures] of Object.entries(FILE_SIGNATURES)) {
    for (const signature of signatures) {
      if (buffer.length < signature.length) continue
      const matches = signature.every((byte, index) => buffer[index] === byte)
      if (matches) {
        // Special WebP check
        if (mimeType === "image/webp" && buffer.length >= 12) {
          const webpCheck = buffer.slice(8, 12).toString("ascii")
          if (webpCheck === "WEBP") return mimeType
        } else {
          return mimeType
        }
      }
    }
  }
  return null
}
```

### 4.2 Error Message Consistency

**Standardized Messages:**

```typescript
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: (sizeMB: number) =>
    `El archivo es demasiado grande (${sizeMB.toFixed(2)} MB). El tamaño máximo permitido es ${MAX_FILE_SIZE_MB}MB.`,
  INVALID_FILE_TYPE: (type: string) =>
    `Tipo de archivo no permitido: ${type}. Solo se permiten imágenes (JPEG, PNG, GIF, WebP, DICOM) y PDFs.`,
  INVALID_EXTENSION: (ext: string) =>
    `Extensión de archivo no permitida: ${ext}. Solo se permiten: ${ALLOWED_EXTENSIONS.join(", ")}`,
  INVALID_SIGNATURE: (detected?: string) =>
    detected
      ? `El contenido del archivo no coincide con su tipo. Tipo detectado: ${detected}`
      : `El contenido del archivo no es válido o está corrupto.`,
  EMPTY_FILE: "El archivo está vacío.",
} as const
```

### 4.3 Performance Considerations

1. **File Buffer Reading**
   - Only read first 12 bytes for signature validation (sufficient for all types)
   - Don't load entire file into memory for large files
   - Use streams if file size validation requires full read

2. **Validation Order**
   - Check size first (fastest)
   - Then MIME type (fast)
   - Then extension (fast)
   - Finally signature (requires buffer read, slowest)

3. **Caching**
   - Validation results shouldn't be cached (files change)
   - But validation functions themselves are pure and can be optimized

### 4.4 Avoiding Client-Side Trust

**Key Principle**: Never trust client-provided data.

**Implementation:**
1. Always validate file size from actual file, not `Content-Length` header
2. Always validate MIME type from file signature, not `Content-Type` header
3. Always validate extension from filename, but don't rely on it alone
4. Cross-validate: MIME type, extension, and signature should all match

**Example:**
```typescript
// BAD: Trusts client
if (req.headers["content-type"] === "image/jpeg") {
  // Accept file
}

// GOOD: Validates actual content
const buffer = Buffer.from(await file.arrayBuffer())
const signature = buffer.slice(0, 3)
if (signature[0] === 0xFF && signature[1] === 0xD8 && signature[2] === 0xFF) {
  // Valid JPEG signature
}
```

### 4.5 Code Organization

**File Structure:**
```
src/lib/validation/
  ├── file-validation.ts          # Shared constants and frontend/backend validation
  ├── file-validation-server.ts    # Server-specific utilities (magic numbers)
  ├── validation-errors.ts         # Error types and creation functions
  └── middleware.ts                # Optional validation middleware
```

**Import Pattern:**
```typescript
// Frontend
import { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES, validateFile } from "@/lib/validation/file-validation"

// Backend
import { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES, validateFile } from "@/lib/validation/file-validation"
import { validateFileSignature } from "@/lib/validation/file-validation-server"
```

---

## 5. Implementation Checklist

### Phase 1: Discovery & Constraints ✅
- [x] Document allowed types and size limits
- [x] Identify library limitations

### Phase 2: Create Shared Validation Utilities
- [ ] Create `src/lib/validation/file-validation.ts`
- [ ] Implement `validateFileSize()`
- [ ] Implement `validateMimeType()`
- [ ] Implement `validateFileExtension()`
- [ ] Create `src/lib/validation/file-validation-server.ts`
- [ ] Implement `validateFileSignature()`
- [ ] Implement `detectMimeTypeFromSignature()`
- [ ] Create `src/lib/validation/validation-errors.ts`
- [ ] Export all constants and functions

### Phase 3: Frontend Validation Enhancement
- [ ] Update `AttachmentUploadDialog.tsx`:
  - [ ] Import shared constants
  - [ ] Replace local constants
  - [ ] Enhance `handleFileSelect()` validation
  - [ ] Add extension validation
  - [ ] Improve error messages
  - [ ] Update UI text (10MB limit)
- [ ] Update `AdjuntosDropzone.tsx`:
  - [ ] Import shared constants
  - [ ] Replace local constants
  - [ ] Update validation function
- [ ] Update `AdjuntosModule.tsx`:
  - [ ] Import shared constants
  - [ ] Replace local constants
  - [ ] Update UI text

### Phase 4: Backend Validation Implementation
- [ ] Update `/api/uploads/sign/route.ts`:
  - [ ] Add file metadata to request schema
  - [ ] Add pre-validation before signature generation
  - [ ] Return appropriate error codes
- [ ] Update `/api/pacientes/[id]/adjuntos/upload/route.ts`:
  - [ ] Add file validation after FormData parsing
  - [ ] Validate size, MIME type, extension, signature
  - [ ] Return errors before Cloudinary upload
- [ ] Update `/api/adjuntos/route.ts`:
  - [ ] Add metadata validation
  - [ ] Validate bytes, format, filename
  - [ ] Cross-validate consistency
- [ ] Update `/api/pacientes/[id]/adjuntos/route.ts`:
  - [ ] Apply same validation as `/api/adjuntos/route.ts`

### Phase 5: Consistency & Reuse
- [ ] Standardize error response format
- [ ] Update frontend to send file metadata to `/api/uploads/sign`
- [ ] Create validation middleware (optional)
- [ ] Ensure all endpoints use shared constants

### Phase 6: Testing
- [ ] Frontend manual tests (all test cases)
- [ ] Backend manual tests (all test cases)
- [ ] Edge case tests
- [ ] Security tests
- [ ] Integration tests (if test framework available)
- [ ] Update documentation with new limits

---

## 6. Risk Assessment & Mitigation

### Risks

1. **Breaking Existing Uploads**
   - **Risk**: Files currently uploaded may not pass new validation
   - **Mitigation**: New validation only applies to new uploads. Existing files remain valid.

2. **Performance Impact**
   - **Risk**: File signature validation adds overhead
   - **Mitigation**: Only read first 12 bytes, minimal performance impact

3. **False Positives**
   - **Risk**: Valid files may be rejected due to strict validation
   - **Mitigation**: Test thoroughly with real medical images and PDFs

4. **User Experience**
   - **Risk**: Users may be frustrated by stricter validation
   - **Mitigation**: Clear error messages, frontend validation prevents most issues

### Rollback Plan

If issues arise:
1. Validation can be temporarily disabled via feature flag
2. Size limit can be increased if needed (but maintain validation)
3. Additional file types can be added if legitimate use cases arise

---

## 7. Future Enhancements

1. **Virus Scanning**: Integrate virus scanning service for uploaded files
2. **Image Processing**: Validate image dimensions, aspect ratios
3. **PDF Validation**: Validate PDF structure, page count
4. **Rate Limiting**: Add upload rate limits per user
5. **File Quarantine**: Quarantine suspicious files for manual review
6. **Audit Logging**: Log all validation failures for security analysis

---

## Conclusion

This plan provides a comprehensive, security-focused approach to file validation. By implementing validation at multiple layers (frontend, backend pre-upload, backend post-upload), we ensure both good user experience and strong security.

The phased approach allows for incremental implementation and testing, reducing risk and ensuring quality at each step.

**Estimated Implementation Time**: 6-8 hours
- Phase 2: 2 hours (shared utilities)
- Phase 3: 1.5 hours (frontend updates)
- Phase 4: 2.5 hours (backend validation)
- Phase 5: 0.5 hours (consistency)
- Phase 6: 1.5 hours (testing)

**Priority**: High (security vulnerability)

**Dependencies**: None (uses native Node.js and browser APIs)

