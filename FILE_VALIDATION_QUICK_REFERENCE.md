# File Validation Quick Reference

## Constants

```typescript
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  // 10MB
MAX_FILE_SIZE_MB = 10

ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png", 
  "image/gif",
  "image/webp",
  "image/dicom",
  "application/pdf"
]

ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".dcm", ".pdf"]
```

## Validation Flow

```
Frontend (AttachmentUploadDialog)
  ↓ Validate: size, MIME type, extension
  ↓ Call: POST /api/uploads/sign (with file metadata)
  
Backend (/api/uploads/sign)
  ↓ Validate: fileSize, fileType, fileName
  ↓ Return: Cloudinary signature
  
Frontend
  ↓ Upload to Cloudinary
  
Backend (/api/adjuntos or /api/pacientes/[id]/adjuntos)
  ↓ Validate: bytes, format, originalFilename
  ↓ Validate: signature (if file buffer available)
  ↓ Create: database record
```

## Error Codes

- `FILE_TOO_LARGE`: File exceeds 10MB
- `INVALID_FILE_TYPE`: MIME type not allowed
- `INVALID_EXTENSION`: File extension not allowed
- `INVALID_SIGNATURE`: File signature doesn't match declared type
- `EMPTY_FILE`: File is empty (0 bytes)

## Magic Numbers (File Signatures)

- JPEG: `FF D8 FF`
- PNG: `89 50 4E 47 0D 0A 1A 0A`
- GIF: `47 49 46 38` (GIF8)
- WebP: `52 49 46 46` + `WEBP` (RIFF...WEBP)
- PDF: `25 50 44 46` (`%PDF`)

## Files to Update

### Frontend
- `src/components/pacientes/AttachmentUploadDialog.tsx`
- `src/components/pacientes/AdjuntosDropzone.tsx`
- `src/components/consulta-clinica/modules/AdjuntosModule.tsx`

### Backend
- `src/app/api/uploads/sign/route.ts`
- `src/app/api/adjuntos/route.ts`
- `src/app/api/pacientes/[id]/adjuntos/route.ts`
- `src/app/api/pacientes/[id]/adjuntos/upload/route.ts`

### New Files
- `src/lib/validation/file-validation.ts`
- `src/lib/validation/file-validation-server.ts`
- `src/lib/validation/validation-errors.ts`

## Testing Checklist

- [ ] Valid image < 10MB
- [ ] Valid PDF < 10MB
- [ ] File exactly 10MB (boundary)
- [ ] File > 10MB (reject)
- [ ] Invalid file type (.exe)
- [ ] MIME type mismatch (fake .jpg)
- [ ] Extension mismatch
- [ ] Empty file
- [ ] Network error handling

