# Patient Ficha Improvement Plan
## Comprehensive Analysis and Implementation Guide

---

## 1. DATA MODEL ANALYSIS

### 1.1 Patient-Related Models in Schema

#### Core Patient Models:
- **Paciente** (lines 244-269)
  - `idPaciente`, `personaId`, `notasAdministrativas`, `estaActivo`, `createdAt`, `updatedAt`
  
- **Persona** (lines 99-119)
  - `idPersona`, `nombres`, `apellidos`, `fechaNacimiento`, `genero`, `direccion`, `estaActivo`, `createdAt`, `updatedAt`
  
- **Documento** (lines 121-134)
  - `idDocumento`, `personaId`, `tipo`, `numero`, `paisEmision`, `fechaEmision`, `fechaVencimiento`, `ruc`
  
- **PersonaContacto** (lines 136-161)
  - `idContacto`, `personaId`, `tipo` (PHONE/EMAIL), `valorRaw`, `valorNorm`, `label`, `whatsappCapaz`, `smsCapaz`, `esPrincipal`, `esPreferidoRecordatorio`, `esPreferidoCobranza`, `activo`, `createdAt`, `updatedAt`

#### Clinical Data Models:
- **PatientAnamnesis** (lines 1043-1090)
  - `idPatientAnamnesis`, `pacienteId`, `tipo` (ADULTO/PEDIATRICO), `motivoConsulta`, `tieneDolorActual`, `dolorIntensidad`, `urgenciaPercibida`, `tieneEnfermedadesCronicas`, `tieneAlergias`, `tieneMedicacionActual`, `embarazada`, `expuestoHumoTabaco`, `bruxismo`, `higieneCepilladosDia`, `usaHiloDental`, `ultimaVisitaDental`, `tieneHabitosSuccion`, `lactanciaRegistrada`, `payload` (JSON), `creadoPorUserId`, `actualizadoPorUserId`, `createdAt`, `updatedAt`

- **PatientAllergy** (lines 770-790)
  - `idPatientAllergy`, `pacienteId`, `allergyId`, `label`, `severity` (MILD/MODERATE/SEVERE), `reaction`, `notedAt`, `isActive`, `createdByUserId`

- **PatientMedication** (lines 805-827)
  - `idPatientMedication`, `pacienteId`, `medicationId`, `label`, `dose`, `freq`, `route`, `startAt`, `endAt`, `isActive`, `createdByUserId`

- **PatientVitals** (lines 830-855)
  - `idPatientVitals`, `pacienteId`, `consultaId`, `measuredAt`, `heightCm`, `weightKg`, `bmi`, `bpSyst`, `bpDiast`, `heartRate`, `notes`, `createdByUserId`

- **PatientDiagnosis** (lines 721-747)
  - `idPatientDiagnosis`, `pacienteId`, `diagnosisId`, `code`, `label`, `status` (ACTIVE/RESOLVED/RULED_OUT), `notedAt`, `resolvedAt`, `notes`, `consultaId`, `createdByUserId`

- **ClinicalHistoryEntry** (lines 679-697)
  - `idClinicalHistoryEntry`, `pacienteId`, `consultaId`, `fecha`, `title`, `notes`, `createdByUserId`, `createdAt`

#### Administrative/Relationship Models:
- **PacienteResponsable** (lines 272-290)
  - `idPacienteResponsable`, `pacienteId`, `personaId`, `relacion` (PADRE/MADRE/TUTOR/CONYUGE/FAMILIAR/HIJO/EMPRESA/OTRO), `esPrincipal`, `autoridadLegal`, `vigenteDesde`, `vigenteHasta`, `notas`, `createdAt`, `updatedAt`

- **Consentimiento** (lines 990-1039)
  - `idConsentimiento`, `Paciente_idPaciente`, `Persona_idPersona_responsable`, `Cita_idCita`, `tipo`, `firmado_en`, `vigente_hasta`, `registrado_en`, `public_id`, `secure_url`, `format`, `bytes`, `width`, `height`, `hash`, `provider`, `observaciones`, `version`, `activo`, `created_at`, `updated_at`

#### Treatment & Procedures:
- **TreatmentPlan** (lines 625-644)
  - `idTreatmentPlan`, `pacienteId`, `titulo`, `descripcion`, `isActive`, `createdByUserId`, `createdAt`, `updatedAt`

- **TreatmentStep** (lines 646-676)
  - `idTreatmentStep`, `treatmentPlanId`, `order`, `procedureId`, `serviceType`, `toothNumber`, `toothSurface`, `estimatedDurationMin`, `estimatedCostCents`, `priority`, `status`, `notes`, `createdAt`, `updatedAt`

#### Attachments:
- **Adjunto** (lines 570-623)
  - `idAdjunto`, `pacienteId`, `consultaId`, `procedimientoId`, `tipo`, `descripcion`, `publicId`, `folder`, `resourceType`, `format`, `bytes`, `width`, `height`, `duration`, `originalFilename`, `accessMode`, `isActive`, `deletedAt`, `deletedByUserId`, `uploadedByUserId`, `createdAt`, `updatedAt`

### 1.2 Complete Field Inventory by Category

#### IDENTIFICATION & DEMOGRAPHICS
**Available in Schema:**
- Name: `Persona.nombres`, `Persona.apellidos` (no secondLastName field in Persona)
- Date of Birth: `Persona.fechaNacimiento`
- Gender: `Persona.genero` (MASCULINO/FEMENINO/OTRO/NO_ESPECIFICADO)
- Age: Calculated from `fechaNacimiento`
- Document Type: `Documento.tipo` (CI/DNI/PASAPORTE/RUC/OTRO)
- Document Number: `Documento.numero`
- Document Country: `Documento.paisEmision`
- Document Issue Date: `Documento.fechaEmision`
- Document Expiry Date: `Documento.fechaVencimiento`
- RUC: `Documento.ruc`
- Status: `Paciente.estaActivo`, `Persona.estaActivo`

**Missing in Schema:**
- Second Last Name (mentioned in UI but not in Persona model)
- Nationality/Citizenship field
- Marital Status
- Occupation/Profession

#### CONTACT INFORMATION
**Available in Schema:**
- Address: `Persona.direccion`
- City: Not directly in Persona (may be in address string)
- Country: Not directly in Persona
- Phone Contacts: `PersonaContacto` (tipo=PHONE) with `valorNorm`, `esPrincipal`, `whatsappCapaz`, `smsCapaz`, `esPreferidoRecordatorio`, `esPreferidoCobranza`, `label`, `notes`
- Email Contacts: `PersonaContacto` (tipo=EMAIL) with `valorNorm`, `esPrincipal`, `label`, `notes`
- Emergency Contact: Not in schema (UI references `emergencyContactName`, `emergencyContactPhone` but these don't exist in schema)

**Missing in Schema:**
- City as separate field
- Country as separate field
- Emergency contact fields (name, phone, relationship)
- Preferred contact method
- Contact notes/metadata

#### RESPONSIBLE PARTIES
**Available in Schema:**
- Responsible Parties: `PacienteResponsable` with full `Persona` relation, `relacion`, `esPrincipal`, `autoridadLegal`, `vigenteDesde`, `vigenteHasta`, `notas`

**Missing in Schema:**
- Contact information for responsible parties (should come from Persona.contactos)

#### CLINICAL SUMMARY
**Available in Schema:**
- Current Anamnesis: `PatientAnamnesis` (1:1 with paciente)
- Anamnesis Type: `tipo` (ADULTO/PEDIATRICO)
- Chief Complaint: `motivoConsulta`
- Current Pain: `tieneDolorActual`, `dolorIntensidad` (1-10)
- Urgency: `urgenciaPercibida` (RUTINA/PRIORITARIO/URGENCIA)
- Chronic Diseases Flag: `tieneEnfermedadesCronicas`
- Allergies Flag: `tieneAlergias`
- Current Medication Flag: `tieneMedicacionActual`
- Pregnancy: `embarazada` (for adult females)
- Tobacco Exposure: `expuestoHumoTabaco` (for children)
- Bruxism: `bruxismo`
- Oral Hygiene: `higieneCepilladosDia`, `usaHiloDental`
- Last Dental Visit: `ultimaVisitaDental`
- Pediatric Data: `tieneHabitosSuccion`, `lactanciaRegistrada`
- Full Payload: `payload` (JSON with complete form data)

#### ALLERGIES
**Available in Schema:**
- All Allergies: `PatientAllergy[]` with `label`, `severity`, `reaction`, `notedAt`, `isActive`, `createdBy` (via Usuario relation)

**Missing in Schema:**
- Allergy onset date
- Allergy verification date
- Cross-reactivity information

#### MEDICATIONS
**Available in Schema:**
- All Medications: `PatientMedication[]` with `label`, `dose`, `freq`, `route`, `startAt`, `endAt`, `isActive`, `createdBy` (via Usuario relation)

**Missing in Schema:**
- Prescribing physician
- Medication indication/reason
- Adverse reactions

#### VITAL SIGNS
**Available in Schema:**
- Vital Signs History: `PatientVitals[]` with `measuredAt`, `heightCm`, `weightKg`, `bmi`, `bpSyst`, `bpDiast`, `heartRate`, `notes`, `consultaId`, `createdBy`

**Missing in Schema:**
- Temperature
- Respiratory rate
- Oxygen saturation
- Blood glucose

#### DIAGNOSES
**Available in Schema:**
- Diagnoses: `PatientDiagnosis[]` with `code`, `label`, `status`, `notedAt`, `resolvedAt`, `notes`, `consultaId`, `createdBy`

#### CLINICAL HISTORY
**Available in Schema:**
- Clinical Notes: `ClinicalHistoryEntry[]` with `fecha`, `title`, `notes`, `consultaId`, `createdBy`, `createdAt`

#### ADMINISTRATIVE
**Available in Schema:**
- Administrative Notes: `Paciente.notasAdministrativas`
- Consents: `Consentimiento[]` with `tipo`, `firmado_en`, `vigente_hasta`, `observaciones`, `version`, `activo`, file metadata

#### TREATMENT PLANS
**Available in Schema:**
- Active Treatment Plans: `TreatmentPlan[]` with `titulo`, `descripcion`, `isActive`, `createdBy`, `createdAt`, `updatedAt`
- Treatment Steps: `TreatmentStep[]` with `order`, `procedureId`, `serviceType`, `toothNumber`, `toothSurface`, `estimatedDurationMin`, `estimatedCostCents`, `priority`, `status`, `notes`

#### ATTACHMENTS
**Available in Schema:**
- Attachments: `Adjunto[]` with `tipo`, `descripcion`, `secureUrl`, `publicId`, `format`, `bytes`, `width`, `height`, `originalFilename`, `uploadedBy`, `createdAt`

---

## 2. CURRENT UI/DATA USAGE ANALYSIS

### 2.1 PatientFichaView.tsx - What's Currently Displayed

#### KPI Summary Cards (lines 194-247):
- ✅ Upcoming Appointments (count)
- ✅ Completed Consultations (count)
- ✅ Active Treatments (count)
- ✅ Last Visit Date

#### Personal Data Card (lines 251-417):
- ✅ Full Name (firstName, lastName, secondLastName)
- ✅ Date of Birth (formatted)
- ✅ Age (calculated)
- ✅ Gender (formatted)

**Missing from Schema:** `secondLastName` doesn't exist in Persona model

#### Document Card (lines 420-552):
- ✅ Document Type (formatted)
- ✅ Document Number
- ✅ Document Country (formatted)
- ✅ RUC

**Missing from UI:**
- Document Issue Date (`Documento.fechaEmision`)
- Document Expiry Date (`Documento.fechaVencimiento`)

#### Address Card (lines 555-644):
- ✅ Address (`Persona.direccion`)
- ✅ City (from `currentPatient.city` - not in schema)
- ✅ Country (from `currentPatient.country` - not in schema)

**Schema Issue:** City and Country are not separate fields in Persona model

#### Contact Information Card (lines 648-775):
- ✅ Phone Contacts (all types: PHONE, MOBILE, WHATSAPP)
- ✅ Email Contacts
- ✅ Primary indicators
- ✅ Contact notes
- ✅ WhatsApp/SMS capabilities

**Well Implemented:** Shows all contact types with proper formatting

#### Responsible Parties Card (lines 778-816):
- ✅ Responsible Party Names (from Persona relation)
- ✅ Relationship Type (formatted)
- ✅ Primary indicator
- ✅ Legal Authority indicator

**Missing from UI:**
- Responsible party contact information (should show Persona.contactos)
- Validity dates (`vigenteDesde`, `vigenteHasta`)
- Notes (`notas`)

#### Emergency Contact Card (lines 819-914):
- ⚠️ Emergency Contact Name (`emergencyContactName`)
- ⚠️ Emergency Contact Phone (`emergencyContactPhone`)

**CRITICAL ISSUE:** These fields don't exist in schema! UI references fields that aren't in database.

### 2.2 HistoriaClinicaView.tsx - What's Currently Displayed

#### Quick Summary Card (line 94):
- Uses `QuickSummaryCard` component (not shown in provided files)

#### Tabs:
1. **Resumen Tab:**
   - `AnamnesisSummarySection` (allergies, medications, vital signs summary)
   - `MedicalBackgroundSection` (diagnoses, medical history)

2. **Anamnesis Tab:**
   - `AnamnesisTimeline` (full anamnesis history)
   - `AnamnesisSummarySection` (duplicate)

3. **Antecedentes Tab:**
   - `MedicalBackgroundSection` (duplicate)

4. **Evolución Tab:**
   - `ClinicalNotesTimeline` (clinical notes history)

**Note:** Component sections are not shown, so exact fields displayed are unknown.

### 2.3 PatientLayoutClient.tsx - Header Information

#### Patient Header (lines 94-167):
- ✅ Full Name
- ✅ Status Badge (ACTIVE/INACTIVE)
- ✅ Age and Gender
- ✅ Address and City
- ✅ Severe Allergies Badge
- ✅ Other Allergies Badge
- ✅ Primary Diagnosis Badge
- ✅ Next Appointment Badge

**Well Implemented:** Good clinical alerts visibility

### 2.4 Data Availability vs Display Summary

#### ✅ DISPLAYED CORRECTLY:
- Basic demographics (name, DOB, gender, age)
- Document information (type, number, country, RUC)
- Contact information (phones, emails with metadata)
- Responsible parties (names, relationships)
- Clinical alerts (allergies, diagnoses)
- Appointment statistics

#### ⚠️ DISPLAYED BUT NOT IN SCHEMA:
- `secondLastName` (referenced in UI but not in Persona)
- `city` (referenced but not separate field in Persona)
- `country` (referenced but not separate field in Persona)
- `emergencyContactName` (referenced but doesn't exist)
- `emergencyContactPhone` (referenced but doesn't exist)

#### ❌ IN SCHEMA BUT NOT DISPLAYED:
- Document issue/expiry dates (`Documento.fechaEmision`, `fechaVencimiento`)
- Responsible party validity dates (`vigenteDesde`, `vigenteHasta`)
- Responsible party notes (`notas`)
- Responsible party contact information (from Persona.contactos)
- Anamnesis detailed fields (pain intensity, urgency, oral hygiene details, pediatric data)
- Vital signs history (only latest shown, no timeline)
- Consent information (not shown in ficha)
- Administrative notes (`Paciente.notasAdministrativas`)
- Treatment plan details (only count shown)
- Attachment count/summary

#### 🔄 DUPLICATED INFORMATION:
- Anamnesis summary appears in both "Resumen" and "Anamnesis" tabs
- Medical background appears in both "Resumen" and "Antecedentes" tabs

---

## 3. GAP & IMPROVEMENT ANALYSIS

### 3.1 Critical Data Model Gaps

1. **Emergency Contact Missing**
   - UI references `emergencyContactName` and `emergencyContactPhone` but these don't exist
   - **Impact:** High - Emergency contacts are critical medical information
   - **Solution:** Add to schema or use PersonaContacto with special type

2. **Second Last Name Missing**
   - UI references `secondLastName` but Persona only has `apellidos`
   - **Impact:** Medium - Data inconsistency
   - **Solution:** Add `segundoApellido` to Persona or combine in `apellidos`

3. **City/Country Not Separate**
   - UI treats city/country as separate but Persona only has `direccion`
   - **Impact:** Medium - Hard to filter/search by location
   - **Solution:** Add `ciudad` and `pais` fields to Persona

4. **Missing Vital Signs Fields**
   - No temperature, respiratory rate, O2 saturation, blood glucose
   - **Impact:** Low-Medium - May be needed for comprehensive medical records
   - **Solution:** Add optional fields to PatientVitals

### 3.2 UX/UI Issues

1. **Inconsistent Field Labels**
   - Mix of Spanish and English in some places
   - Some technical field names shown to users

2. **Poor Information Hierarchy**
   - Critical clinical info (allergies, medications) buried in tabs
   - No prominent "at-a-glance" clinical summary in ficha

3. **Missing Timestamps**
   - No "Last Updated" dates shown for most sections
   - No "Created By" information visible

4. **Incomplete Contact Management**
   - Can't see all contact metadata (preferred for reminders, billing)
   - No way to manage multiple contacts easily

5. **Responsible Parties Incomplete**
   - Missing contact info for responsible parties
   - Missing validity dates
   - Missing notes

6. **No Administrative Section**
   - Administrative notes not displayed
   - Consent information not accessible from ficha

7. **Treatment Plans Underutilized**
   - Only count shown, no details
   - No link to treatment plan management

### 3.3 Professional Medical Software Standards Gaps

1. **Missing Clinical Summary Section**
   - No consolidated view of active problems, medications, allergies
   - No "Problem List" standard format

2. **No Medication Reconciliation**
   - Can't see medication history/changes over time
   - No medication start/stop dates prominently displayed

3. **Incomplete Allergy Documentation**
   - Missing reaction details display
   - No allergy verification dates

4. **No Social History Section**
   - Lifestyle factors (tobacco, alcohol) not prominently displayed
   - Oral hygiene habits not easily accessible

5. **Missing Family History**
   - No dedicated section for family medical history
   - (May be in anamnesis payload but not structured)

6. **No Surgical History**
   - No dedicated section for past surgeries
   - (May be in anamnesis payload but not structured)

---

## 4. REDESIGN PROPOSAL FOR PATIENT FICHA

### 4.1 Proposed Structure

#### SECTION 1: PATIENT OVERVIEW (Always Visible - Top of Page)
**Purpose:** Critical information at a glance

**Content:**
- Patient Name (large, prominent)
- Patient ID/Record Number
- Age, Gender, DOB
- Status Badge (ACTIVE/INACTIVE)
- **Clinical Alerts Banner:**
  - Severe Allergies (red, prominent)
  - Active Medications Count
  - Active Diagnoses Count
  - Current Pain Status (if applicable)
  - Urgency Level (if applicable)

**Implementation:** Can use existing data

---

#### SECTION 2: DEMOGRAPHIC DATA
**Purpose:** Complete identification information

**Subsections:**

**2.1 Personal Information**
- Full Name (firstName, lastName, secondLastName*)
- Date of Birth (with age calculation)
- Gender
- Nationality/Citizenship* (if added to schema)
- Marital Status* (if added to schema)
- Occupation* (if added to schema)

**2.2 Identification Documents**
- Document Type
- Document Number
- Document Country
- Document Issue Date ⭐ (add to UI)
- Document Expiry Date ⭐ (add to UI)
- RUC (if applicable)
- **Last Updated:** [timestamp]
- **Updated By:** [user name]

**Implementation:** 
- ✅ Most fields available
- ⭐ Document dates need to be added to UI
- * New fields would require schema changes

---

#### SECTION 3: CONTACT & EMERGENCY INFORMATION
**Purpose:** All communication channels and emergency contacts

**Subsections:**

**3.1 Primary Contact Methods**
- Primary Phone (with WhatsApp indicator)
- Primary Email
- Preferred Contact Method* (if added)
- Preferred Reminder Method* (if added)
- Preferred Billing Contact* (if added)

**3.2 All Contact Methods**
- **Phones:**
  - Value (formatted)
  - Type (Phone/Mobile/WhatsApp)
  - Primary indicator
  - Preferred for reminders indicator
  - Preferred for billing indicator
  - WhatsApp capable indicator
  - SMS capable indicator
  - Label/Notes
  - **Last Updated:** [timestamp]

- **Emails:**
  - Value
  - Primary indicator
  - Preferred for reminders indicator
  - Label/Notes
  - **Last Updated:** [timestamp]

**3.3 Emergency Contact** ⚠️
- Emergency Contact Name ⭐ (needs schema field)
- Emergency Contact Phone ⭐ (needs schema field)
- Emergency Contact Relationship* (if added)
- **Last Updated:** [timestamp]

**Implementation:**
- ✅ Contact methods fully available
- ⭐ Emergency contact needs schema addition
- * Preferred methods could use existing flags

---

#### SECTION 4: ADDRESS & LOCATION
**Purpose:** Physical location information

**Content:**
- Street Address (`Persona.direccion`)
- City ⭐ (needs separate field or parsing)
- State/Province* (if added)
- Country ⭐ (needs separate field)
- Postal Code* (if added)
- **Last Updated:** [timestamp]

**Implementation:**
- ⚠️ City/Country need schema changes or address parsing
- * Additional fields would require schema changes

---

#### SECTION 5: RESPONSIBLE PARTIES
**Purpose:** Legal guardians, payment responsible parties

**Content (per responsible party):**
- Full Name (from Persona relation)
- Relationship Type (formatted)
- Primary Responsible indicator
- Legal Authority indicator
- **Contact Information:** ⭐ (from Persona.contactos - add to UI)
  - Phone
  - Email
- **Validity Period:** ⭐ (add to UI)
  - Valid From (`vigenteDesde`)
  - Valid Until (`vigenteHasta` or "Current")
- Notes ⭐ (add to UI)
- **Last Updated:** [timestamp]

**Implementation:**
- ✅ Basic info available
- ⭐ Contact info, dates, notes need to be added to UI

---

#### SECTION 6: CLINICAL SUMMARY (NEW - Prominent Section)
**Purpose:** Quick clinical overview for clinicians

**Subsections:**

**6.1 Active Problems/Diagnoses**
- List of ACTIVE diagnoses
- Format: `[Code] Label - Noted: [date]`
- Link to full diagnosis history

**6.2 Current Medications**
- Active medications list
- Format: `Label - Dose - Frequency - Route`
- Start Date
- Prescribed By* (if added)
- Link to medication history

**6.3 Active Allergies**
- All active allergies
- Format: `Label (Severity) - Reaction: [reaction]`
- Noted Date
- Link to allergy history

**6.4 Current Vital Signs**
- Latest vital signs (if available)
- Format: Height, Weight, BMI, BP, Heart Rate
- Measurement Date
- Link to vital signs history

**6.5 Current Anamnesis Summary**
- Chief Complaint (`motivoConsulta`)
- Current Pain Status (`tieneDolorActual`, `dolorIntensidad`)
- Urgency Level (`urgenciaPercibida`)
- Chronic Diseases Flag
- Link to full anamnesis

**Implementation:** ✅ All data available, needs UI component

---

#### SECTION 7: ALLERGIES & ALERTS (Detailed)
**Purpose:** Complete allergy documentation

**Content:**
- **Active Allergies Table:**
  - Allergy Name/Label
  - Severity (with color coding)
  - Reaction Description
  - Noted Date
  - Verified Date* (if added)
  - Noted By (user name)
  - Actions (Edit/Deactivate)

- **Inactive Allergies** (collapsible)
  - Same fields as above
  - Deactivated Date

**Implementation:** ✅ Data available, needs better presentation

---

#### SECTION 8: MEDICATIONS (Detailed)
**Purpose:** Complete medication history and current medications

**Content:**
- **Active Medications Table:**
  - Medication Name/Label
  - Dose
  - Frequency
  - Route
  - Start Date
  - End Date (if applicable)
  - Prescribed By* (if added)
  - Indication* (if added)
  - Actions (Edit/Stop)

- **Medication History** (timeline view)
  - All medications (active and inactive)
  - Start/Stop dates
  - Changes over time

**Implementation:** ✅ Data available, needs timeline view

---

#### SECTION 9: VITAL SIGNS HISTORY
**Purpose:** Track vital signs over time

**Content:**
- **Latest Vital Signs Card:**
  - Height, Weight, BMI
  - Blood Pressure (Systolic/Diastolic)
  - Heart Rate
  - Measurement Date/Time
  - Measured By

- **Vital Signs Timeline:**
  - Table/list of all measurements
  - Date, Height, Weight, BMI, BP, HR
  - Associated Consultation (if linked)
  - Notes

**Implementation:** ✅ Data available, needs timeline component

---

#### SECTION 10: DIAGNOSES
**Purpose:** Problem list and diagnosis history

**Content:**
- **Active Diagnoses:**
  - Code (if available)
  - Label
  - Noted Date
  - Notes
  - Noted By
  - Actions (Resolve/Rule Out)

- **Diagnosis History:**
  - All diagnoses (active, resolved, ruled out)
  - Status changes
  - Resolution dates

**Implementation:** ✅ Data available

---

#### SECTION 11: SOCIAL & LIFESTYLE HISTORY
**Purpose:** Lifestyle factors affecting dental health

**Content:**
- **Oral Hygiene:**
  - Brushing Frequency (`higieneCepilladosDia`)
  - Floss Usage (`usaHiloDental`)
  - Last Dental Visit (`ultimaVisitaDental`)

- **Lifestyle Factors:**
  - Bruxism (`bruxismo`)
  - Tobacco Exposure (`expuestoHumoTabaco`)
  - Pregnancy Status (`embarazada`)

- **Pediatric Factors** (if applicable):
  - Sucking Habits (`tieneHabitosSuccion`)
  - Breastfeeding (`lactanciaRegistrada`)

**Implementation:** ✅ Data available in PatientAnamnesis

---

#### SECTION 12: ADMINISTRATIVE INFORMATION
**Purpose:** Non-clinical administrative data

**Content:**
- **Administrative Notes:**
  - `Paciente.notasAdministrativas`
  - Last Updated
  - Updated By

- **Active Consents:**
  - Consent Type
  - Signed Date
  - Valid Until
  - Responsible Party
  - Link to consent document
  - Status (Active/Expired)

- **Treatment Plans:**
  - Active Treatment Plans Count
  - Link to treatment plans page
  - Recent Plans Summary* (if added)

**Implementation:** 
- ✅ Administrative notes available
- ✅ Consents available (needs UI)
- ✅ Treatment plans available (needs better integration)

---

### 4.2 Field Mapping: Schema → UI Sections

#### IMMEDIATE IMPLEMENTATION (Existing Data):
- ✅ All demographic fields
- ✅ All contact fields
- ✅ All clinical fields (allergies, medications, vitals, diagnoses)
- ✅ Responsible parties basic info
- ✅ Anamnesis summary fields
- ✅ Administrative notes
- ✅ Consent information

#### REQUIRES UI ADDITIONS (Data Exists):
- ⭐ Document issue/expiry dates
- ⭐ Responsible party contact info
- ⭐ Responsible party validity dates
- ⭐ Responsible party notes
- ⭐ Vital signs timeline
- ⭐ Medication timeline
- ⭐ Diagnosis history
- ⭐ Consent display
- ⭐ Treatment plan details

#### REQUIRES SCHEMA CHANGES:
- 🔴 Emergency contact name/phone
- 🔴 Second last name (or combine in apellidos)
- 🔴 City as separate field
- 🔴 Country as separate field
- 🔴 Additional vital signs (temperature, etc.)
- 🔴 Medication prescribing physician
- 🔴 Medication indication
- 🔴 Allergy verification date

---

## 5. STEP-BY-STEP IMPLEMENTATION GUIDE

### PHASE 1: DATA MODEL FIXES (Critical)

#### Step 1.1: Fix Emergency Contact Issue
**Problem:** UI references fields that don't exist in schema

**Options:**
- **Option A (Recommended):** Add emergency contact fields to Persona model
  - Add `contactoEmergenciaNombre String?`
  - Add `contactoEmergenciaTelefono String?`
  - Add `contactoEmergenciaRelacion String?`
  
- **Option B:** Use PersonaContacto with special type
  - Add `EMERGENCY` to TipoContacto enum
  - Create emergency contact via PersonaContacto

**Action:** Choose Option A for simplicity. Add fields to Persona model.

**Migration:** Create Prisma migration to add fields.

---

#### Step 1.2: Fix Second Last Name
**Problem:** UI references `secondLastName` but Persona only has `apellidos`

**Options:**
- **Option A:** Add `segundoApellido String?` to Persona
- **Option B:** Combine both last names in `apellidos` field (separate with space)

**Action:** Choose Option A for data integrity. Add `segundoApellido` field.

**Migration:** Create Prisma migration.

---

#### Step 1.3: Fix City/Country Separation
**Problem:** UI treats city/country as separate but schema only has `direccion`

**Action:** Add separate fields to Persona:
- `ciudad String?`
- `pais String?` (default "PY" for Paraguay)
- Keep `direccion` for street address

**Migration:** Create Prisma migration. Consider data migration script to parse existing addresses.

---

#### Step 1.4: Add Missing Document Dates to UI
**Problem:** Document issue/expiry dates exist in schema but not shown

**Action:** No schema change needed. Add fields to PatientFichaView Document Card.

---

### PHASE 2: UI COMPONENT REFACTORING

#### Step 2.1: Extract Reusable Section Components
**Purpose:** Improve maintainability and consistency

**Components to Create:**

1. **`DemographicsSection.tsx`**
   - Personal info display/edit
   - Document info display/edit
   - Reusable across ficha and other views

2. **`ContactSection.tsx`**
   - Contact methods display/edit
   - Emergency contact display/edit
   - Contact management interface

3. **`ResponsiblePartiesSection.tsx`**
   - Responsible parties list
   - Contact info for each party
   - Validity dates display

4. **`ClinicalSummarySection.tsx`**
   - Active problems
   - Current medications
   - Active allergies
   - Latest vitals
   - Anamnesis summary

5. **`AllergiesSection.tsx`**
   - Allergies table/list
   - Severity indicators
   - Active/inactive toggle

6. **`MedicationsSection.tsx`**
   - Medications table
   - Timeline view
   - Start/stop dates

7. **`VitalSignsSection.tsx`**
   - Latest vitals card
   - Timeline/table view

8. **`DiagnosesSection.tsx`**
   - Active diagnoses
   - Diagnosis history
   - Status management

9. **`AdministrativeSection.tsx`**
   - Administrative notes
   - Active consents
   - Treatment plans summary

**Action:** Create component files in `src/components/pacientes/ficha/sections/`

---

#### Step 2.2: Update PatientFichaView Structure
**Current:** Single large component with inline sections

**New Structure:**
```typescript
<PatientFichaView>
  <PatientOverviewSection /> {/* New */}
  <DemographicsSection />
  <ContactSection />
  <AddressSection /> {/* Extracted */}
  <ResponsiblePartiesSection />
  <ClinicalSummarySection /> {/* New - Prominent */}
  <AllergiesSection />
  <MedicationsSection />
  <VitalSignsSection />
  <DiagnosesSection />
  <SocialHistorySection /> {/* New */}
  <AdministrativeSection /> {/* New */}
</PatientFichaView>
```

**Action:** Refactor PatientFichaView.tsx to use new section components.

---

#### Step 2.3: Add Missing Fields to Existing Sections

**Document Card:**
- Add `fechaEmision` display
- Add `fechaVencimiento` display
- Add "Last Updated" timestamp
- Add "Updated By" user name

**Responsible Parties Card:**
- Add contact information (from Persona.contactos)
- Add validity dates (`vigenteDesde`, `vigenteHasta`)
- Add notes display
- Add "Last Updated" timestamp

**Contact Section:**
- Ensure all contact metadata is visible
- Add "Last Updated" for each contact
- Improve contact management UI

**Action:** Update respective section components.

---

### PHASE 3: NEW SECTIONS IMPLEMENTATION

#### Step 3.1: Create Patient Overview Section
**Location:** Top of PatientFichaView (before KPI cards)

**Content:**
- Large patient name
- Patient ID
- Age, Gender, DOB
- Status badge
- Clinical alerts banner (severe allergies, active meds count, active diagnoses)

**Component:** `PatientOverviewSection.tsx`

**Action:** Create component and integrate into PatientFichaView.

---

#### Step 3.2: Create Clinical Summary Section
**Location:** After Responsible Parties, before detailed sections

**Purpose:** Quick clinical overview

**Content:**
- Active Problems (diagnoses) - max 5, link to full list
- Current Medications - max 5, link to full list
- Active Allergies - all, link to full list
- Latest Vital Signs - if available
- Current Anamnesis Summary - chief complaint, pain status, urgency

**Component:** `ClinicalSummarySection.tsx`

**Action:** Create component with collapsible sections.

---

#### Step 3.3: Create Social History Section
**Location:** After Clinical Summary

**Content:**
- Oral Hygiene habits
- Lifestyle factors
- Pediatric factors (if applicable)

**Component:** `SocialHistorySection.tsx`

**Data Source:** PatientAnamnesis fields

**Action:** Create component.

---

#### Step 3.4: Create Administrative Section
**Location:** Last section

**Content:**
- Administrative Notes (editable)
- Active Consents (table/list)
- Treatment Plans Summary

**Component:** `AdministrativeSection.tsx`

**Action:** Create component. Fetch consents from API.

---

### PHASE 4: ENHANCED DISPLAYS

#### Step 4.1: Enhance Allergies Section
**Current:** Basic list

**Enhanced:**
- Table format with columns: Name, Severity, Reaction, Noted Date, Status, Actions
- Color-coded severity badges
- Collapsible inactive allergies section
- "Add Allergy" button
- Edit/Deactivate actions

**Action:** Update `AllergiesSection.tsx` component.

---

#### Step 4.2: Enhance Medications Section
**Current:** Not shown in ficha (only in historia)

**Enhanced:**
- Table format: Name, Dose, Frequency, Route, Start Date, End Date, Status, Actions
- Timeline view toggle
- "Add Medication" button
- Edit/Stop actions

**Action:** Create/update `MedicationsSection.tsx` component.

---

#### Step 4.3: Enhance Vital Signs Section
**Current:** Not shown in ficha

**Enhanced:**
- Latest vitals card (prominent)
- Timeline/table view of history
- Link to consultation if applicable
- "Add Vital Signs" button

**Action:** Create/update `VitalSignsSection.tsx` component.

---

#### Step 4.4: Enhance Diagnoses Section
**Current:** Not shown in ficha (only in historia)

**Enhanced:**
- Active diagnoses table
- Diagnosis history (all statuses)
- "Add Diagnosis" button
- Resolve/Rule Out actions

**Action:** Create/update `DiagnosesSection.tsx` component.

---

### PHASE 5: DATA FETCHING & API UPDATES

#### Step 5.1: Update Patient API to Include Missing Relations
**Check:** `/api/pacientes/[id]/route.ts`

**Ensure API Returns:**
- ✅ Persona.contactos (all types)
- ✅ Persona.documento (with all fields)
- ✅ Paciente.responsables (with Persona.contactos)
- ✅ Paciente.allergies (all, not just active)
- ✅ Paciente.medications (all, not just active)
- ✅ Paciente.vitals (latest + recent history)
- ✅ Paciente.diagnoses (all statuses)
- ✅ Paciente.anamnesisActual (with all fields)
- ✅ Paciente.consentimientos (active)
- ✅ Paciente.treatmentPlans (active)

**Action:** Review and update API response structure.

---

#### Step 5.2: Add Timestamps to API Responses
**Ensure All Entities Include:**
- `createdAt`
- `updatedAt`
- `createdBy` (user name)
- `updatedBy` (user name, if applicable)

**Action:** Update API responses to include audit fields.

---

### PHASE 6: UX IMPROVEMENTS

#### Step 6.1: Improve Information Hierarchy
**Changes:**
- Move Clinical Summary to top (after overview)
- Make clinical alerts more prominent
- Group related sections visually
- Use collapsible sections for less critical info

**Action:** Reorder sections in PatientFichaView.

---

#### Step 6.2: Add Consistent Formatting
**Standards:**
- All dates: `DD MMM YYYY` format (e.g., "15 Ene 2024")
- All timestamps: Include time for recent items
- All user names: Format consistently
- All badges: Use consistent color scheme

**Action:** Create/update formatting utilities.

---

#### Step 6.3: Add Loading States
**For Each Section:**
- Skeleton loaders while fetching
- Error states with retry
- Empty states with helpful messages

**Action:** Add loading/error/empty states to all sections.

---

#### Step 6.4: Improve Edit Experience
**Current:** Inline editing per section

**Enhancements:**
- Consistent edit/save/cancel buttons
- Form validation
- Success/error toasts
- Optimistic updates
- Conflict resolution (if concurrent edits)

**Action:** Standardize edit patterns across sections.

---

### PHASE 7: TESTING & VALIDATION

#### Step 7.1: Data Consistency Checks
- Verify all schema fields are accessible via API
- Verify all displayed fields exist in schema
- Verify all edit operations update correct fields
- Test with missing/null data

**Action:** Create test cases and validate.

---

#### Step 7.2: UI/UX Testing
- Test responsive design (mobile, tablet, desktop)
- Test with various data states (empty, partial, complete)
- Test edit flows
- Test navigation between sections
- Test clinical alert visibility

**Action:** Manual testing checklist.

---

#### Step 7.3: Performance Testing
- Check API response times
- Check component render times
- Optimize data fetching (avoid over-fetching)
- Implement pagination for long lists (medications, vitals history)

**Action:** Performance audit and optimization.

---

## 6. IMPLEMENTATION PRIORITY

### CRITICAL (Do First):
1. Fix emergency contact schema issue (Step 1.1)
2. Fix second last name issue (Step 1.2)
3. Add document dates to UI (Step 1.4)
4. Add responsible party contact info to UI (Step 2.3)
5. Create Clinical Summary section (Step 3.2)

### HIGH PRIORITY:
6. Fix city/country separation (Step 1.3)
7. Extract reusable components (Step 2.1)
8. Enhance allergies section (Step 4.1)
9. Add medications section to ficha (Step 4.2)
10. Add vital signs section to ficha (Step 4.3)

### MEDIUM PRIORITY:
11. Add diagnoses section to ficha (Step 4.4)
12. Create social history section (Step 3.3)
13. Create administrative section (Step 3.3)
14. Improve information hierarchy (Step 6.1)
15. Add timestamps throughout (Step 5.2)

### LOW PRIORITY (Nice to Have):
16. Add city/country fields to schema (if not doing address parsing)
17. Add additional vital signs fields
18. Add medication prescribing physician
19. Add allergy verification dates
20. Performance optimizations (Step 7.3)

---

## 7. COMPONENT FILE STRUCTURE

### Proposed Directory Structure:
```
src/components/pacientes/
├── PatientFichaView.tsx (main component)
├── PatientLayoutClient.tsx (existing)
└── ficha/
    ├── sections/
    │   ├── PatientOverviewSection.tsx (NEW)
    │   ├── DemographicsSection.tsx (NEW)
    │   ├── ContactSection.tsx (NEW)
    │   ├── AddressSection.tsx (NEW)
    │   ├── ResponsiblePartiesSection.tsx (NEW)
    │   ├── ClinicalSummarySection.tsx (NEW)
    │   ├── AllergiesSection.tsx (NEW)
    │   ├── MedicationsSection.tsx (NEW)
    │   ├── VitalSignsSection.tsx (NEW)
    │   ├── DiagnosesSection.tsx (NEW)
    │   ├── SocialHistorySection.tsx (NEW)
    │   └── AdministrativeSection.tsx (NEW)
    └── components/
        ├── ContactMethodCard.tsx (NEW - reusable)
        ├── ResponsiblePartyCard.tsx (NEW - reusable)
        ├── ClinicalAlertBadge.tsx (NEW - reusable)
        └── TimestampDisplay.tsx (NEW - reusable)
```

---

## 8. SUMMARY CHECKLIST

### Schema Changes Required:
- [ ] Add emergency contact fields to Persona
- [ ] Add segundoApellido to Persona
- [ ] Add ciudad to Persona
- [ ] Add pais to Persona
- [ ] (Optional) Add additional vital signs fields
- [ ] (Optional) Add medication prescribing physician
- [ ] (Optional) Add allergy verification date

### UI Components to Create:
- [ ] PatientOverviewSection
- [ ] DemographicsSection
- [ ] ContactSection
- [ ] AddressSection
- [ ] ResponsiblePartiesSection
- [ ] ClinicalSummarySection
- [ ] AllergiesSection
- [ ] MedicationsSection
- [ ] VitalSignsSection
- [ ] DiagnosesSection
- [ ] SocialHistorySection
- [ ] AdministrativeSection
- [ ] Reusable sub-components (ContactMethodCard, etc.)

### UI Components to Update:
- [ ] PatientFichaView (refactor to use sections)
- [ ] PatientLayoutClient (ensure header shows all critical info)

### API Updates Required:
- [ ] Ensure all relations are included in patient API response
- [ ] Add timestamps to all entity responses
- [ ] Add createdBy/updatedBy user names

### Data Display Additions:
- [ ] Document issue/expiry dates
- [ ] Responsible party contact info
- [ ] Responsible party validity dates
- [ ] Responsible party notes
- [ ] Vital signs timeline
- [ ] Medication timeline
- [ ] Diagnosis history
- [ ] Consent information
- [ ] Treatment plan details
- [ ] Timestamps throughout

### UX Improvements:
- [ ] Reorder sections for better hierarchy
- [ ] Improve clinical alerts visibility
- [ ] Standardize date/time formatting
- [ ] Add loading/error/empty states
- [ ] Improve edit experience consistency
- [ ] Add pagination for long lists

---

## END OF DOCUMENT

This plan provides a comprehensive roadmap for improving the patient ficha. Follow phases sequentially, prioritizing critical fixes first, then building out new sections and enhancements.

