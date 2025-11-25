# Audit Trail Implementation Plan for Attachments and Consents

## Executive Summary

This document provides a comprehensive, step-by-step plan for implementing complete audit logging for attachment and consent operations in the Chomyn Odonto medical/appointments system. The plan ensures all critical operations are tracked with proper context, user identification, and metadata while maintaining security and compliance standards.

**Key Requirements:**
- Audit all attachment creation and deletion operations
- Audit all consent creation and revocation operations
- Track who performed each action, when, and what changed
- Maintain consistency with existing audit infrastructure
- Ensure audit logs are written only after successful operations

---

## 1. Current Flow Analysis

### 1.1 Attachment Operations Flow

#### **Attachment Creation**

**Current Flow:**
1. User selects file in `AttachmentUploadDialog.tsx` or `AdjuntosModule.tsx`
2. Frontend validates file (size, type, extension)
3. Frontend calls `POST /api/uploads/sign` to get Cloudinary signature
4. Frontend uploads file directly to Cloudinary
5. Frontend calls one of these endpoints to create database record:
   - `POST /api/adjuntos/route.ts` (line 33-61) - **TODO: Audit missing**
   - `POST /api/pacientes/[id]/adjuntos/route.ts` (line 425-565) - **Audit missing**
   - `POST /api/pacientes/[id]/adjuntos/upload/route.ts` - **Audit missing**
   - `POST /api/agenda/citas/[id]/consulta/adjuntos/route.ts` (line 93-268) - **Audit missing**

**Available Data at Creation:**
- `userId` - from session (via `requireRole` or `auth()`)
- `pacienteId` - from route params or request body
- `consultaId` - from route params (for consultation attachments)
- `procedimientoId` - from request body (optional)
- File metadata: `publicId`, `secureUrl`, `format`, `bytes`, `width`, `height`, `originalFilename`, `tipo`, `descripcion`
- Request context: `req.url`, `req.headers` (for IP, user-agent)

**Audit Points:**
- ✅ After successful `prisma.adjunto.create()` in each endpoint
- ❌ Currently: Only `/api/adjuntos/route.ts` has a TODO comment (line 59)

#### **Attachment Deletion**

**Current Flow:**
1. User triggers deletion from UI (e.g., `AttachmentUploadDialog`, `AttachmentsGallery`)
2. Frontend calls `DELETE /api/pacientes/[id]/adjuntos/route.ts?attachmentId={id}` (line 568-624)
3. Backend performs soft delete: `prisma.adjunto.update({ isActive: false })`

**Available Data at Deletion:**
- `userId` - from session (needs to be extracted)
- `pacienteId` - from route params
- `adjuntoId` - from query params
- Attachment metadata before deletion (from `findFirst` query)
- Request context: `req.url`, `req.headers`

**Audit Points:**
- ✅ After successful soft delete
- ❌ Currently: **NO audit logging**

### 1.2 Consent Operations Flow

#### **Consent Creation**

**Current Flow:**
1. User uploads consent via `UploadConsentDialog.tsx`
2. Frontend calls `POST /api/uploads/sign` to get Cloudinary signature
3. Frontend uploads file to Cloudinary
4. Frontend calls `POST /api/pacientes/[id]/consentimiento/route.ts` (line 56-108)
5. Backend calls `crearConsentimiento()` service (line 40-209 in `_service.ts`)
6. Service creates consent in transaction and **already has audit logging** (line 188-203)

**Available Data at Creation:**
- `userId` - from `gate.userId` (via `requireRole`)
- `pacienteId` - from route params
- `citaId` - from request body (optional, for surgery consents)
- Consent metadata: `tipo`, `responsablePersonaId`, `firmadoEn`, `vigenciaEnMeses`, `cloudinary` data
- Request context: available via `req`

**Audit Points:**
- ✅ Already implemented in transaction (line 188-203 in `_service.ts`)
- ⚠️ **Issue**: Uses hardcoded action string `"CONSENTIMIENTO_CREATE"` instead of `AuditAction` constant

#### **Consent Revocation (Deactivation)**

**Current Flow:**
1. User revokes consent (likely from admin interface)
2. Frontend calls `DELETE /api/pacientes/[id]/consentimiento/[consentimientoId]/route.ts` (line 37-79)
3. Backend calls `revocarConsentimiento()` service (line 240-273 in `_service.ts`)
4. Service performs soft delete in transaction and **already has audit logging** (line 259-271)

**Available Data at Revocation:**
- `userId` - from `gate.userId`
- `consentimientoId` - from route params
- `reason` - from request body
- Consent metadata before revocation (from `obtenerConsentimiento`)
- Request context: available via `req`

**Audit Points:**
- ✅ Already implemented in transaction (line 259-271 in `_service.ts`)
- ⚠️ **Issue**: Uses hardcoded action string `"CONSENTIMIENTO_REVOKE"` instead of `AuditAction` constant

#### **Consent Updates**

**Current Analysis:**
- ❌ **No update endpoint found** - Consents appear to be immutable
- If updates are added in the future, they should follow the same pattern as revocation

---

## 2. Audit Model & Event Design

### 2.1 Standard Audit Event Schema

The existing `writeAudit` function signature:
```typescript
writeAudit({
  actorId: number           // User ID who performed the action
  action: string            // Action type (should use AuditAction constants)
  entity: string            // Entity type (should use AuditEntity constants)
  entityId: number          // ID of the affected entity
  metadata?: Record<string, unknown>  // Additional context
  headers?: Headers         // Request headers (for IP, user-agent)
  path?: string             // API path
  ip?: string              // Override IP if needed
})
```

### 2.2 Proposed Audit Actions

**Add to `src/lib/audit/actions.ts`:**

```typescript
export const AuditAction = {
  // ... existing actions ...
  
  // Attachment Operations
  ADJUNTO_CREATE: "ADJUNTO_CREATE",
  ADJUNTO_DELETE: "ADJUNTO_DELETE",
  
  // Consent Operations (update existing)
  CONSENTIMIENTO_CREATE: "CONSENTIMIENTO_CREATE",  // Already exists implicitly
  CONSENTIMIENTO_REVOKE: "CONSENTIMIENTO_REVOKE",    // Already exists implicitly
  CONSENTIMIENTO_UPDATE: "CONSENTIMIENTO_UPDATE",    // For future use
} as const
```

### 2.3 Proposed Audit Entities

**Add to `src/lib/audit/actions.ts`:**

```typescript
export const AuditEntity = {
  // ... existing entities ...
  
  Adjunto: "Adjunto",
  Consentimiento: "Consentimiento",
} as const
```

### 2.4 Metadata Structure Design

#### **Attachment Creation Metadata:**
```typescript
{
  pacienteId: number
  consultaId?: number | null
  procedimientoId?: number | null
  tipo: string                    // AdjuntoTipo enum value
  format?: string | null          // File format (jpg, pdf, etc.)
  bytes: number                    // File size in bytes
  originalFilename?: string | null
  publicId: string                // Cloudinary public ID
  accessMode: "PUBLIC" | "AUTHENTICATED"
  descripcion?: string | null
  // Context
  source: "patient" | "consultation" | "procedure" | "general"
  path: string                    // API endpoint path
}
```

#### **Attachment Deletion Metadata:**
```typescript
{
  pacienteId: number
  consultaId?: number | null
  procedimientoId?: number | null
  tipo: string                    // AdjuntoTipo before deletion
  format?: string | null
  bytes: number                    // File size before deletion
  originalFilename?: string | null
  publicId: string                // Cloudinary public ID (for reference)
  deletedAt: string               // ISO timestamp
  // Context
  source: "patient" | "consultation" | "procedure" | "general"
  path: string
}
```

#### **Consent Creation Metadata (Already Implemented):**
```typescript
{
  pacienteId: number
  tipo: string                    // ConsentType enum
  responsablePersonaId: number
  vigenciaEnMeses?: number | null
  citaId?: number | null          // For surgery consents
  // Note: Cloudinary data not included (already in consent record)
}
```

#### **Consent Revocation Metadata (Already Implemented):**
```typescript
{
  reason: string                  // Revocation reason
  revokedAt: string              // ISO timestamp
  // Note: Should also include pacienteId and tipo for easier querying
}
```

### 2.5 Change Representation Strategy

**For Attachments:**
- **Creation**: Log full metadata snapshot (no "before" state)
- **Deletion**: Log metadata snapshot before deletion (no "after" state)
- **Future Updates**: If added, log field-level diffs (e.g., `{ descripcion: { before: "...", after: "..." } }`)

**For Consents:**
- **Creation**: Already logs full metadata snapshot ✅
- **Revocation**: Already logs reason and timestamp ✅
- **Future Updates**: If added, log field-level diffs

**Best Practices:**
- ✅ Log IDs and references, not full file contents
- ✅ Log metadata (size, type, filename) but not file data
- ✅ Include related entity IDs (pacienteId, consultaId) for easy querying
- ✅ Include source/context to identify where action originated

---

## 3. Backend Implementation Plan

### 3.1 Phase 1: Update Audit Constants

**File: `src/lib/audit/actions.ts`**

```typescript
export const AuditAction = {
  // ... existing actions ...
  
  // Attachment Operations
  ADJUNTO_CREATE: "ADJUNTO_CREATE",
  ADJUNTO_DELETE: "ADJUNTO_DELETE",
  
  // Consent Operations
  CONSENTIMIENTO_CREATE: "CONSENTIMIENTO_CREATE",
  CONSENTIMIENTO_REVOKE: "CONSENTIMIENTO_REVOKE",
  CONSENTIMIENTO_UPDATE: "CONSENTIMIENTO_UPDATE",  // For future use
} as const

export const AuditEntity = {
  // ... existing entities ...
  
  Adjunto: "Adjunto",
  Consentimiento: "Consentimiento",
} as const
```

### 3.2 Phase 2: Create Audit Helper Functions

**File: `src/lib/audit/attachments.ts` (NEW)**

```typescript
// src/lib/audit/attachments.ts
import { safeAuditWrite } from "./log"
import { AuditAction, AuditEntity } from "./actions"
import type { AdjuntoTipo, AccessMode } from "@prisma/client"

/**
 * Audit metadata for attachment creation
 */
export interface AttachmentCreateAuditMetadata {
  pacienteId: number
  consultaId?: number | null
  procedimientoId?: number | null
  tipo: AdjuntoTipo
  format?: string | null
  bytes: number
  originalFilename?: string | null
  publicId: string
  accessMode: AccessMode
  descripcion?: string | null
  source: "patient" | "consultation" | "procedure" | "general"
  path?: string
}

/**
 * Audit metadata for attachment deletion
 */
export interface AttachmentDeleteAuditMetadata {
  pacienteId: number
  consultaId?: number | null
  procedimientoId?: number | null
  tipo: AdjuntoTipo
  format?: string | null
  bytes: number
  originalFilename?: string | null
  publicId: string
  deletedAt: string
  source: "patient" | "consultation" | "procedure" | "general"
  path?: string
}

/**
 * Logs audit entry for attachment creation
 */
export async function auditAttachmentCreate(args: {
  actorId: number
  entityId: number
  metadata: AttachmentCreateAuditMetadata
  headers?: Headers
  path?: string
}) {
  await safeAuditWrite({
    actorId: args.actorId,
    action: AuditAction.ADJUNTO_CREATE,
    entity: AuditEntity.Adjunto,
    entityId: args.entityId,
    metadata: args.metadata,
    headers: args.headers,
    path: args.path,
  })
}

/**
 * Logs audit entry for attachment deletion
 */
export async function auditAttachmentDelete(args: {
  actorId: number
  entityId: number
  metadata: AttachmentDeleteAuditMetadata
  headers?: Headers
  path?: string
}) {
  await safeAuditWrite({
    actorId: args.actorId,
    action: AuditAction.ADJUNTO_DELETE,
    entity: AuditEntity.Adjunto,
    entityId: args.entityId,
    metadata: args.metadata,
    headers: args.headers,
    path: args.path,
  })
}
```

**File: `src/lib/audit/consents.ts` (NEW)**

```typescript
// src/lib/audit/consents.ts
import { safeAuditWrite } from "./log"
import { AuditAction, AuditEntity } from "./actions"

/**
 * Audit metadata for consent creation
 */
export interface ConsentCreateAuditMetadata {
  pacienteId: number
  tipo: string
  responsablePersonaId: number
  vigenciaEnMeses?: number | null
  citaId?: number | null
  path?: string
}

/**
 * Audit metadata for consent revocation
 */
export interface ConsentRevokeAuditMetadata {
  pacienteId: number
  tipo: string
  reason: string
  revokedAt: string
  citaId?: number | null
  path?: string
}

/**
 * Logs audit entry for consent creation
 */
export async function auditConsentCreate(args: {
  actorId: number
  entityId: number
  metadata: ConsentCreateAuditMetadata
  headers?: Headers
  path?: string
}) {
  await safeAuditWrite({
    actorId: args.actorId,
    action: AuditAction.CONSENTIMIENTO_CREATE,
    entity: AuditEntity.Consentimiento,
    entityId: args.entityId,
    metadata: args.metadata,
    headers: args.headers,
    path: args.path,
  })
}

/**
 * Logs audit entry for consent revocation
 */
export async function auditConsentRevoke(args: {
  actorId: number
  entityId: number
  metadata: ConsentRevokeAuditMetadata
  headers?: Headers
  path?: string
}) {
  await safeAuditWrite({
    actorId: args.actorId,
    action: AuditAction.CONSENTIMIENTO_REVOKE,
    entity: AuditEntity.Consentimiento,
    entityId: args.entityId,
    metadata: args.metadata,
    headers: args.headers,
    path: args.path,
  })
}
```

### 3.3 Phase 3: Implement Audit Logging in Attachment Endpoints

#### **3.3.1 `/api/adjuntos/route.ts` - POST Handler**

**Current State:** Line 59 has TODO comment

**Implementation:**

```typescript
// Add import at top
import { auditAttachmentCreate } from "@/lib/audit/attachments"
import { auth } from "@/auth"

// In POST handler, after line 58 (after adjunto creation):
export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  
  // ... existing validation ...
  
  const userId = session.user.id ? Number.parseInt(session.user.id, 10) : 1
  const created = await db.adjunto.create({
    // ... existing data ...
  })

  // Audit logging - AFTER successful creation
  try {
    await auditAttachmentCreate({
      actorId: userId,
      entityId: created.idAdjunto,
      metadata: {
        pacienteId: data.pacienteId ?? 0, // Handle optional
        consultaId: null,
        procedimientoId: data.procedimientoId ?? null,
        tipo: data.tipo as AdjuntoTipo,
        format: data.format ?? null,
        bytes: data.bytes,
        originalFilename: data.originalFilename ?? null,
        publicId: data.publicId,
        accessMode: (data.accessMode || "AUTHENTICATED") as AccessMode,
        descripcion: data.descripcion ?? null,
        source: data.procedimientoId ? "procedure" : data.pacienteId ? "patient" : "general",
        path: req.url,
      },
      headers: req.headers,
      path: req.url,
    })
  } catch (auditError) {
    // Log error but don't fail the request
    console.error("[audit] Failed to log attachment creation:", auditError)
  }

  return NextResponse.json({ ok: true, adjunto: created })
}
```

#### **3.3.2 `/api/pacientes/[id]/adjuntos/route.ts` - POST Handler**

**Current State:** No audit logging

**Implementation:**

```typescript
// Add import at top
import { auditAttachmentCreate } from "@/lib/audit/attachments"
import { requireRole } from "@/app/api/pacientes/_rbac"

// In POST handler, after line 512 (after adjunto creation):
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const pacienteId = Number.parseInt(id)
    
    // Get user ID from session (need to add auth check)
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }
    const userId = Number.parseInt(session.user.id, 10)

    // ... existing validation and creation ...

    const adjunto = await prisma.adjunto.create({
      // ... existing data ...
      uploadedByUserId: userId, // Fix: Use actual userId instead of hardcoded 1
    })

    // Audit logging - AFTER successful creation
    try {
      await auditAttachmentCreate({
        actorId: userId,
        entityId: adjunto.idAdjunto,
        metadata: {
          pacienteId,
          consultaId: null,
          procedimientoId: null,
          tipo: adjunto.tipo,
          format: adjunto.format ?? null,
          bytes: adjunto.bytes,
          originalFilename: adjunto.originalFilename ?? null,
          publicId: adjunto.publicId,
          accessMode: adjunto.accessMode,
          descripcion: adjunto.descripcion ?? null,
          source: "patient",
          path: req.url,
        },
        headers: req.headers,
        path: req.url,
      })
    } catch (auditError) {
      console.error("[audit] Failed to log attachment creation:", auditError)
    }

    // ... rest of handler ...
  } catch (error) {
    // ... existing error handling ...
  }
}
```

#### **3.3.3 `/api/pacientes/[id]/adjuntos/route.ts` - DELETE Handler**

**Current State:** No audit logging (CRITICAL MISSING)

**Implementation:**

```typescript
// Add import at top
import { auditAttachmentDelete } from "@/lib/audit/attachments"
import { auth } from "@/auth"

// In DELETE handler, after line 596 (after finding adjunto, before deletion):
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const pacienteId = Number.parseInt(id)
    
    // Get user ID from session
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }
    const userId = Number.parseInt(session.user.id, 10)

    // ... existing validation ...

    // Verify attachment exists and belongs to patient
    const adjunto = await prisma.adjunto.findFirst({
      where: {
        idAdjunto: adjuntoId,
        pacienteId,
        isActive: true,
      },
      include: {
        consulta: {
          select: { citaId: true },
        },
        procedimiento: {
          select: { idConsultaProcedimiento: true },
        },
      },
    })

    if (!adjunto) {
      return NextResponse.json({ ok: false, error: "Adjunto no encontrado" }, { status: 404 })
    }

    // Store metadata BEFORE deletion for audit
    const auditMetadata = {
      pacienteId: adjunto.pacienteId,
      consultaId: adjunto.consultaId ?? null,
      procedimientoId: adjunto.procedimientoId ?? null,
      tipo: adjunto.tipo,
      format: adjunto.format ?? null,
      bytes: adjunto.bytes,
      originalFilename: adjunto.originalFilename ?? null,
      publicId: adjunto.publicId,
      deletedAt: new Date().toISOString(),
      source: adjunto.consultaId ? "consultation" : adjunto.procedimientoId ? "procedure" : "patient",
      path: req.url,
    }

    // Perform soft delete
    await prisma.adjunto.update({
      where: { idAdjunto: adjuntoId },
      data: { isActive: false },
    })

    // Audit logging - AFTER successful deletion
    try {
      await auditAttachmentDelete({
        actorId: userId,
        entityId: adjuntoId,
        metadata: auditMetadata,
        headers: req.headers,
        path: req.url,
      })
    } catch (auditError) {
      console.error("[audit] Failed to log attachment deletion:", auditError)
    }

    return NextResponse.json({ ok: true, message: "Adjunto eliminado correctamente" })
  } catch (error) {
    // ... existing error handling ...
  }
}
```

#### **3.3.4 `/api/pacientes/[id]/adjuntos/upload/route.ts` - POST Handler**

**Current State:** No audit logging

**Implementation:**

```typescript
// Add import at top
import { auditAttachmentCreate } from "@/lib/audit/attachments"

// In POST handler, after successful adjunto creation:
// (Similar pattern to above, determine source based on context)
```

#### **3.3.5 `/api/agenda/citas/[id]/consulta/adjuntos/route.ts` - POST Handler**

**Current State:** No audit logging

**Implementation:**

```typescript
// Add import at top
import { auditAttachmentCreate } from "@/lib/audit/attachments"

// In POST handler, after line 177 or 237 (after adjunto creation):
// Audit logging for both code paths (when consulta exists and when it's created)

try {
  await auditAttachmentCreate({
    actorId: userId,
    entityId: adjunto.idAdjunto,
    metadata: {
      pacienteId: consulta.cita.pacienteId, // or nuevaConsulta.cita.pacienteId
      consultaId: citaId,
      procedimientoId: null,
      tipo: adjunto.tipo,
      format: adjunto.format ?? null,
      bytes: adjunto.bytes,
      originalFilename: adjunto.originalFilename ?? null,
      publicId: adjunto.publicId,
      accessMode: adjunto.accessMode,
      descripcion: adjunto.descripcion ?? null,
      source: "consultation",
      path: req.url,
    },
    headers: req.headers,
    path: req.url,
  })
} catch (auditError) {
  console.error("[audit] Failed to log attachment creation:", auditError)
}
```

### 3.4 Phase 4: Update Consent Audit Logging

#### **3.4.1 `/api/pacientes/[id]/consentimiento/_service.ts` - Update crearConsentimiento**

**Current State:** Uses hardcoded action string

**Implementation:**

```typescript
// Add import at top
import { auditConsentCreate } from "@/lib/audit/consents"

// Replace lines 188-203 with:
// Audit log
await auditConsentCreate({
  actorId: userId,
  entityId: consentimiento.idConsentimiento,
  metadata: {
    pacienteId,
    tipo: body.tipo,
    responsablePersonaId: body.responsablePersonaId,
    vigenciaEnMeses: body.vigenciaEnMeses ?? null,
    citaId: body.citaId ?? null,
  },
  // Note: headers and path not available in service layer
  // Consider passing them from route handler if needed
})
```

**Alternative:** Keep transaction-based audit but use constants:

```typescript
import { AuditAction, AuditEntity } from "@/lib/audit/actions"

// In transaction, replace line 192-193:
action: AuditAction.CONSENTIMIENTO_CREATE,
entity: AuditEntity.Consentimiento,
```

#### **3.4.2 `/api/pacientes/[id]/consentimiento/_service.ts` - Update revocarConsentimiento**

**Current State:** Uses hardcoded action string, missing pacienteId and tipo in metadata

**Implementation:**

```typescript
// Add import at top
import { auditConsentRevoke } from "@/lib/audit/consents"

// Replace lines 256-272 with:
await prisma.$transaction(async (tx) => {
  await consentimientoRepo.revocar(tx, idConsentimiento, reason)

  // Audit log - include pacienteId and tipo for easier querying
  await auditConsentRevoke({
    actorId: userId,
    entityId: idConsentimiento,
    metadata: {
      pacienteId: consentimiento.Paciente_idPaciente,
      tipo: consentimiento.tipo,
      reason,
      revokedAt: new Date().toISOString(),
      citaId: consentimiento.Cita_idCita ?? null,
    },
  })
})
```

**Alternative:** Keep transaction-based audit but use constants and improve metadata:

```typescript
import { AuditAction, AuditEntity } from "@/lib/audit/actions"

// In transaction, replace lines 260-271:
await tx.auditLog.create({
  data: {
    actorId: userId,
    action: AuditAction.CONSENTIMIENTO_REVOKE,
    entity: AuditEntity.Consentimiento,
    entityId: idConsentimiento,
    metadata: {
      pacienteId: consentimiento.Paciente_idPaciente,
      tipo: consentimiento.tipo,
      reason,
      revokedAt: new Date().toISOString(),
      citaId: consentimiento.Cita_idCita ?? null,
    },
  },
})
```

---

## 4. Frontend Considerations

### 4.1 No Required Changes

The frontend does **not** need changes for basic audit logging because:
- ✅ User identity is already available server-side via `auth()` and `requireRole()`
- ✅ Request context (IP, user-agent, path) is automatically extracted from headers
- ✅ Related entity IDs (pacienteId, consultaId) are already passed in API calls

### 4.2 Optional Enhancements

**If you want to track UI context:**

1. **Add optional `source` query parameter or header:**
   ```typescript
   // In AttachmentUploadDialog.tsx
   const response = await fetch(`/api/pacientes/${pacienteId}/adjuntos`, {
     method: "POST",
     headers: {
       "Content-Type": "application/json",
       "X-UI-Source": "AttachmentUploadDialog", // Optional
     },
     body: JSON.stringify({ ... }),
   })
   ```

2. **Backend can extract and include in audit metadata:**
   ```typescript
   const uiSource = req.headers.get("X-UI-Source") ?? undefined
   metadata: {
     ...existingMetadata,
     uiSource, // Optional context
   }
   ```

**Recommendation:** Start without UI context tracking. Add it later if needed for specific use cases.

### 4.3 User Session Validation

**Ensure all endpoints validate user session:**

- ✅ `/api/adjuntos/route.ts` - Uses `auth()` ✅
- ⚠️ `/api/pacientes/[id]/adjuntos/route.ts` - Needs session check added
- ⚠️ `/api/pacientes/[id]/adjuntos/upload/route.ts` - Needs session check added
- ✅ `/api/agenda/citas/[id]/consulta/adjuntos/route.ts` - Uses `auth()` ✅
- ✅ Consent endpoints - Use `requireRole()` ✅

---

## 5. Best Practices & Consistency

### 5.1 Shared Utilities

**Created Files:**
- ✅ `src/lib/audit/attachments.ts` - Centralized attachment audit helpers
- ✅ `src/lib/audit/consents.ts` - Centralized consent audit helpers

**Benefits:**
- Consistent metadata structure across all endpoints
- Easy to update audit format in one place
- Type-safe metadata interfaces
- Reusable helper functions

### 5.2 Audit Logging Best Practices

1. **Always use `safeAuditWrite` or helper functions:**
   - Prevents audit failures from breaking main operations
   - Logs errors for debugging

2. **Log AFTER successful operations:**
   - Don't log if database operation fails
   - Use try-catch around audit calls

3. **Include related entity IDs:**
   - Makes queries easier (e.g., "all attachments for patient X")
   - Enables cross-entity audit trails

4. **Use constants for actions and entities:**
   - Prevents typos
   - Enables type checking
   - Makes refactoring easier

5. **Don't log sensitive data:**
   - ✅ Log file metadata (size, type, filename)
   - ❌ Don't log file contents
   - ✅ Log consent metadata
   - ❌ Don't log full consent document content

### 5.3 Consistency Checklist

- [ ] All attachment creation endpoints use `auditAttachmentCreate()`
- [ ] All attachment deletion endpoints use `auditAttachmentDelete()`
- [ ] All consent operations use `AuditAction` and `AuditEntity` constants
- [ ] All audit calls happen AFTER successful database operations
- [ ] All audit calls are wrapped in try-catch
- [ ] All endpoints extract userId from session correctly
- [ ] All metadata includes related entity IDs (pacienteId, consultaId, etc.)

---

## 6. Testing Strategy

### 6.1 Automated Tests

#### **Unit Tests for Audit Helpers**

**File: `src/lib/audit/__tests__/attachments.test.ts`**

```typescript
import { auditAttachmentCreate, auditAttachmentDelete } from "../attachments"
import { safeAuditWrite } from "../log"
import { AuditAction, AuditEntity } from "../actions"

jest.mock("../log")

describe("auditAttachmentCreate", () => {
  it("should call safeAuditWrite with correct parameters", async () => {
    const mockMetadata = {
      pacienteId: 1,
      tipo: "IMAGE" as const,
      bytes: 1024,
      publicId: "test/public-id",
      accessMode: "AUTHENTICATED" as const,
      source: "patient" as const,
    }

    await auditAttachmentCreate({
      actorId: 100,
      entityId: 50,
      metadata: mockMetadata,
    })

    expect(safeAuditWrite).toHaveBeenCalledWith({
      actorId: 100,
      action: AuditAction.ADJUNTO_CREATE,
      entity: AuditEntity.Adjunto,
      entityId: 50,
      metadata: mockMetadata,
      headers: undefined,
      path: undefined,
    })
  })
})
```

#### **Integration Tests for API Endpoints**

**File: `src/app/api/pacientes/[id]/adjuntos/__tests__/route.test.ts`**

```typescript
import { POST, DELETE } from "../route"
import { auditAttachmentCreate, auditAttachmentDelete } from "@/lib/audit/attachments"

jest.mock("@/lib/audit/attachments")

describe("POST /api/pacientes/[id]/adjuntos", () => {
  it("should create audit log after successful attachment creation", async () => {
    // Setup: Mock auth, prisma, etc.
    // Execute: Call POST handler
    // Assert: auditAttachmentCreate called with correct params
  })

  it("should not create audit log if attachment creation fails", async () => {
    // Setup: Mock prisma to throw error
    // Execute: Call POST handler
    // Assert: auditAttachmentCreate NOT called
  })
})

describe("DELETE /api/pacientes/[id]/adjuntos", () => {
  it("should create audit log after successful deletion", async () => {
    // Setup: Mock auth, prisma, existing attachment
    // Execute: Call DELETE handler
    // Assert: auditAttachmentDelete called with correct params including metadata
  })

  it("should not create audit log if deletion fails", async () => {
    // Setup: Mock prisma to throw error
    // Execute: Call DELETE handler
    // Assert: auditAttachmentDelete NOT called
  })
})
```

### 6.2 Manual Verification Steps

#### **Test Case 1: Attachment Creation**

1. **Setup:**
   - Login as user (e.g., ODONT role)
   - Navigate to patient detail page

2. **Action:**
   - Upload an attachment via `AttachmentUploadDialog`
   - Verify upload succeeds

3. **Verification:**
   ```sql
   SELECT * FROM audit_logs 
   WHERE entity = 'Adjunto' 
   AND action = 'ADJUNTO_CREATE'
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   - ✅ Check `actorId` matches logged-in user
   - ✅ Check `entityId` matches created attachment ID
   - ✅ Check `metadata.pacienteId` matches patient
   - ✅ Check `metadata` includes file metadata (size, type, filename)
   - ✅ Check `metadata.source` is "patient"
   - ✅ Check `ip` and `metadata.userAgent` are populated

#### **Test Case 2: Attachment Deletion**

1. **Setup:**
   - Login as user
   - Have an existing attachment

2. **Action:**
   - Delete attachment from UI
   - Verify deletion succeeds

3. **Verification:**
   ```sql
   SELECT * FROM audit_logs 
   WHERE entity = 'Adjunto' 
   AND action = 'ADJUNTO_DELETE'
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   - ✅ Check `actorId` matches logged-in user
   - ✅ Check `entityId` matches deleted attachment ID
   - ✅ Check `metadata` includes attachment metadata BEFORE deletion
   - ✅ Check `metadata.deletedAt` is recent timestamp
   - ✅ Check attachment record has `isActive = false`

#### **Test Case 3: Consent Creation**

1. **Setup:**
   - Login as user
   - Navigate to patient with minor or surgery consent requirement

2. **Action:**
   - Upload consent via `UploadConsentDialog`
   - Verify upload succeeds

3. **Verification:**
   ```sql
   SELECT * FROM audit_logs 
   WHERE entity = 'Consentimiento' 
   AND action = 'CONSENTIMIENTO_CREATE'
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   - ✅ Check `actorId` matches logged-in user
   - ✅ Check `entityId` matches created consent ID
   - ✅ Check `metadata.pacienteId` matches patient
   - ✅ Check `metadata.tipo` is correct
   - ✅ Check `metadata.citaId` is set for surgery consents

#### **Test Case 4: Consent Revocation**

1. **Setup:**
   - Login as ADMIN or ODONT
   - Have an active consent

2. **Action:**
   - Revoke consent via API or UI
   - Verify revocation succeeds

3. **Verification:**
   ```sql
   SELECT * FROM audit_logs 
   WHERE entity = 'Consentimiento' 
   AND action = 'CONSENTIMIENTO_REVOKE'
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   - ✅ Check `actorId` matches logged-in user
   - ✅ Check `entityId` matches revoked consent ID
   - ✅ Check `metadata.reason` is populated
   - ✅ Check `metadata.revokedAt` is recent timestamp
   - ✅ Check consent record has `activo = false`

### 6.3 Failure Scenario Testing

#### **Test: Audit Failure Doesn't Break Operation**

1. **Setup:**
   - Mock `safeAuditWrite` to throw error

2. **Action:**
   - Create attachment or delete attachment

3. **Verification:**
   - ✅ Operation succeeds (attachment created/deleted)
   - ✅ Error logged to console
   - ✅ No exception thrown to user

#### **Test: Operation Failure Prevents Audit**

1. **Setup:**
   - Mock `prisma.adjunto.create()` to throw error

2. **Action:**
   - Attempt to create attachment

3. **Verification:**
   - ✅ Operation fails (expected)
   - ✅ Audit log NOT created
   - ✅ Error returned to user

---

## 7. Implementation Phases

### Phase 1: Foundation (1-2 hours)
- [ ] Add audit action and entity constants
- [ ] Create audit helper files (`attachments.ts`, `consents.ts`)
- [ ] Write unit tests for helpers

### Phase 2: Attachment Audit (2-3 hours)
- [ ] Implement audit in `/api/adjuntos/route.ts` POST
- [ ] Implement audit in `/api/pacientes/[id]/adjuntos/route.ts` POST
- [ ] Implement audit in `/api/pacientes/[id]/adjuntos/route.ts` DELETE ⚠️ **CRITICAL**
- [ ] Implement audit in `/api/pacientes/[id]/adjuntos/upload/route.ts` POST
- [ ] Implement audit in `/api/agenda/citas/[id]/consulta/adjuntos/route.ts` POST
- [ ] Fix hardcoded `uploadedByUserId: 1` in endpoints

### Phase 3: Consent Audit Updates (1 hour)
- [ ] Update `crearConsentimiento` to use constants
- [ ] Update `revocarConsentimiento` to use constants and improve metadata
- [ ] Verify existing audit logs are correct

### Phase 4: Testing & Verification (2-3 hours)
- [ ] Write integration tests
- [ ] Manual verification for all operations
- [ ] Verify audit logs in database
- [ ] Test failure scenarios

### Phase 5: Documentation (1 hour)
- [ ] Update API documentation
- [ ] Document audit log schema
- [ ] Create query examples for common audit scenarios

**Total Estimated Time: 7-10 hours**

---

## 8. Query Examples for Audit Logs

### Find all attachment operations for a patient:
```sql
SELECT * FROM audit_logs 
WHERE entity = 'Adjunto' 
AND metadata->>'pacienteId' = '123'
ORDER BY created_at DESC;
```

### Find who deleted a specific attachment:
```sql
SELECT 
  al.*,
  u.nombre_apellido as actor_name
FROM audit_logs al
JOIN usuarios u ON al.actor_id = u.id_usuario
WHERE al.entity = 'Adjunto'
AND al.action = 'ADJUNTO_DELETE'
AND al.entity_id = 456;
```

### Find all consent operations for a patient:
```sql
SELECT * FROM audit_logs 
WHERE entity = 'Consentimiento' 
AND metadata->>'pacienteId' = '123'
ORDER BY created_at DESC;
```

### Find all attachment deletions in last 30 days:
```sql
SELECT 
  al.*,
  u.nombre_apellido as actor_name
FROM audit_logs al
JOIN usuarios u ON al.actor_id = u.id_usuario
WHERE al.entity = 'Adjunto'
AND al.action = 'ADJUNTO_DELETE'
AND al.created_at >= NOW() - INTERVAL '30 days'
ORDER BY al.created_at DESC;
```

---

## 9. Summary

This plan provides:

✅ **Complete coverage** of all attachment and consent operations  
✅ **Consistent audit structure** using shared utilities  
✅ **Type-safe implementations** with TypeScript interfaces  
✅ **Failure-resistant** audit logging that doesn't break operations  
✅ **Comprehensive testing strategy** for verification  
✅ **Clear implementation phases** for step-by-step execution  

**Critical Missing Audits:**
1. ⚠️ Attachment deletion (`/api/pacientes/[id]/adjuntos` DELETE) - **MUST IMPLEMENT**
2. ⚠️ Attachment creation in multiple endpoints - **SHOULD IMPLEMENT**
3. ⚠️ Consent audit uses hardcoded strings - **SHOULD FIX**

**Next Steps:**
1. Review and approve this plan
2. Start with Phase 1 (foundation)
3. Implement Phase 2 (attachment audit) - highest priority
4. Complete remaining phases
5. Verify with testing

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Author:** Senior Full-Stack Engineer  
**Status:** Ready for Implementation

