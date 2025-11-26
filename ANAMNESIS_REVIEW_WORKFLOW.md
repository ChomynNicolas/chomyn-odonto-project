# Anamnesis Review Workflow - Outside Consultation Edits

## Overview

When anamnesis is edited **outside an active consultation**, critical changes require dentist review before being fully accepted. This document explains how the review process works.

## Where to Review Changes

### 1. **During Consultation** (Primary Location)
- **Location**: Consultation Workspace (`/agenda/citas/[id]/consulta`)
- **When**: When a dentist opens a consultation for a patient with pending reviews
- **Visibility**: The `AnamnesisPendingReviewPanel` appears at the top of the consultation workspace, right after safety alerts
- **Who can review**: Only ODONT and ADMIN roles

### 2. **Patient Detail View** (Secondary Location)
- **Location**: Patient Detail → Anamnesis Tab (`/pacientes/[id]`)
- **When**: When viewing patient details, if there are pending reviews
- **Visibility**: The review panel appears below the status header
- **Who can review**: Only ODONT and ADMIN roles

## How the Review Process Works

### Step 1: Edit Outside Consultation
1. User (ODONT/ADMIN) navigates to Patient Detail → Anamnesis Tab
2. Clicks "Edit Anamnesis" button
3. Modal opens with warning: "You are editing anamnesis outside an active consultation"
4. User makes changes to critical fields (allergies, medications, medical conditions)
5. User fills required context:
   - **Reason for change** (required for critical fields)
   - **Information source** (IN_PERSON, PHONE, EMAIL, etc.)
   - **Verified with patient** (checkbox)
6. User saves changes

### Step 2: System Creates Pending Reviews
- System automatically:
  - Creates audit log entry with outside-consultation context
  - Identifies which fields require review (critical fields)
  - Creates `AnamnesisPendingReview` records for each critical change
  - Sets anamnesis status to `PENDING_REVIEW`
  - Updates `hasPendingReviews` flag

### Step 3: Review During Next Consultation
1. Dentist opens consultation for the patient
2. **Review Panel appears automatically** at the top of the workspace
3. Panel shows:
   - Number of pending reviews
   - List of all pending changes
   - For each change:
     - Field name
     - Old value → New value
     - Who made the change and when
     - Reason provided
     - Severity level (CRITICAL, HIGH, MEDIUM, LOW)

### Step 4: Review Individual Changes
1. Dentist clicks "Revisar" (Review) button on a pending change
2. Review dialog opens showing:
   - **Field modified**: Clear label
   - **Old value**: Previous value (left side)
   - **New value**: New value (right side, highlighted)
   - **Change information**: Who, when, reason
   - **Review notes field**: Optional notes from dentist
3. Dentist verifies with patient in-person
4. Dentist chooses:
   - **"Aprobar y Verificar"** (Approve and Verify): Accepts the change
   - **"Rechazar Cambio"** (Reject Change): Rejects the change

### Step 5: System Updates
After review:
- `AnamnesisPendingReview` record is updated:
  - `reviewedAt`: Timestamp
  - `reviewedByUserId`: Dentist who reviewed
  - `isApproved`: true/false
  - `reviewNotes`: Optional notes
- `AnamnesisAuditLog` is updated with review information
- Anamnesis status is recalculated:
  - If all reviews approved → Status becomes `VALID`
  - If any review rejected → Status remains `PENDING_REVIEW` or changes accordingly

## Visual Indicators

### Status Badges
- **VALID**: Green badge - No pending reviews, updated within 12 months
- **EXPIRED**: Amber badge - Last update > 12 months ago
- **PENDING_REVIEW**: Red pulsing badge - Has unreviewed changes
- **NO_ANAMNESIS**: Gray badge - No anamnesis exists

### Review Panel
- **Amber border**: Indicates pending reviews
- **Pulsing badge**: Shows count of pending reviews
- **Alert icon**: Draws attention to critical changes

## Field-Level Review Requirements

### Always Requires Review
- Adding/removing allergies (any severity)
- Adding/removing medications
- Adding/removing medical conditions
- Pregnancy status changes
- Any critical field modification

### Review Severity Levels
- **CRITICAL**: Severe allergies, pregnancy, high-risk medications
- **HIGH**: Medical conditions, moderate allergies
- **MEDIUM**: Habit changes, hygiene updates
- **LOW**: General information updates

## API Endpoints

### Get Pending Reviews
```
GET /api/pacientes/[id]/anamnesis/pending-reviews
```
Returns all unreviewed changes for the patient's anamnesis.

### Review a Change
```
PUT /api/pacientes/[id]/anamnesis/review/[reviewId]
Body: {
  isApproved: boolean
  reviewNotes?: string
}
```

### Batch Review (Future Enhancement)
```
POST /api/pacientes/[id]/anamnesis/review/batch
Body: {
  reviewIds: number[]
  isApproved: boolean
  reviewNotes?: string
}
```

## Components

### `AnamnesisPendingReviewPanel`
- **Location**: 
  - `src/app/(dashboard)/pacientes/[id]/_components/anamnesis/components/AnamnesisPendingReviewPanel.tsx`
- **Props**:
  - `patientId`: Patient ID
  - `canReview`: Whether user can review (ODONT/ADMIN)
  - `onReviewComplete`: Callback after review
- **Features**:
  - Fetches pending reviews automatically
  - Displays list of pending changes
  - Opens review dialog for each change
  - Handles approve/reject actions

## Best Practices

1. **Always review during consultation**: Review pending changes when patient is present
2. **Verify with patient**: Confirm changes directly with patient before approving
3. **Add review notes**: Document any additional context or verification details
4. **Reject if uncertain**: If information seems incorrect, reject and update during consultation
5. **Review promptly**: Don't let pending reviews accumulate

## Security & Compliance

- All reviews are fully audited
- Review actions are logged with timestamp and reviewer
- Cannot review your own changes (future enhancement)
- Only clinical roles (ODONT/ADMIN) can review
- Full audit trail for compliance

