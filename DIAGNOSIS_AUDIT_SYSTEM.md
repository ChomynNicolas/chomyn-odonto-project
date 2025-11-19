# Diagnosis Auditing System - Complete Implementation Guide

## Overview

This document describes the comprehensive auditing system implemented for patient diagnoses in the clinical application. The system provides complete traceability of all diagnosis-related operations, following best practices for medical/clinical systems, data integrity, and regulatory compliance.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Implementation Details](#implementation-details)
3. [Phased Implementation Plan](#phased-implementation-plan)
4. [Code Examples](#code-examples)
5. [Querying Audit History](#querying-audit-history)
6. [Best Practices & Security](#best-practices--security)
7. [Testing & Validation](#testing--validation)

---

## Architecture Overview

### High-Level Design

The auditing system follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (DiagnosticosModule)              │
│                    - User interactions                        │
│                    - Form validation                          │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Routes (Next.js)                       │
│                    - Request validation                       │
│                    - Business logic                           │
│                    - Audit logging integration                │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Audit Service Layer (lib/audit/diagnosis.ts)     │
│              - Specialized audit functions                    │
│              - Change tracking                                │
│              - Metadata formatting                            │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Core Audit Infrastructure (lib/audit/log.ts)     │
│              - writeAudit() function                          │
│              - Request context extraction                     │
│              - Safe error handling                            │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer (Prisma)                    │
│                    - AuditLog table                            │
│                    - DiagnosisStatusHistory table              │
│                    - PatientDiagnosis table                    │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Audit Actions** (`src/lib/audit/actions.ts`)
   - Defines all diagnosis-related audit actions
   - Provides type-safe action constants

2. **Diagnosis Audit Module** (`src/lib/audit/diagnosis.ts`)
   - Specialized audit functions for diagnosis operations
   - Field-level change tracking
   - Metadata formatting

3. **API Routes**
   - `POST /api/agenda/citas/[id]/consulta/diagnosticos` - Create diagnosis
   - `PUT /api/agenda/citas/[id]/consulta/diagnosticos/[diagnosticoId]` - Update diagnosis
   - `DELETE /api/agenda/citas/[id]/consulta/diagnosticos/[diagnosticoId]` - Delete diagnosis
   - `GET /api/agenda/citas/[id]/consulta/diagnosticos/[diagnosticoId]/audit` - Query audit history

4. **Database Models**
   - `AuditLog` - Main audit log table
   - `DiagnosisStatusHistory` - Status change history
   - `PatientDiagnosis` - Diagnosis entity

---

## Implementation Details

### 1. Audit Actions

All diagnosis-related actions are defined in `src/lib/audit/actions.ts`:

```typescript
// Patient Diagnosis Management
DIAGNOSIS_CREATE: "DIAGNOSIS_CREATE",
DIAGNOSIS_UPDATE: "DIAGNOSIS_UPDATE",
DIAGNOSIS_STATUS_CHANGE: "DIAGNOSIS_STATUS_CHANGE",
DIAGNOSIS_DELETE: "DIAGNOSIS_DELETE",
DIAGNOSIS_RESOLVE: "DIAGNOSIS_RESOLVE",
DIAGNOSIS_DISCARD: "DIAGNOSIS_DISCARD",
```

### 2. Audit Entity

The entity type is defined as:

```typescript
PatientDiagnosis: "PatientDiagnosis"
```

### 3. Audit Functions

Three main functions handle diagnosis auditing:

#### `auditDiagnosisCreate()`
- Logs diagnosis creation
- Records initial state, source (catalog/manual), and metadata
- Called after successful diagnosis creation

#### `auditDiagnosisUpdate()`
- Logs field-level changes
- Tracks before/after values for status, notes, code, label
- Automatically determines specific action (RESOLVE, DISCARD, STATUS_CHANGE, UPDATE)

#### `auditDiagnosisDelete()`
- Logs diagnosis deletion
- Records diagnosis state before deletion
- Called BEFORE deletion to preserve audit trail

### 4. Field-Level Change Tracking

The `computeDiagnosisChanges()` helper function compares old and new diagnosis data:

```typescript
interface DiagnosisFieldChanges {
  status?: { from: DiagnosisStatus | null; to: DiagnosisStatus }
  notes?: { from: string | null; to: string | null }
  code?: { from: string | null; to: string | null }
  label?: { from: string; to: string }
}
```

Only changed fields are included in the audit log, reducing storage and improving clarity.

---

## Phased Implementation Plan

### Phase 1: Foundation ✅ (Completed)

**Goals:**
- Add diagnosis-specific audit actions
- Create diagnosis audit helper module
- Define TypeScript interfaces

**Changes:**
- ✅ Updated `src/lib/audit/actions.ts` with diagnosis actions
- ✅ Created `src/lib/audit/diagnosis.ts` with audit functions
- ✅ Added `PatientDiagnosis` to `AuditEntity`

**Files Modified:**
- `src/lib/audit/actions.ts`
- `src/lib/audit/diagnosis.ts` (new file)

### Phase 2: API Integration ✅ (Completed)

**Goals:**
- Integrate audit logging into all diagnosis CRUD operations
- Add field-level change tracking
- Ensure audit logs are created for all operations

**Changes:**
- ✅ Added audit logging to diagnosis creation (POST)
- ✅ Added audit logging to diagnosis update (PUT)
- ✅ Added audit logging to diagnosis deletion (DELETE)
- ✅ Integrated field-level change tracking

**Files Modified:**
- `src/app/api/agenda/citas/[id]/consulta/diagnosticos/route.ts`
- `src/app/api/agenda/citas/[id]/consulta/diagnosticos/[diagnosticoId]/route.ts`
- `src/app/api/pacientes/[id]/diagnosticos/route.ts`

### Phase 3: Query & Visualization ✅ (Completed)

**Goals:**
- Create API endpoint for querying audit history
- Support querying by diagnosis, patient, user, and time range

**Changes:**
- ✅ Created `GET /api/agenda/citas/[id]/consulta/diagnosticos/[diagnosticoId]/audit`
- ✅ Endpoint returns both AuditLog entries and DiagnosisStatusHistory entries

**Files Created:**
- `src/app/api/agenda/citas/[id]/consulta/diagnosticos/[diagnosticoId]/audit/route.ts`

### Phase 4: Frontend Integration (Future)

**Goals:**
- Display audit history in DiagnosticosModule
- Show field-level changes in UI
- Add audit history viewer component

**Planned Changes:**
- Update `DiagnosticosModule.tsx` to fetch and display audit history
- Create `DiagnosisAuditHistory` component
- Add audit history dialog/viewer

### Phase 5: Advanced Features (Future)

**Goals:**
- Export audit logs to CSV/PDF
- Add audit log filtering and search
- Implement audit log retention policies
- Add audit log analytics dashboard

---

## Code Examples

### Example 1: Creating a Diagnosis with Audit Logging

```typescript
// In API route: POST /api/agenda/citas/[id]/consulta/diagnosticos
import { auditDiagnosisCreate } from "@/lib/audit/diagnosis"

// After creating diagnosis in database
const diagnostico = await prisma.patientDiagnosis.create({
  data: {
    pacienteId: consulta.cita.pacienteId,
    consultaId: citaId,
    diagnosisId: input.diagnosisId ?? null,
    code: input.code ?? null,
    label: input.label,
    status: input.status,
    notes: input.notes ?? null,
    createdByUserId: userId,
  },
})

// Audit: Log diagnosis creation
await auditDiagnosisCreate({
  actorId: userId,
  diagnosisId: diagnostico.idPatientDiagnosis,
  pacienteId: consulta.cita.pacienteId,
  consultaId: citaId,
  diagnosisCatalogId: input.diagnosisId ?? null,
  code: input.code ?? null,
  label: input.label,
  status: input.status,
  notes: input.notes ?? null,
  headers: req.headers,
  path: `/api/agenda/citas/${citaId}/consulta/diagnosticos`,
})
```

### Example 2: Updating a Diagnosis with Field-Level Change Tracking

```typescript
// In API route: PUT /api/agenda/citas/[id]/consulta/diagnosticos/[diagnosticoId]
import { auditDiagnosisUpdate, computeDiagnosisChanges } from "@/lib/audit/diagnosis"

// Get current diagnosis state
const diagnostico = await prisma.patientDiagnosis.findUnique({
  where: { idPatientDiagnosis: diagnosticoId },
  select: {
    status: true,
    notes: true,
    code: true,
    label: true,
    pacienteId: true,
  },
})

// Update diagnosis
const updated = await prisma.patientDiagnosis.update({
  where: { idPatientDiagnosis: diagnosticoId },
  data: {
    status: input.status,
    notes: input.notes,
  },
})

// Compute changes for audit
const changes = computeDiagnosisChanges(
  {
    status: diagnostico.status,
    notes: diagnostico.notes,
    code: diagnostico.code,
    label: diagnostico.label,
  },
  {
    status: input.status,
    notes: input.notes,
  }
)

// Audit: Log diagnosis update (only if there are actual changes)
if (Object.keys(changes).length > 0) {
  await auditDiagnosisUpdate({
    actorId: userId,
    diagnosisId: diagnosticoId,
    pacienteId: diagnostico.pacienteId,
    consultaId: citaId,
    changes,
    currentStatus: updated.status,
    previousStatus: diagnostico.status,
    reason: input.reason ?? null,
    headers: req.headers,
    path: `/api/agenda/citas/${citaId}/consulta/diagnosticos/${diagnosticoId}`,
  })
}
```

### Example 3: Resolving a Diagnosis

When a diagnosis status changes to "RESOLVED", the system automatically:
1. Creates a `DiagnosisStatusHistory` entry
2. Logs an audit entry with action `DIAGNOSIS_RESOLVE`
3. Records the resolution timestamp

```typescript
// Status change to RESOLVED triggers:
await auditDiagnosisUpdate({
  actorId: userId,
  diagnosisId: diagnosticoId,
  pacienteId: diagnostico.pacienteId,
  consultaId: citaId,
  changes: {
    status: { from: "ACTIVE", to: "RESOLVED" },
  },
  currentStatus: "RESOLVED",
  previousStatus: "ACTIVE",
  reason: "Patient recovered",
  headers: req.headers,
  path: `/api/agenda/citas/${citaId}/consulta/diagnosticos/${diagnosticoId}`,
})
```

### Example 4: Deleting a Diagnosis

```typescript
// In API route: DELETE /api/agenda/citas/[id]/consulta/diagnosticos/[diagnosticoId]
import { auditDiagnosisDelete } from "@/lib/audit/diagnosis"

// Get diagnosis data BEFORE deleting
const diagnostico = await prisma.patientDiagnosis.findFirst({
  where: { idPatientDiagnosis: diagnosticoId },
  select: {
    idPatientDiagnosis: true,
    pacienteId: true,
    consultaId: true,
    label: true,
    status: true,
  },
})

// Audit: Log diagnosis deletion BEFORE deleting
await auditDiagnosisDelete({
  actorId: userId,
  diagnosisId: diagnosticoId,
  pacienteId: diagnostico.pacienteId,
  consultaId: diagnostico.consultaId,
  label: diagnostico.label,
  status: diagnostico.status,
  headers: req.headers,
  path: `/api/agenda/citas/${citaId}/consulta/diagnosticos/${diagnosticoId}`,
  metadata: {
    reason: "Deleted by administrator",
  },
})

// Now delete
await prisma.patientDiagnosis.delete({
  where: { idPatientDiagnosis: diagnosticoId },
})
```

---

## Querying Audit History

### Query by Diagnosis ID

```typescript
// GET /api/agenda/citas/[id]/consulta/diagnosticos/[diagnosticoId]/audit
const response = await fetch(
  `/api/agenda/citas/${citaId}/consulta/diagnosticos/${diagnosticoId}/audit`
)
const data = await response.json()

// Response structure:
{
  ok: true,
  data: {
    diagnosis: {
      id: number,
      label: string,
      status: DiagnosisStatus,
    },
    auditLogs: [
      {
        id: number,
        action: string,
        createdAt: string,
        actor: {
          id: number,
          nombre: string,
          email: string,
          role: "ADMIN" | "ODONT" | "RECEP",
        },
        metadata: {
          pacienteId: number,
          consultaId: number | null,
          changes: {
            status?: { from: string, to: string },
            notes?: { from: string | null, to: string | null },
          },
          // ... other metadata
        },
        ip: string | null,
      },
    ],
    statusHistory: [
      {
        id: number,
        previousStatus: DiagnosisStatus | null,
        newStatus: DiagnosisStatus,
        reason: string | null,
        changedAt: string,
        changedBy: {
          id: number,
          nombre: string,
        },
        consultaDate: string | null,
      },
    ],
  },
}
```

### Query by Patient ID

```typescript
// Using Prisma directly (for admin/internal use)
const auditLogs = await prisma.auditLog.findMany({
  where: {
    entity: "PatientDiagnosis",
    metadata: {
      path: ["pacienteId"],
      equals: pacienteId,
    },
  },
  include: {
    actor: {
      select: {
        nombreApellido: true,
        email: true,
      },
    },
  },
  orderBy: {
    createdAt: "desc",
  },
})
```

### Query by User/Clinician

```typescript
const auditLogs = await prisma.auditLog.findMany({
  where: {
    entity: "PatientDiagnosis",
    actorId: userId,
  },
  orderBy: {
    createdAt: "desc",
  },
})
```

### Query by Time Range

```typescript
const auditLogs = await prisma.auditLog.findMany({
  where: {
    entity: "PatientDiagnosis",
    createdAt: {
      gte: new Date("2024-01-01"),
      lte: new Date("2024-12-31"),
    },
  },
  orderBy: {
    createdAt: "desc",
  },
})
```

---

## Best Practices & Security

### 1. No PHI in Audit Logs

**Principle:** Audit logs should NOT contain Protected Health Information (PHI) such as:
- Patient names
- Patient addresses
- Patient phone numbers
- Patient dates of birth
- Full medical history

**What to Include:**
- Diagnosis labels (clinical terms, not PHI)
- Diagnosis codes (e.g., CIE-10 codes)
- Status changes
- User IDs and roles
- Timestamps
- Change summaries

### 2. Immutable Audit Logs

**Principle:** Audit logs should be append-only and never modified or deleted.

**Implementation:**
- Use `safeAuditWrite()` which wraps `writeAudit()` with error handling
- Never update or delete audit log entries
- If a diagnosis is deleted, the audit log entry is created BEFORE deletion

### 3. Complete Audit Trail

**Principle:** Every critical operation must generate an audit log entry.

**Implementation:**
- Audit logging is integrated directly into API routes
- No operation can succeed without audit logging
- Use database transactions to ensure atomicity

### 4. Field-Level Change Tracking

**Principle:** Track what changed, not just that something changed.

**Implementation:**
- `computeDiagnosisChanges()` compares old and new values
- Only changed fields are included in audit metadata
- Before/after values are clearly documented

### 5. Request Context

**Principle:** Capture request context (IP, user agent, path) for security and debugging.

**Implementation:**
- `writeAudit()` automatically extracts request context from headers
- IP address is captured for security auditing
- Request path is included for traceability

### 6. Error Handling

**Principle:** Audit logging failures should not break the main operation, but should be logged.

**Implementation:**
- `safeAuditWrite()` catches and logs errors without throwing
- Main operation continues even if audit logging fails
- Errors are logged to console for monitoring

---

## Testing & Validation

### Unit Tests

```typescript
// Test audit function
describe("auditDiagnosisCreate", () => {
  it("should create audit log entry with correct metadata", async () => {
    await auditDiagnosisCreate({
      actorId: 1,
      diagnosisId: 123,
      pacienteId: 456,
      consultaId: 789,
      label: "Caries dental",
      status: "ACTIVE",
      headers: new Headers(),
    })

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        entity: "PatientDiagnosis",
        entityId: 123,
        action: "DIAGNOSIS_CREATE",
      },
    })

    expect(auditLog).toBeDefined()
    expect(auditLog?.metadata).toMatchObject({
      pacienteId: 456,
      consultaId: 789,
      label: "Caries dental",
      status: "ACTIVE",
    })
  })
})
```

### Integration Tests

```typescript
// Test API route with audit logging
describe("POST /api/agenda/citas/[id]/consulta/diagnosticos", () => {
  it("should create diagnosis and audit log", async () => {
    const response = await POST(req, { params: Promise.resolve({ id: "1" }) })
    
    expect(response.status).toBe(200)
    
    // Verify audit log was created
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entity: "PatientDiagnosis",
        action: "DIAGNOSIS_CREATE",
      },
    })
    
    expect(auditLogs.length).toBeGreaterThan(0)
  })
})
```

### Validation Rules

1. **All diagnosis creations must have audit logs**
   - Verify `DIAGNOSIS_CREATE` action exists for every diagnosis
   - Check that audit log metadata matches diagnosis data

2. **All diagnosis updates must have audit logs**
   - Verify `DIAGNOSIS_UPDATE` or specific action exists
   - Check that changes are accurately reflected

3. **All diagnosis deletions must have audit logs**
   - Verify `DIAGNOSIS_DELETE` action exists
   - Check that audit log was created BEFORE deletion

4. **Status changes must have both audit log and status history**
   - Verify `DiagnosisStatusHistory` entry exists
   - Verify audit log entry with appropriate action

### Manual Testing Checklist

- [ ] Create diagnosis → Verify audit log created
- [ ] Update diagnosis status → Verify audit log with status change
- [ ] Update diagnosis notes → Verify audit log with notes change
- [ ] Resolve diagnosis → Verify `DIAGNOSIS_RESOLVE` audit log
- [ ] Discard diagnosis → Verify `DIAGNOSIS_DISCARD` audit log
- [ ] Delete diagnosis → Verify `DIAGNOSIS_DELETE` audit log (before deletion)
- [ ] Query audit history → Verify all entries are returned
- [ ] Verify no PHI in audit logs
- [ ] Verify request context (IP, path) is captured

---

## Summary

The diagnosis auditing system provides:

✅ **Complete traceability** - Every diagnosis operation is logged  
✅ **Field-level change tracking** - Know exactly what changed  
✅ **Security compliance** - No PHI, immutable logs, request context  
✅ **Query capabilities** - Query by diagnosis, patient, user, time range  
✅ **Clean architecture** - Separation of concerns, reusable functions  
✅ **Error resilience** - Audit failures don't break main operations  

The system is production-ready and follows medical/clinical system best practices for auditing and compliance.

