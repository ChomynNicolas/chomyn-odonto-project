# Consultation Workspace Implementation Guide
## Step-by-Step Plan for Improving Dentist Consultation Experience

---

## Priority Roadmap

### **Phase 1: Critical Safety & Data Integrity (Week 1-2)**
**Goal**: Fix critical safety issues and data model confusion without breaking existing functionality.

1. ✅ **Step 1.1**: Remove debug console.log statements
2. ✅ **Step 1.2**: Add prominent allergy/medication alerts in header
3. ✅ **Step 1.3**: Fix anamnesis data loading (fetch actual PatientAnamnesis)
4. ✅ **Step 1.4**: Remove "reason" field from Resumen dialog (keep diagnosis & clinicalNotes)

### **Phase 2: Essential Clinical Features (Week 2-4)**
**Goal**: Add missing clinical modules that exist in schema but not in UI.

5. ✅ **Step 2.1**: Add Vitales tab for recording vitals
6. ✅ **Step 2.2**: Add Medicación tab for viewing/prescribing medications
7. ✅ **Step 2.3**: Add quick patient summary panel

### **Phase 3: Code Quality & Architecture (Week 4-5)**
**Goal**: Refactor for maintainability without changing functionality.

8. ✅ **Step 3.1**: Extract custom hooks (useConsulta, useConsultaPermissions)
9. ✅ **Step 3.2**: Remove "reason" field from DTO and API (migration strategy)
10. ✅ **Step 3.3**: Make treatment plan read-only during consultation

---

## Phase 1: Critical Safety & Data Integrity

### **Step 1.1: Remove Debug Console.log Statements**

**Goal**: Clean up production code by removing debug statements.

**Files to edit**:
- `src/components/consulta-clinica/ConsultaClinicaWorkspace.tsx`
- `src/components/consulta-clinica/modules/ProcedimientosModule.tsx`
- `src/app/api/agenda/citas/[id]/consulta/route.ts`

**Changes**:

```typescript
// ConsultaClinicaWorkspace.tsx - Remove lines 202-216
// DELETE these lines:
console.log("[ConsultaClinicaWorkspace] Debug consulta:", {
  citaId,
  userRole,
  consulta,
  hasConsulta,
  canEdit,
  canEditModules,
  isFinalized,
  status: consulta.status,
  createdAt: consulta.createdAt,
  anamnesis: consulta?.anamnesis?.length || 0,
  diagnosticos: consulta?.diagnosticos?.length || 0,
  procedimientos: consulta?.procedimientos?.length || 0,
})

// ProcedimientosModule.tsx - Remove lines 63-68
// DELETE these lines:
console.log("[ProcedimientosModule] Debug:", {
  citaId,
  canEdit,
  consultaStatus: consulta.status,
  procedimientosCount: consulta.procedimientos?.length || 0,
})

// route.ts - Remove console.log statements (lines 131-135, 140-147, 243-247, 271-275)
// Keep only error logging: console.error()
```

**How to test**:
- Open browser console
- Navigate to consultation page
- Verify no debug logs appear
- Verify error logs still work (test with invalid citaId)

**Risk**: Low - Only removes debug output, no functional changes.

---

### **Step 1.2: Add Prominent Allergy/Medication Alerts**

**Goal**: Display critical safety information (allergies, medications) prominently in the workspace header so dentists never miss them.

**Files to edit**:
- `src/components/consulta-clinica/ConsultaClinicaWorkspace.tsx`

**Changes**:

```typescript
// Add new component after imports
import { AlertTriangle, Pill, Alert } from "lucide-react"

// Add new component before ConsultaClinicaWorkspace
function PatientSafetyAlerts({ 
  alergias, 
  medicaciones 
}: { 
  alergias: ConsultaClinicaDTO['alergias']
  medicaciones: ConsultaClinicaDTO['medicaciones']
}) {
  const severeAllergies = alergias.filter(a => a.severity === "SEVERE" && a.isActive)
  const activeMedications = medicaciones.filter(m => m.isActive)
  
  if (severeAllergies.length === 0 && activeMedications.length === 0) {
    return null
  }

  return (
    <div className="space-y-2 mb-4">
      {severeAllergies.length > 0 && (
        <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950/20">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="font-semibold">
            ⚠️ ALERGIAS SEVERAS: {severeAllergies.map(a => a.label).join(", ")}
          </AlertDescription>
        </Alert>
      )}
      {activeMedications.length > 0 && (
        <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <Pill className="h-4 w-4" />
          <AlertDescription>
            <span className="font-semibold">Medicación activa:</span> {activeMedications.length} {activeMedications.length === 1 ? "medicamento" : "medicamentos"}
            {activeMedications.slice(0, 3).map(m => (
              <span key={m.id} className="ml-2 text-sm">
                {m.label || "Sin especificar"}
                {m.dose && ` (${m.dose})`}
              </span>
            ))}
            {activeMedications.length > 3 && (
              <span className="text-sm text-muted-foreground ml-2">
                +{activeMedications.length - 3} más
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// In ConsultaClinicaWorkspace component, add after line 218 (after opening <div className="space-y-6">):
return (
  <div className="space-y-6">
    {/* Patient Safety Alerts - Always visible */}
    {consulta.alergias && consulta.medicaciones && (
      <PatientSafetyAlerts 
        alergias={consulta.alergias} 
        medicaciones={consulta.medicaciones} 
      />
    )}
    
    {/* Header */}
    <Card>
      {/* ... rest of existing code ... */}
    </Card>
```

**How to test**:
1. Create a patient with severe allergy (SEVERE severity)
2. Add active medication to patient
3. Open consultation workspace
4. Verify:
   - Red alert banner appears for severe allergies
   - Amber alert appears for medications
   - Alerts are visible before any tabs
   - Alerts persist when switching tabs

**Risk**: Low - Only adds UI, doesn't modify data or API.

---

### **Step 1.3: Fix Anamnesis Data Loading**

**Goal**: Fetch actual PatientAnamnesis record instead of using deprecated `reason` field.

**Files to edit**:
- `src/components/consulta-clinica/ConsultaClinicaWorkspace.tsx`
- `src/app/api/agenda/citas/[id]/consulta/_service.ts` (optional - to include anamnesis in DTO)

**Changes**:

```typescript
// ConsultaClinicaWorkspace.tsx

// Add new state for anamnesis
const [anamnesis, setAnamnesis] = useState<{
  motivoConsulta: string | null
  payload: Record<string, any>
} | null>(null)
const [isLoadingAnamnesis, setIsLoadingAnamnesis] = useState(false)

// Add function to fetch anamnesis (after fetchConsulta function)
const fetchAnamnesis = async (pacienteId: number) => {
  try {
    setIsLoadingAnamnesis(true)
    const res = await fetch(`/api/pacientes/${pacienteId}/anamnesis`)
    if (!res.ok) {
      if (res.status === 404) {
        // No anamnesis exists yet
        setAnamnesis(null)
        return
      }
      throw new Error("Error al cargar anamnesis")
    }
    const data = await res.json()
    if (data.data) {
      setAnamnesis({
        motivoConsulta: data.data.motivoConsulta,
        payload: data.data.payload || {},
      })
    } else {
      setAnamnesis(null)
    }
  } catch (error) {
    console.error("Error fetching anamnesis:", error)
    // Don't show toast - anamnesis is optional
    setAnamnesis(null)
  } finally {
    setIsLoadingAnamnesis(false)
  }
}

// Update useEffect to fetch anamnesis when consulta loads
useEffect(() => {
  if (canView) {
    fetchConsulta()
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [citaId, canView])

// Add new useEffect to fetch anamnesis when pacienteId is available
useEffect(() => {
  if (consulta?.pacienteId) {
    fetchAnamnesis(consulta.pacienteId)
  }
}, [consulta?.pacienteId])

// Update AnamnesisMVPForm initialData prop (line 358-364):
initialData={
  anamnesis
    ? {
        motivoConsulta: anamnesis.motivoConsulta,
        payload: anamnesis.payload,
      }
    : null
}
```

**How to test**:
1. Create patient with existing anamnesis (via patient record page)
2. Open consultation workspace
3. Navigate to Anamnesis tab
4. Verify:
   - Form is pre-filled with actual anamnesis data
   - `motivoConsulta` shows correct value
   - `payload` fields (historyOfPresentIllness, etc.) are populated
5. Update anamnesis in consultation
6. Verify version is created correctly

**Risk**: Medium - Changes data source. Test thoroughly with existing anamnesis records.

---

### **Step 1.4: Remove "reason" from Resumen Dialog**

**Goal**: Remove deprecated `reason` field from Resumen Clínico dialog, keeping only `diagnosis` and `clinicalNotes`.

**Files to edit**:
- `src/components/consulta-clinica/ConsultaClinicaWorkspace.tsx`

**Changes**:

```typescript
// Update resumenForm state (line 51-55):
const [resumenForm, setResumenForm] = useState({
  // reason: "", // ❌ REMOVED - use anamnesis.motivoConsulta instead
  diagnosis: "",
  clinicalNotes: "",
})

// Update handleOpenResumenDialog (line 123-131):
const handleOpenResumenDialog = () => {
  if (!consulta) return
  setResumenForm({
    // reason: consulta.reason ?? "", // ❌ REMOVED
    diagnosis: consulta.diagnosis ?? "",
    clinicalNotes: consulta.clinicalNotes ?? "",
  })
  setIsResumenDialogOpen(true)
}

// Update handleSaveResumen (line 133-159):
const handleSaveResumen = async () => {
  if (!consulta) return
  try {
    setIsSavingResumen(true)
    const res = await fetch(`/api/agenda/citas/${citaId}/consulta`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // reason: resumenForm.reason.trim() || null, // ❌ REMOVED
        diagnosis: resumenForm.diagnosis.trim() || null,
        clinicalNotes: resumenForm.clinicalNotes.trim() || null,
      }),
    })
    // ... rest unchanged
  } catch (error) {
    // ... rest unchanged
  }
}

// Update Dialog content (line 440-454) - Remove reason field:
<div className="space-y-4 py-4">
  {/* REMOVED: Reason field - now comes from Anamnesis */}
  <div className="space-y-2">
    <Label htmlFor="diagnosis">Diagnóstico general</Label>
    {/* ... rest unchanged ... */}
  </div>
  {/* ... rest unchanged ... */}
</div>

// Update display section (line 241-265) - Remove reason display:
{canViewResumen && (
  <div className="mt-4 space-y-2">
    {/* REMOVED: reason display - now shown in Anamnesis tab */}
    {consulta.diagnosis && (
      <div>
        <p className="text-sm font-medium text-muted-foreground">Diagnóstico:</p>
        <p className="text-sm">{consulta.diagnosis}</p>
      </div>
    )}
    {/* ... rest unchanged ... */}
  </div>
)}
```

**How to test**:
1. Open consultation workspace
2. Click "Editar Resumen" button
3. Verify:
   - Dialog shows only "Diagnóstico" and "Notas clínicas" fields
   - No "Motivo de consulta" field
   - Save works correctly
   - Display section doesn't show reason
4. Verify anamnesis tab still shows motivoConsulta correctly

**Risk**: Low - Only removes UI field, doesn't break API (API still accepts reason but ignores it).

---

## Phase 2: Essential Clinical Features

### **Step 2.1: Add Vitales Tab**

**Goal**: Add UI to record and view patient vitals during consultation.

**Files to create**:
- `src/components/consulta-clinica/modules/VitalesModule.tsx`

**Files to edit**:
- `src/components/consulta-clinica/ConsultaClinicaWorkspace.tsx`
- `src/app/api/agenda/citas/[id]/consulta/_dto.ts` (already has VitalesDTO)

**Changes**:

```typescript
// Create: src/components/consulta-clinica/modules/VitalesModule.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Plus, Activity, Calendar } from "lucide-react"
import { toast } from "sonner"
import type { ConsultaClinicaDTO, VitalesDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"
import { formatDate } from "@/lib/utils/patient-helpers"

interface VitalesModuleProps {
  citaId: number
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  hasConsulta?: boolean
  onUpdate: () => void
}

export function VitalesModule({ citaId, consulta, canEdit, onUpdate }: VitalesModuleProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    heightCm: "",
    weightKg: "",
    bpSyst: "",
    bpDiast: "",
    heartRate: "",
    notes: "",
  })

  const vitalesList = consulta.vitales || []
  const hasVitales = vitalesList.length > 0
  const latestVitals = vitalesList[0] // Most recent

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!hasConsulta) {
      toast.error("Debe iniciar la consulta primero")
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta/vitales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heightCm: formData.heightCm ? parseInt(formData.heightCm) : null,
          weightKg: formData.weightKg ? parseFloat(formData.weightKg) : null,
          bpSyst: formData.bpSyst ? parseInt(formData.bpSyst) : null,
          bpDiast: formData.bpDiast ? parseInt(formData.bpDiast) : null,
          heartRate: formData.heartRate ? parseInt(formData.heartRate) : null,
          notes: formData.notes.trim() || null,
          measuredAt: new Date().toISOString(),
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al guardar signos vitales")
      }

      toast.success("Signos vitales registrados correctamente")
      setOpen(false)
      setFormData({
        heightCm: "",
        weightKg: "",
        bpSyst: "",
        bpDiast: "",
        heartRate: "",
        notes: "",
      })
      onUpdate()
    } catch (error) {
      console.error("Error saving vitals:", error)
      toast.error(error instanceof Error ? error.message : "Error al guardar signos vitales")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Signos Vitales</h3>
          {hasVitales && (
            <p className="text-sm text-muted-foreground mt-1">
              Última medición: {formatDate(latestVitals.measuredAt, true)}
            </p>
          )}
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Registrar Signos Vitales
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Registrar Signos Vitales</DialogTitle>
                <DialogDescription>
                  Registre los signos vitales del paciente durante la consulta.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="heightCm">Estatura (cm)</Label>
                    <Input
                      id="heightCm"
                      type="number"
                      min="0"
                      value={formData.heightCm}
                      onChange={(e) => setFormData({ ...formData, heightCm: e.target.value })}
                      placeholder="Ej: 170"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weightKg">Peso (kg)</Label>
                    <Input
                      id="weightKg"
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.weightKg}
                      onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
                      placeholder="Ej: 70.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bpSyst">Presión Sistólica</Label>
                    <Input
                      id="bpSyst"
                      type="number"
                      min="0"
                      value={formData.bpSyst}
                      onChange={(e) => setFormData({ ...formData, bpSyst: e.target.value })}
                      placeholder="Ej: 120"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bpDiast">Presión Diastólica</Label>
                    <Input
                      id="bpDiast"
                      type="number"
                      min="0"
                      value={formData.bpDiast}
                      onChange={(e) => setFormData({ ...formData, bpDiast: e.target.value })}
                      placeholder="Ej: 80"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heartRate">Frecuencia Cardíaca (bpm)</Label>
                    <Input
                      id="heartRate"
                      type="number"
                      min="0"
                      value={formData.heartRate}
                      onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                      placeholder="Ej: 72"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    placeholder="Observaciones adicionales..."
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Display vitals */}
      {!hasVitales ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No hay signos vitales registrados</p>
            <p className="text-sm mt-1">
              {canEdit
                ? "Comience registrando los signos vitales del paciente"
                : "No hay información de signos vitales disponible"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {vitalesList.map((vital) => (
            <Card key={vital.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDate(vital.measuredAt, true)}
                    </CardTitle>
                    <CardDescription>
                      Registrado por: {vital.createdBy.nombre}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {vital.heightCm && (
                    <div>
                      <p className="text-sm text-muted-foreground">Estatura</p>
                      <p className="font-medium">{vital.heightCm} cm</p>
                    </div>
                  )}
                  {vital.weightKg && (
                    <div>
                      <p className="text-sm text-muted-foreground">Peso</p>
                      <p className="font-medium">{vital.weightKg} kg</p>
                    </div>
                  )}
                  {vital.bmi && (
                    <div>
                      <p className="text-sm text-muted-foreground">IMC</p>
                      <p className="font-medium">{vital.bmi.toFixed(1)}</p>
                    </div>
                  )}
                  {vital.bpSyst && vital.bpDiast && (
                    <div>
                      <p className="text-sm text-muted-foreground">Presión Arterial</p>
                      <p className="font-medium">{vital.bpSyst}/{vital.bpDiast} mmHg</p>
                    </div>
                  )}
                  {vital.heartRate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Frecuencia Cardíaca</p>
                      <p className="font-medium">{vital.heartRate} bpm</p>
                    </div>
                  )}
                </div>
                {vital.notes && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Notas</p>
                    <p className="text-sm whitespace-pre-wrap">{vital.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Update ConsultaClinicaWorkspace.tsx**:

```typescript
// Add import
import { VitalesModule } from "./modules/VitalesModule"
import { Heart } from "lucide-react"

// Add tab trigger (after line 343):
<TabsTrigger value="vitales" className="flex items-center gap-2">
  <Heart className="h-4 w-4" />
  <span className="hidden sm:inline">Vitales</span>
</TabsTrigger>

// Update TabsList grid (line 323):
<TabsList className="grid w-full grid-cols-5 lg:grid-cols-7">

// Add TabsContent (after OdontogramaModule, before plan-tratamiento):
<TabsContent value="vitales" className="mt-6">
  <VitalesModule 
    citaId={citaId} 
    consulta={consulta} 
    canEdit={canEditModules} 
    hasConsulta={hasConsulta}
    onUpdate={fetchConsulta} 
  />
</TabsContent>
```

**How to test**:
1. Open consultation workspace
2. Navigate to "Vitales" tab
3. Click "Registrar Signos Vitales"
4. Fill form and save
5. Verify:
   - Vitals appear in list
   - BMI is calculated automatically
   - Multiple vitals can be recorded
   - Historical vitals are displayed

**Risk**: Medium - New feature, requires API endpoint. Ensure `/api/agenda/citas/[id]/consulta/vitales` POST endpoint exists.

---

### **Step 2.2: Add Medicación Tab**

**Goal**: Add UI to view current medications and prescribe new ones during consultation.

**Files to create**:
- `src/components/consulta-clinica/modules/MedicacionModule.tsx`

**Files to edit**:
- `src/components/consulta-clinica/ConsultaClinicaWorkspace.tsx`

**Changes**:

```typescript
// Create: src/components/consulta-clinica/modules/MedicacionModule.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Pill, Calendar } from "lucide-react"
import { toast } from "sonner"
import type { ConsultaClinicaDTO, MedicacionDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"
import { formatDate } from "@/lib/utils/patient-helpers"

interface MedicacionModuleProps {
  citaId: number
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  hasConsulta?: boolean
  onUpdate: () => void
}

export function MedicacionModule({ citaId, consulta, canEdit, onUpdate }: MedicacionModuleProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    label: "",
    dose: "",
    freq: "",
    route: "",
    startAt: "",
    endAt: "",
  })

  const medicacionesList = consulta.medicaciones || []
  const activeMedications = medicacionesList.filter(m => m.isActive)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!hasConsulta) {
      toast.error("Debe iniciar la consulta primero")
      return
    }

    if (!formData.label.trim()) {
      toast.error("El nombre del medicamento es requerido")
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta/medicaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: formData.label.trim(),
          dose: formData.dose.trim() || null,
          freq: formData.freq.trim() || null,
          route: formData.route.trim() || null,
          startAt: formData.startAt || null,
          endAt: formData.endAt || null,
          isActive: true,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al prescribir medicamento")
      }

      toast.success("Medicamento prescrito correctamente")
      setOpen(false)
      setFormData({
        label: "",
        dose: "",
        freq: "",
        route: "",
        startAt: "",
        endAt: "",
      })
      onUpdate()
    } catch (error) {
      console.error("Error prescribing medication:", error)
      toast.error(error instanceof Error ? error.message : "Error al prescribir medicamento")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Medicación</h3>
          {activeMedications.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {activeMedications.length} {activeMedications.length === 1 ? "medicamento activo" : "medicamentos activos"}
            </p>
          )}
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Prescribir Medicamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Prescribir Medicamento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="label">
                    Medicamento <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="label"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="Ej: Amoxicilina 500mg"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dose">Dosis</Label>
                    <Input
                      id="dose"
                      value={formData.dose}
                      onChange={(e) => setFormData({ ...formData, dose: e.target.value })}
                      placeholder="Ej: 500mg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="freq">Frecuencia</Label>
                    <Input
                      id="freq"
                      value={formData.freq}
                      onChange={(e) => setFormData({ ...formData, freq: e.target.value })}
                      placeholder="Ej: Cada 8 horas"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="route">Vía de administración</Label>
                    <Input
                      id="route"
                      value={formData.route}
                      onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                      placeholder="Ej: Oral, IV, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startAt">Fecha inicio</Label>
                    <Input
                      id="startAt"
                      type="date"
                      value={formData.startAt}
                      onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endAt">Fecha fin (opcional)</Label>
                    <Input
                      id="endAt"
                      type="date"
                      value={formData.endAt}
                      onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : "Prescribir"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Display medications */}
      {medicacionesList.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Pill className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No hay medicación registrada</p>
            <p className="text-sm mt-1">
              {canEdit
                ? "Comience prescribiendo medicamentos al paciente"
                : "No hay información de medicación disponible"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {medicacionesList.map((med) => (
            <Card key={med.id} className={med.isActive ? "" : "opacity-60"}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Pill className="h-4 w-4" />
                      {med.label || "Medicamento sin especificar"}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-2">
                      {med.dose && <span>Dosis: {med.dose}</span>}
                      {med.freq && <span>Frecuencia: {med.freq}</span>}
                      {med.route && <span>Vía: {med.route}</span>}
                      {med.startAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Inicio: {formatDate(med.startAt, true)}
                        </span>
                      )}
                      {!med.isActive && med.endAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Fin: {formatDate(med.endAt, true)}
                        </span>
                      )}
                    </div>
                  </div>
                  {med.isActive && (
                    <Badge variant="default">Activo</Badge>
                  )}
                </div>
              </CardHeader>
              {med.createdBy && (
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Prescrito por: {med.createdBy.nombre}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Update ConsultaClinicaWorkspace.tsx** (similar to VitalesModule):

```typescript
// Add import
import { MedicacionModule } from "./modules/MedicacionModule"

// Add tab trigger and content (similar pattern to VitalesModule)
```

**How to test**:
1. Open consultation workspace
2. Navigate to "Medicación" tab
3. Click "Prescribir Medicamento"
4. Fill form and save
5. Verify:
   - Medication appears in list
   - Active medications are highlighted
   - Can view all medications (active and inactive)
   - Medications link to consulta correctly

**Risk**: Medium - New feature, requires API endpoint. Ensure `/api/agenda/citas/[id]/consulta/medicaciones` POST endpoint exists.

---

### **Step 2.3: Add Quick Patient Summary Panel**

**Goal**: Add collapsible sidebar or top section showing key patient information at a glance.

**Files to edit**:
- `src/components/consulta-clinica/ConsultaClinicaWorkspace.tsx`

**Changes**:

```typescript
// Add new component
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, User, Calendar, FileText } from "lucide-react"

function QuickPatientSummary({ 
  paciente, 
  alergias, 
  medicaciones,
  diagnosticos 
}: { 
  paciente?: ConsultaClinicaDTO['paciente']
  alergias: ConsultaClinicaDTO['alergias']
  medicaciones: ConsultaClinicaDTO['medicaciones']
  diagnosticos: ConsultaClinicaDTO['diagnosticos']
}) {
  const [isOpen, setIsOpen] = useState(true)
  
  if (!paciente) return null

  const activeDiagnoses = diagnosticos.filter(d => d.status === "ACTIVE")
  const severeAllergies = alergias.filter(a => a.severity === "SEVERE" && a.isActive)
  const activeMeds = medicaciones.filter(m => m.isActive)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Resumen del Paciente
              </CardTitle>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Demographics */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-3 w-3" />
                  Datos Básicos
                </h4>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Nombre: </span>
                    {paciente.nombres} {paciente.apellidos}
                  </p>
                  {paciente.edad !== null && (
                    <p>
                      <span className="text-muted-foreground">Edad: </span>
                      {paciente.edad} años
                    </p>
                  )}
                  {paciente.genero && (
                    <p>
                      <span className="text-muted-foreground">Género: </span>
                      {paciente.genero}
                    </p>
                  )}
                  {paciente.telefono && (
                    <p>
                      <span className="text-muted-foreground">Teléfono: </span>
                      {paciente.telefono}
                    </p>
                  )}
                </div>
              </div>

              {/* Clinical Summary */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  Resumen Clínico
                </h4>
                <div className="text-sm space-y-1">
                  {severeAllergies.length > 0 && (
                    <p className="text-red-600 dark:text-red-400">
                      ⚠️ {severeAllergies.length} {severeAllergies.length === 1 ? "alergia severa" : "alergias severas"}
                    </p>
                  )}
                  {activeMeds.length > 0 && (
                    <p>
                      <span className="text-muted-foreground">Medicación activa: </span>
                      {activeMeds.length} {activeMeds.length === 1 ? "medicamento" : "medicamentos"}
                    </p>
                  )}
                  {activeDiagnoses.length > 0 && (
                    <p>
                      <span className="text-muted-foreground">Diagnósticos activos: </span>
                      {activeDiagnoses.length}
                    </p>
                  )}
                  {severeAllergies.length === 0 && activeMeds.length === 0 && activeDiagnoses.length === 0 && (
                    <p className="text-muted-foreground italic">Sin información clínica registrada</p>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  Acciones Rápidas
                </h4>
                <div className="space-y-1">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    Ver Historia Clínica Completa
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    Agendar Próxima Cita
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

// Add to ConsultaClinicaWorkspace return (after PatientSafetyAlerts, before Header Card):
<QuickPatientSummary 
  paciente={consulta.paciente}
  alergias={consulta.alergias || []}
  medicaciones={consulta.medicaciones || []}
  diagnosticos={consulta.diagnosticos || []}
/>
```

**How to test**:
1. Open consultation workspace
2. Verify summary panel appears at top
3. Verify:
   - Patient demographics are correct
   - Clinical summary shows allergies/medications/diagnoses
   - Panel is collapsible
   - Information updates when data changes

**Risk**: Low - Only adds UI, doesn't modify data.

---

## Phase 3: Code Quality & Architecture

### **Step 3.1: Extract Custom Hooks**

**Goal**: Improve code organization by extracting data fetching and permissions logic into reusable hooks.

**Files to create**:
- `src/components/consulta-clinica/hooks/useConsulta.ts`
- `src/components/consulta-clinica/hooks/useConsultaPermissions.ts`

**Files to edit**:
- `src/components/consulta-clinica/ConsultaClinicaWorkspace.tsx`

**Changes**:

```typescript
// Create: src/components/consulta-clinica/hooks/useConsulta.ts
import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import type { ConsultaClinicaDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"

export function useConsulta(citaId: number, canView: boolean) {
  const [consulta, setConsulta] = useState<ConsultaClinicaDTO | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchConsulta = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta`)
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Error al cargar consulta")
      }
      const data = await res.json()
      if (data.ok) {
        setConsulta(data.data)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Error desconocido")
      setError(error)
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }, [citaId])

  useEffect(() => {
    if (canView) {
      fetchConsulta()
    }
  }, [citaId, canView, fetchConsulta])

  return {
    consulta,
    isLoading,
    error,
    refetch: fetchConsulta,
  }
}

// Create: src/components/consulta-clinica/hooks/useConsultaPermissions.ts
import { useMemo } from "react"
import type { ConsultaClinicaDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"

export function useConsultaPermissions(
  userRole: "ADMIN" | "ODONT" | "RECEP",
  consulta: ConsultaClinicaDTO | null
) {
  return useMemo(() => {
    const canEdit = userRole === "ADMIN" || userRole === "ODONT"
    const canView = canEdit || userRole === "RECEP"
    const isFinalized = consulta?.status === "FINAL"
    const hasConsulta = consulta?.createdAt !== null
    const canEditModules = canEdit && !isFinalized
    const canViewResumen = canEdit

    return {
      canEdit,
      canView,
      isFinalized,
      hasConsulta,
      canEditModules,
      canViewResumen,
    }
  }, [userRole, consulta])
}

// Update ConsultaClinicaWorkspace.tsx:
import { useConsulta } from "./hooks/useConsulta"
import { useConsultaPermissions } from "./hooks/useConsultaPermissions"

export function ConsultaClinicaWorkspace({ citaId, userRole }: ConsultaClinicaWorkspaceProps) {
  const canView = userRole === "ADMIN" || userRole === "ODONT" || userRole === "RECEP"
  
  const { consulta, isLoading, error, refetch: fetchConsulta } = useConsulta(citaId, canView)
  const { canEdit, isFinalized, hasConsulta, canEditModules, canViewResumen } = 
    useConsultaPermissions(userRole, consulta)

  // Remove old state and fetchConsulta function
  // Keep other handlers (handleFinalize, etc.) but use fetchConsulta from hook
}
```

**How to test**:
1. Verify consultation loads correctly
2. Verify permissions work as before
3. Verify refetch works when needed
4. Check that hooks can be reused in other components

**Risk**: Medium - Refactors core logic. Test thoroughly to ensure no regressions.

---

## UX/UI Enhancements for ConsultaClinicaWorkspace

### **Proposed Layout Improvements**

#### **1. Information Hierarchy**

**Current**: All information is in tabs, requiring navigation to see different aspects.

**Proposed**: 
- **Top Section**: Patient safety alerts (always visible)
- **Quick Summary Panel**: Collapsible patient overview
- **Main Content**: Tabs for detailed modules
- **Right Sidebar** (optional): Quick actions, recent activity

**Rationale**: Dentists need quick access to critical information (allergies, medications) without navigating tabs. The current tab-only structure forces them to remember where information is located.

#### **2. Visual States**

**Improvements**:
- **Loading States**: Skeleton loaders per module (already implemented)
- **Empty States**: More informative empty states with suggested actions
- **Error States**: Clear error messages with retry buttons
- **Success States**: Subtle success indicators after saves

**Example Empty State Enhancement**:
```typescript
<Card>
  <CardContent className="pt-6 text-center">
    <Activity className="h-12 w-12 mx-auto mb-2 opacity-50 text-muted-foreground" />
    <p className="font-medium">No hay procedimientos registrados</p>
    <p className="text-sm text-muted-foreground mt-1">
      {canEdit ? (
        <>
          Comience agregando el primer procedimiento realizado.
          <br />
          <Button size="sm" className="mt-3" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Procedimiento
          </Button>
        </>
      ) : (
        "No hay información de procedimientos disponible"
      )}
    </p>
  </CardContent>
</Card>
```

#### **3. Keyboard Navigation**

**Proposed**: Add keyboard shortcuts for common actions:
- `Ctrl/Cmd + S`: Save current form
- `Ctrl/Cmd + N`: New item (procedure, diagnosis, etc.)
- `Tab`: Navigate between tabs
- `Esc`: Close dialogs

**Implementation**:
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      // Trigger save
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [])
```

#### **4. Responsive Design**

**Current**: Tabs use `grid-cols-4 lg:grid-cols-6` which may overflow on smaller screens.

**Proposed**: 
- Use horizontal scrollable tabs on mobile
- Stack patient summary vertically on mobile
- Make dialogs full-screen on mobile

---

## Validation & Regression Checklist

After applying all changes, verify:

### **Dentist Workflow**
- [ ] Can open consultation workspace
- [ ] Can see patient safety alerts (allergies, medications)
- [ ] Can view quick patient summary
- [ ] Can navigate between tabs smoothly
- [ ] Can record anamnesis (shows correct data)
- [ ] Can add procedures, diagnoses, vitals, medications
- [ ] Can finalize consultation
- [ ] Cannot edit finalized consultation

### **Data Integrity**
- [ ] Anamnesis data loads correctly from PatientAnamnesis
- [ ] No "reason" field in Resumen dialog
- [ ] Vitals link to consulta correctly
- [ ] Medications link to consulta correctly
- [ ] All modules save data correctly

### **UI States**
- [ ] Loading skeletons appear during fetch
- [ ] Empty states show helpful messages
- [ ] Error states show clear messages with retry
- [ ] Success toasts appear after saves
- [ ] Patient safety alerts are always visible

### **RBAC**
- [ ] ADMIN/ODONT can edit all modules
- [ ] RECEP can view but not edit
- [ ] Finalized consultations are read-only
- [ ] Clinical data hidden from RECEP appropriately

### **Performance**
- [ ] No unnecessary API calls
- [ ] Data loads within 2 seconds
- [ ] No console errors
- [ ] Smooth tab switching

---

## Migration Strategy for "reason" Field Removal

**Phase 1** (Current): 
- Remove `reason` from UI (Step 1.4) ✅
- Keep `reason` in API/DTO (backward compatibility)

**Phase 2** (Future):
- Migrate existing `reason` data to PatientAnamnesis.motivoConsulta
- Update API to stop accepting `reason`
- Remove `reason` from DTO
- Remove `reason` from Prisma schema (optional - can keep as deprecated)

**Migration Script** (for Phase 2):
```typescript
// prisma/migrations/migrate_reason_to_anamnesis.ts
async function migrateReasonToAnamnesis() {
  const consultas = await prisma.consulta.findMany({
    where: { reason: { not: null } },
    include: { cita: { include: { paciente: true } } }
  })

  for (const consulta of consultas) {
    // Get or create anamnesis
    const anamnesis = await prisma.patientAnamnesis.upsert({
      where: { pacienteId: consulta.cita.pacienteId },
      create: {
        pacienteId: consulta.cita.pacienteId,
        tipo: "ADULTO", // Default, adjust as needed
        motivoConsulta: consulta.reason,
        payload: {},
        creadoPorUserId: consulta.createdByUserId,
      },
      update: {
        motivoConsulta: consulta.reason || undefined,
      }
    })
  }
}
```

---

## Next Steps After Implementation

1. **User Testing**: Get feedback from dentists on the new layout and features
2. **Performance Monitoring**: Monitor API response times and optimize if needed
3. **Accessibility Audit**: Ensure keyboard navigation and screen reader compatibility
4. **Mobile Testing**: Test on tablets (common in dental clinics)
5. **Documentation**: Update user documentation with new features

---

## Summary

This implementation guide provides:

1. ✅ **Prioritized roadmap** (3 phases, 10 steps)
2. ✅ **Detailed step-by-step instructions** with code examples
3. ✅ **UX/UI improvements** specifically for dentist workflow
4. ✅ **Safe migration strategy** to avoid breaking changes
5. ✅ **Comprehensive testing checklist**

Each step is designed to be:
- **Independent**: Can be applied separately
- **Safe**: Low risk of breaking existing functionality
- **Testable**: Clear testing instructions
- **Incremental**: Builds on previous steps

Start with Phase 1 (critical safety fixes), then move to Phase 2 (essential features), and finally Phase 3 (code quality improvements).

