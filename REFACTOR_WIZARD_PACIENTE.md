# Plan de Refactorización: Wizard de Paciente (5 → 3 pasos)

## 📋 Resumen Ejecutivo

Este documento detalla el plan completo para refactorizar el wizard de creación de paciente de **5 pasos a 3 pasos**, eliminando:
- **Paso 3: Datos Clínicos** (alergias, medicación, antecedentes, observaciones, vitals)
- **Paso 5: Adjuntos** (documentos y archivos)

El nuevo wizard se enfocará únicamente en la creación de datos básicos/administrativos del paciente.

---

## 1. Análisis de la Implementación Actual

### 1.1 Estructura Actual del Wizard

El wizard actual (`PacienteWizard.tsx`) tiene **5 pasos**:

```typescript
const STEPS = [
  { id: 1, name: "Identificación", required: true },
  { id: 2, name: "Contacto", required: true },
  { id: 3, name: "Datos Clínicos", required: false },      // ❌ ELIMINAR
  { id: 4, name: "Responsable de Pago", required: false },
  { id: 5, name: "Adjuntos", required: false },            // ❌ ELIMINAR
]
```

**Estado global/local:**
- `currentStep`: estado del paso actual (1-5)
- `isSubmitting`: estado de envío del formulario
- `adjuntosFiles`: Map<string, File> para almacenar archivos de adjuntos
- `form`: instancia de `react-hook-form` con `PacienteCreateFormInput`

**Navegación entre pasos:**
- `handleNext()`: valida campos del paso actual y avanza
- `handlePrevious()`: retrocede al paso anterior
- `handleSave(intent)`: valida campos requeridos (pasos 1 y 2) y envía el formulario

**Validaciones:**
- Paso 1: `getFieldsForStep(1)` valida campos de identificación
- Paso 2: `getFieldsForStep(2)` valida teléfono, email, preferenciasContacto
- Pasos 3, 4, 5: no tienen validaciones requeridas (opcionales)

**Submit final:**
- Valida campos requeridos (pasos 1 y 2)
- Normaliza teléfono y email
- Construye payload según `PacienteCreateSchemaClient`
- Envía POST a `/api/pacientes`
- Si hay adjuntos, llama a `uploadAdjuntosPostCreate()` después de crear el paciente
- Maneja dos intents: `"open"` (navega a ficha) y `"continue"` (mantiene en formulario)

### 1.2 Componentes Relacionados con Datos Clínicos

**Archivo:** `src/components/pacientes/wizard/steps/Step3Clinicos.tsx`

**Campos manejados:**
- `alergias`: array de objetos `AllergyInputClientSchema` (label, severity, reaction, notes)
- `medicacion`: array de objetos `MedicationInputClientSchema` (label, dose, freq, route, notes)
- `antecedentes`: string libre + campos estructurados (hipertensión, diabetes, anticoagulantes, etc.)
- `observaciones`: string libre
- `vitals`: objeto opcional con heightCm, weightKg, bmi, bpSyst, bpDiast, heartRate, notes

**Componentes auxiliares:**
- `AllergyCombobox`: combobox para seleccionar/agregar alergias
- `MedicationCombobox`: combobox para seleccionar/agregar medicación
- Catálogos rápidos: `COMMON_ALLERGENS`, `COMMON_MEDICATIONS`, `ADMINISTRATION_ROUTES`

### 1.3 Componentes Relacionados con Adjuntos

**Archivo:** `src/components/pacientes/wizard/steps/Step5Adjuntos.tsx`

**Funcionalidad:**
- Usa `AdjuntosDropzone` para drag & drop de archivos
- Maneja estados: `pendiente`, `subiendo`, `cargado`, `error`
- Sincroniza `adjuntosFiles` Map con el componente padre
- Muestra alertas de progreso y errores

**Función de upload:** `uploadAdjuntosPostCreate()` en `PacienteWizard.tsx`
- Sube archivos a `/api/pacientes/${pacienteId}/adjuntos/upload`
- Maneja errores y cleanup de archivos ya subidos
- Retorna resultados de éxito/fallo por archivo

### 1.4 Endpoints y Lógica de Backend

#### 1.4.1 Endpoint Principal: `POST /api/pacientes` (`route.ts`)

**Flujo actual:**
1. Rate limiting por IP
2. RBAC: requiere rol `ADMIN` o `RECEP`
3. Idempotencia: cachea respuestas por `Idempotency-Key`
4. Valida body con `PacienteCreateBodySchema`
5. Llama a `createPaciente(data, actorUserId)`

**Campos aceptados actualmente:**
- Datos básicos: nombreCompleto, genero, fechaNacimiento, tipoDocumento, numeroDocumento, ruc, paisEmision, direccion, ciudad, pais
- Contacto: telefono, email, preferenciasContacto/Recordatorio/Cobranza
- **Datos clínicos:** alergias, medicacion, antecedentes, observaciones, vitals ❌
- Responsable: responsablePago
- **Adjuntos:** adjuntos (array) ❌

#### 1.4.2 Servicio: `createPaciente()` (`_service.create.ts`)

**Fase A (transacción):**
- Crea Persona + Documento
- Crea Contactos (teléfono + email)
- Crea Paciente
- Vincula Responsable de Pago (si existe)

**Fase B (fuera de transacción, best effort):**
- **Antecedentes:** crea `ClinicalHistoryEntry` ❌
- **Alergias:** crea `PatientAllergy` con dedupe ❌
- **Medicación:** crea `PatientMedication` con dedupe ❌
- **Vitals:** crea `PatientVitals` ❌
- Audit log: crea `AuditLog`

**Nota:** Los adjuntos NO se procesan aquí, se suben después vía endpoint separado.

#### 1.4.3 Esquemas: `_schemas.ts`

**`PacienteCreateBodySchema` incluye:**
```typescript
alergias: z.union([z.string().max(1000), z.array(AllergyInputSchema)]).optional(),
medicacion: z.union([z.string().max(1000), z.array(MedicationInputSchema)]).optional(),
antecedentes: z.string().max(2000).optional(),
observaciones: z.string().max(2000).optional(),
vitals: VitalsSchema.optional(),
adjuntos: z.array(z.any()).optional(),
```

#### 1.4.4 Repositorio: `_repo.ts`

**Funciones relacionadas:**
- `createPersonaConDocumento()`: crea persona y documento
- `createContactoTelefono()`: crea/actualiza contacto telefónico
- `createContactoEmail()`: crea/actualiza contacto email
- `createPaciente()`: crea registro de paciente
- `linkResponsablePago()`: vincula responsable

**No hay funciones específicas para datos clínicos** (se crean directamente con Prisma en `_service.create.ts`).

#### 1.4.5 Endpoint de Adjuntos: `POST /api/pacientes/[id]/adjuntos/upload`

**Ruta:** `src/app/api/pacientes/[id]/adjuntos/upload/route.ts`

**Funcionalidad:**
- Recibe FormData con archivo, tipo, descripción
- Sube a Cloudinary
- Crea registro en tabla `Adjunto`
- Retorna metadata del adjunto creado

**Uso en wizard:**
- Se llama después de crear el paciente
- Se llama por cada archivo pendiente
- Maneja cleanup si falla algún upload

---

## 2. Rediseño Funcional del Wizard

### 2.1 Nueva Estructura: 3 Pasos

```typescript
const STEPS = [
  { id: 1, name: "Identificación", required: true },
  { id: 2, name: "Contacto", required: true },
  { id: 3, name: "Responsable de Pago", required: false },
]
```

**Justificación:**
- **Paso 1 (Identificación):** Datos básicos del paciente (nombre, género, fecha nacimiento, documento, dirección)
- **Paso 2 (Contacto):** Información de contacto (teléfono, email, preferencias)
- **Paso 3 (Responsable):** Responsable de pago (opcional, solo para menores o casos especiales)

### 2.2 Campos que se Mantienen

**Paso 1 - Identificación:**
- nombreCompleto ✅
- genero ✅
- fechaNacimiento ✅
- tipoDocumento ✅
- numeroDocumento ✅
- ruc ✅
- paisEmision ✅
- direccion ✅
- ciudad ✅
- pais ✅

**Paso 2 - Contacto:**
- telefono ✅
- email ✅
- codigoPaisTelefono ✅
- preferenciasContacto ✅
- preferenciasRecordatorio ✅
- preferenciasCobranza ✅

**Paso 3 - Responsable de Pago:**
- responsablePago ✅

### 2.3 Campos que se Eliminan del Wizard

**Datos Clínicos (se gestionarán en otras pantallas):**
- alergias ❌
- medicacion ❌
- antecedentes ❌
- observaciones ❌
- vitals ❌

**Adjuntos (se gestionarán en otras pantallas):**
- adjuntos ❌

**Nota:** Estos campos seguirán existiendo en el schema del backend para compatibilidad, pero no se enviarán desde el wizard de creación.

---

## 3. Plan de Refactor en Fases

### Fase 1: Frontend (Wizard) ⚡

**Objetivo:** Eliminar pasos 3 y 5 del wizard y ajustar navegación.

**Tareas:**
1. ✅ Eliminar import de `Step3Clinicos` y `Step5Adjuntos` en `PacienteWizard.tsx`
2. ✅ Actualizar constante `STEPS` a 3 pasos
3. ✅ Eliminar estado `adjuntosFiles` y función `setAdjuntosFiles`
4. ✅ Eliminar función `uploadAdjuntosPostCreate()`
5. ✅ Actualizar `renderStep()` para solo renderizar pasos 1, 2, 3
6. ✅ Actualizar `getFieldsForStep()` para eliminar casos 3 y 5
7. ✅ Limpiar `handleSave()`: eliminar lógica de adjuntos y datos clínicos
8. ✅ Limpiar `defaultValues` del form: eliminar campos de datos clínicos y adjuntos
9. ✅ Eliminar archivos: `Step3Clinicos.tsx`, `Step5Adjuntos.tsx`

**Archivos a modificar:**
- `src/components/pacientes/wizard/PacienteWizard.tsx`
- `src/components/pacientes/wizard/steps/Step3Clinicos.tsx` (eliminar)
- `src/components/pacientes/wizard/steps/Step5Adjuntos.tsx` (eliminar)

### Fase 2: Backend / API 🔧

**Objetivo:** Ajustar endpoints y servicios para que NO procesen datos clínicos ni adjuntos durante la creación.

**Tareas:**
1. ✅ Actualizar `PacienteCreateBodySchema` en `_schemas.ts`: hacer campos clínicos y adjuntos opcionales pero ignorarlos
2. ✅ Actualizar `createPaciente()` en `_service.create.ts`: eliminar Fase B (datos clínicos)
3. ✅ Mantener compatibilidad: el schema acepta los campos pero no los procesa (para evitar errores si llegan)
4. ✅ Verificar que `route.ts` no requiera cambios (solo pasa datos al servicio)

**Archivos a modificar:**
- `src/app/api/pacientes/_schemas.ts`
- `src/app/api/pacientes/_service.create.ts`

**Nota:** Los endpoints de adjuntos (`/api/pacientes/[id]/adjuntos/upload`) se mantienen intactos para uso futuro en otras pantallas.

### Fase 3: Modelos / Esquemas / DTO 🔄

**Objetivo:** Actualizar schemas del cliente para reflejar el nuevo flujo.

**Tareas:**
1. ✅ Actualizar `PacienteCreateSchemaClient` en `paciente.schema.ts`: hacer campos clínicos y adjuntos opcionales (ya lo son)
2. ✅ Mantener tipos para compatibilidad futura (no se eliminan, solo no se usan en el wizard)
3. ✅ Verificar `_dto.ts`: no requiere cambios (solo funciones de transformación)
4. ✅ Verificar `_rbac.ts`: no requiere cambios (permisos siguen siendo los mismos)

**Archivos a modificar:**
- `src/lib/schema/paciente.schema.ts` (opcional, solo documentación)

### Fase 4: Limpieza y Coherencia 🧹

**Objetivo:** Eliminar código muerto y asegurar consistencia.

**Tareas:**
1. ✅ Buscar referencias a `Step3Clinicos` y `Step5Adjuntos` en otros archivos
2. ✅ Eliminar imports no utilizados
3. ✅ Verificar que no haya rutas rotas
4. ✅ Actualizar comentarios y documentación si es necesario
5. ✅ Verificar que los tipos TypeScript compilen sin errores

**Archivos a revisar:**
- Todos los archivos que importen componentes del wizard
- Archivos de tests si existen

---

## 4. Cambios Específicos de Código

### 4.1 `PacienteWizard.tsx`

#### ❌ Eliminar

```typescript
// Imports a eliminar
import { Step3Clinicos } from "./steps/Step3Clinicos"
import { Step5Adjuntos } from "./steps/Step5Adjuntos"
import type { AdjuntoUI } from "@/lib/schema/paciente.schema"

// Estado a eliminar
const [adjuntosFiles, setAdjuntosFiles] = useState<Map<string, File>>(new Map())

// Constante STEPS - eliminar pasos 3 y 5
const STEPS = [
  { id: 1, name: "Identificación", required: true },
  { id: 2, name: "Contacto", required: true },
  { id: 3, name: "Datos Clínicos", required: false },  // ❌
  { id: 4, name: "Responsable de Pago", required: false },
  { id: 5, name: "Adjuntos", required: false },        // ❌
]

// defaultValues - eliminar campos clínicos y adjuntos
defaultValues: {
  // ... campos básicos
  alergias: [],           // ❌
  medicacion: [],         // ❌
  antecedentes: undefined, // ❌
  observaciones: undefined, // ❌
  vitals: undefined,      // ❌
  adjuntos: [],          // ❌
}

// renderStep() - eliminar casos 3 y 5
case 3:
  return <Step3Clinicos form={form} />  // ❌
case 5:
  return <Step5Adjuntos ... />          // ❌

// getFieldsForStep() - eliminar casos 3 y 5
case 3:
  return []  // ❌
case 5:
  return []  // ❌

// handleSave() - eliminar lógica de adjuntos
// Subir adjuntos después de crear el paciente
let adjuntosMensaje: string | undefined
let adjuntosConErrores = false
if (values.adjuntos && values.adjuntos.length > 0) {
  const uploadResults = await uploadAdjuntosPostCreate(...)  // ❌
  // ... lógica de adjuntos
}

// Función completa a eliminar
async function uploadAdjuntosPostCreate(...) { ... }  // ❌
```

#### ✅ Modificar

```typescript
// Nueva constante STEPS
const STEPS = [
  { id: 1, name: "Identificación", required: true },
  { id: 2, name: "Contacto", required: true },
  { id: 3, name: "Responsable de Pago", required: false },
] as const

// defaultValues simplificado
defaultValues: {
  nombreCompleto: "",
  genero: undefined,
  fechaNacimiento: undefined,
  tipoDocumento: "CI",
  numeroDocumento: "",
  ruc: undefined,
  paisEmision: "PY",
  direccion: "",
  ciudad: "",
  pais: "PY",
  codigoPaisTelefono: "+595",
  telefono: "",
  email: "",
  preferenciasContacto: [],
  preferenciasRecordatorio: [],
  preferenciasCobranza: [],
  responsablePago: undefined,
}

// renderStep() simplificado
const renderStep = () => {
  switch (currentStep) {
    case 1:
      return <Step1Identificacion form={form} />
    case 2:
      return <Step2Contacto form={form} />
    case 3:
      return <Step4Responsable form={form} />
    default:
      return null
  }
}

// getFieldsForStep() simplificado
function getFieldsForStep(step: number): (keyof PacienteCreateFormInput)[] {
  switch (step) {
    case 1:
      return [
        "nombreCompleto",
        "genero",
        "fechaNacimiento",
        "tipoDocumento",
        "numeroDocumento",
        "paisEmision",
        "direccion",
        "ciudad",
        "pais",
      ]
    case 2:
      return ["telefono", "email", "preferenciasContacto"]
    case 3:
      return [] // Responsable es opcional
    default:
      return []
  }
}

// handleSave() simplificado (sin adjuntos)
const handleSave = async (intent: SaveIntent) => {
  setIsSubmitting(true)

  try {
    const requiredFields = [...getFieldsForStep(1), ...getFieldsForStep(2)]
    const isValid = await form.trigger(requiredFields)

    if (!isValid) {
      const firstError = Object.keys(form.formState.errors)[0]
      if (firstError) {
        const element = document.getElementById(firstError)
        element?.scrollIntoView({ behavior: "smooth", block: "center" })
        element?.focus()
      }
      toast.error("Complete los campos requeridos antes de guardar")
      setIsSubmitting(false)
      return
    }

    const inputValues = form.getValues()
    const values = PacienteCreateSchemaClient.parse(inputValues) as PacienteCreateFormOutput

    const codigoPais = inputValues.codigoPaisTelefono || "+595"
    const telefonoNormalizado = values.telefono
      ? normalizarTelefono(values.telefono, codigoPais)
      : values.telefono

    const payload = {
      nombreCompleto: values.nombreCompleto.trim(),
      genero: values.genero,
      fechaNacimiento: values.fechaNacimiento?.toISOString(),
      tipoDocumento: values.tipoDocumento,
      numeroDocumento: values.numeroDocumento,
      ruc: values.ruc,
      paisEmision: values.paisEmision,
      direccion: values.direccion,
      ciudad: values.ciudad,
      pais: values.pais,
      telefono: telefonoNormalizado,
      email: values.email && values.email.trim() ? normalizarEmail(values.email) : undefined,
      preferenciasContacto: {
        whatsapp: values.preferenciasContacto?.includes("WHATSAPP"),
        sms: values.preferenciasContacto?.includes("SMS"),
        llamada: values.preferenciasContacto?.includes("LLAMADA"),
        email: values.preferenciasContacto?.includes("EMAIL"),
      },
      preferenciasRecordatorio: {
        whatsapp: values.preferenciasRecordatorio?.includes("WHATSAPP"),
        sms: values.preferenciasRecordatorio?.includes("SMS"),
        email: values.preferenciasRecordatorio?.includes("EMAIL"),
      },
      preferenciasCobranza: {
        whatsapp: values.preferenciasCobranza?.includes("WHATSAPP"),
        sms: values.preferenciasCobranza?.includes("SMS"),
        email: values.preferenciasCobranza?.includes("EMAIL"),
      },
      responsablePago: values.responsablePago,
      // NO se envían datos clínicos ni adjuntos
    }

    console.log("[v0] Guardando paciente:", payload, "Intent:", intent)

    const idempotencyKey = `paciente-create-${Date.now()}-${Math.random().toString(36).substring(7)}`

    const response = await fetch("/api/pacientes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al crear paciente")
    }

    const result = await response.json()
    const pacienteId = result.data.idPaciente

    console.log("[v0] Paciente creado exitosamente:", pacienteId)

    // Mostrar mensaje de éxito según el intent
    switch (intent) {
      case "open":
        toast.success("Paciente creado correctamente", {
          description: `${values.nombreCompleto} (ID ${pacienteId})`,
        })
        router.push(`/pacientes/${pacienteId}`)
        break
      case "continue":
        toast.success("Paciente guardado correctamente", {
          description: `${values.nombreCompleto} (ID ${pacienteId}) - Puede continuar editando`,
        })
        // Mantener el usuario en el formulario
        break
    }
  } catch (error) {
    console.error("[v0] Error al guardar paciente:", error)
    toast.error(error instanceof Error ? error.message : "Error al crear paciente. Intente nuevamente")
  } finally {
    setIsSubmitting(false)
  }
}
```

### 4.2 `_service.create.ts`

#### ❌ Eliminar (Fase B completa)

```typescript
// ========== FASE B: fuera de transacción (best effort) ==========
// 5) Antecedentes
if (body.antecedentes) {
  await prisma.clinicalHistoryEntry.create({...}).catch(...)  // ❌
}

// 6) Alergias (dedupe in-memory y createMany)
if (alergiasArr.length > 0) {
  // ... toda la lógica de alergias  // ❌
}

// 7) Medicación (dedupe + createMany)
if (medsArr.length > 0) {
  // ... toda la lógica de medicación  // ❌
}

// 8) Vitals (si llega)
if (body.vitals) {
  await prisma.patientVitals.create({...}).catch(...)  // ❌
}
```

#### ✅ Modificar

```typescript
export async function createPaciente(body: PacienteCreateBody, actorUserId: number) {
  const { nombres, apellidos, segundoApellido } = splitNombreCompleto(body.nombreCompleto)
  const generoDB = body.genero ? mapGeneroToDB(body.genero) : "NO_ESPECIFICADO"

  // ========== FASE A: transacción corta y rápida ==========
  const { idPaciente, personaId } = await withTxRetry(async (tx) => {
    // 1) Persona + Documento
    const persona = await pacienteRepo.createPersonaConDocumento(tx, {...})

    // 2) Contactos (dedupe + principal por tipo)
    const telNorm = normalizarTelefono(body.telefono)
    const movil = esMovilPY(telNorm)
    
    const telefonoPreferRecordatorio = !!(body.preferenciasRecordatorio?.whatsapp || body.preferenciasRecordatorio?.sms)
    const telefonoPreferCobranza = !!(body.preferenciasCobranza?.whatsapp || body.preferenciasCobranza?.sms) && !body.email
    
    await pacienteRepo.createContactoTelefono(tx, {...})

    if (body.email) {
      const emailNorm = normalizarEmail(body.email)
      await pacienteRepo.createContactoEmail(tx, {...})
    }

    // 3) Paciente (metadatos)
    const notasJson: Record<string, unknown> = {}
    if (body.ciudad) notasJson.ciudad = body.ciudad
    if (body.pais) notasJson.pais = body.pais
    if (body.observaciones) notasJson.observaciones = body.observaciones

    const paciente = await pacienteRepo.createPaciente(tx, {
      personaId: persona.idPersona,
      notasJson,
    })

    // 4) Responsable de pago (si hay)
    if (body.responsablePago?.personaId) {
      // ... lógica de responsable
    }

    return { idPaciente: paciente.idPaciente, personaId: persona.idPersona }
  }, { maxWaitMs: 10_000, timeoutMs: 30_000, attempts: 2 })

  // ========== FASE B: Audit (no bloqueante) ==========
  await prisma.auditLog.create({
    data: {
      action: "PATIENT_CREATE",
      entity: "Patient",
      entityId: idPaciente,
      actorId: actorUserId,
      metadata: { nombreCompleto: body.nombreCompleto, documento: body.numeroDocumento } as Prisma.InputJsonValue,
    },
  }).catch((e) => console.error("[warn] audit create failed", e))

  // ========== DTO final para UI ==========
  const item = await pacienteRepo.getPacienteUI(idPaciente)
  return { idPaciente, personaId, item }
}
```

**Nota:** Los campos `alergias`, `medicacion`, `antecedentes`, `vitals` se eliminan del procesamiento pero se mantienen en el tipo `PacienteCreateBody` para compatibilidad (se ignoran silenciosamente).

### 4.3 `_schemas.ts`

#### ✅ Modificar (hacer campos opcionales y documentar que se ignoran)

```typescript
export const PacienteCreateBodySchema = z.object({
  nombreCompleto: z.string().min(1).max(200),
  genero: z.enum(["M","F","X"]).optional(),
  fechaNacimiento: z.string().optional(),
  tipoDocumento: TipoDocumentoEnum.default("CI"),
  numeroDocumento: z.string().min(1).max(50),
  ruc: z.string().max(50).optional(),
  paisEmision: z.string().length(2).default("PY"),
  direccion: z.string().max(300).optional(),
  ciudad: z.string().max(100).optional(),
  pais: z.string().length(2).default("PY"),
  telefono: z.string().min(1).max(50),
  email: z.string().email().optional(),

  preferenciasContacto: z.object({...}).optional(),
  preferenciasRecordatorio: z.object({...}).optional(),
  preferenciasCobranza: z.object({...}).optional(),

  // ⚠️ DEPRECATED: Estos campos se ignoran durante la creación del paciente.
  // Los datos clínicos deben gestionarse en otras pantallas después de crear el paciente.
  alergias: z.union([z.string().max(1000), z.array(AllergyInputSchema)]).optional(),
  medicacion: z.union([z.string().max(1000), z.array(MedicationInputSchema)]).optional(),
  antecedentes: z.string().max(2000).optional(),
  observaciones: z.string().max(2000).optional(),
  vitals: VitalsSchema.optional(),
  adjuntos: z.array(z.any()).optional(),

  responsablePago: z.object({...}).optional(),
})
```

### 4.4 Archivos a Eliminar

- `src/components/pacientes/wizard/steps/Step3Clinicos.tsx` ❌
- `src/components/pacientes/wizard/steps/Step5Adjuntos.tsx` ❌

---

## 5. Validación Final

### 5.1 Pruebas Manuales (QA)

**Flujo básico de creación de paciente:**

1. **Navegación:**
   - ✅ Ir a `/pacientes/nuevo`
   - ✅ Verificar que solo hay 3 pasos en el header
   - ✅ Verificar que el paso 1 muestra "Identificación"
   - ✅ Verificar que el paso 2 muestra "Contacto"
   - ✅ Verificar que el paso 3 muestra "Responsable de Pago"

2. **Paso 1 - Identificación:**
   - ✅ Completar todos los campos requeridos
   - ✅ Validar que muestra errores si falta algún campo
   - ✅ Hacer clic en "Siguiente" → debe avanzar al paso 2

3. **Paso 2 - Contacto:**
   - ✅ Completar teléfono y email
   - ✅ Seleccionar preferencias de contacto
   - ✅ Validar formato de teléfono y email
   - ✅ Hacer clic en "Siguiente" → debe avanzar al paso 3

4. **Paso 3 - Responsable de Pago:**
   - ✅ Opcional: buscar/seleccionar responsable o continuar sin seleccionar
   - ✅ Hacer clic en "Anterior" → debe retroceder al paso 2

5. **Guardar paciente:**
   - ✅ Hacer clic en "Guardar y Abrir" → debe crear paciente y navegar a `/pacientes/{id}`
   - ✅ Hacer clic en "Guardar y Continuar" → debe crear paciente y mostrar mensaje de éxito
   - ✅ Verificar que el paciente se crea correctamente en la BD
   - ✅ Verificar que NO se crean registros de alergias, medicación, antecedentes, vitals
   - ✅ Verificar que NO se suben adjuntos

6. **Validaciones:**
   - ✅ Intentar guardar sin completar paso 1 → debe mostrar error
   - ✅ Intentar guardar sin completar paso 2 → debe mostrar error
   - ✅ Verificar que los mensajes de error son claros

### 5.2 Verificaciones Técnicas

1. **Compilación:**
   ```bash
   npm run build
   # o
   npx tsc --noEmit
   ```
   - ✅ No debe haber errores de TypeScript
   - ✅ No debe haber imports rotos

2. **Linter:**
   ```bash
   npm run lint
   ```
   - ✅ No debe haber errores de linting

3. **Búsqueda de referencias rotas:**
   ```bash
   # Buscar referencias a Step3Clinicos
   grep -r "Step3Clinicos" src/
   
   # Buscar referencias a Step5Adjuntos
   grep -r "Step5Adjuntos" src/
   ```
   - ✅ No debe haber referencias fuera del archivo eliminado

4. **Verificar endpoints:**
   - ✅ `POST /api/pacientes` debe funcionar sin campos clínicos
   - ✅ `POST /api/pacientes` debe ignorar campos clínicos si se envían
   - ✅ Los endpoints de adjuntos (`/api/pacientes/[id]/adjuntos/upload`) deben seguir funcionando para uso futuro

### 5.3 Pruebas de Integración (Opcional)

**Si hay tests existentes:**

1. ✅ Actualizar tests del wizard para reflejar 3 pasos
2. ✅ Actualizar tests de `createPaciente()` para verificar que NO procesa datos clínicos
3. ✅ Agregar tests que verifiquen que los campos clínicos se ignoran silenciosamente

**Ejemplo de test:**

```typescript
describe("createPaciente", () => {
  it("should ignore clinical data fields", async () => {
    const body = {
      nombreCompleto: "Test Patient",
      // ... campos básicos
      alergias: [{ label: "Penicilina", severity: "MODERATE" }],
      medicacion: [{ label: "Aspirina" }],
      antecedentes: "Test antecedentes",
      vitals: { heightCm: 170, weightKg: 70 },
    }

    const result = await createPaciente(body, 1)

    // Verificar que el paciente se crea
    expect(result.idPaciente).toBeDefined()

    // Verificar que NO se crearon alergias
    const alergias = await prisma.patientAllergy.findMany({
      where: { pacienteId: result.idPaciente },
    })
    expect(alergias).toHaveLength(0)

    // Verificar que NO se creó medicación
    const medicacion = await prisma.patientMedication.findMany({
      where: { pacienteId: result.idPaciente },
    })
    expect(medicacion).toHaveLength(0)

    // Verificar que NO se crearon vitals
    const vitals = await prisma.patientVitals.findFirst({
      where: { pacienteId: result.idPaciente },
    })
    expect(vitals).toBeNull()
  })
})
```

---

## 6. Checklist Final

### Frontend
- [ ] Eliminar `Step3Clinicos.tsx`
- [ ] Eliminar `Step5Adjuntos.tsx`
- [ ] Actualizar `PacienteWizard.tsx` (STEPS, renderStep, getFieldsForStep, handleSave)
- [ ] Eliminar estado `adjuntosFiles`
- [ ] Eliminar función `uploadAdjuntosPostCreate`
- [ ] Limpiar `defaultValues` del form

### Backend
- [ ] Actualizar `_service.create.ts` (eliminar Fase B de datos clínicos)
- [ ] Actualizar `_schemas.ts` (documentar campos deprecated)
- [ ] Verificar que `route.ts` no requiere cambios

### Validación
- [ ] Compilar sin errores
- [ ] Linter sin errores
- [ ] Probar flujo completo manualmente
- [ ] Verificar que no se crean datos clínicos
- [ ] Verificar que no se suben adjuntos
- [ ] Verificar navegación entre pasos

---

## 7. Notas Adicionales

### Compatibilidad hacia atrás

Los campos clínicos y adjuntos se mantienen en los schemas para evitar errores si algún cliente antiguo los envía. Se ignoran silenciosamente durante el procesamiento.

### Futuras pantallas

Los datos clínicos y adjuntos se gestionarán en:
- **Datos clínicos:** Pantalla de historia clínica del paciente (`/pacientes/[id]/historia`)
- **Adjuntos:** Pantalla de adjuntos del paciente (`/pacientes/[id]/adjuntos`)

Estas pantallas ya existen y funcionan independientemente del wizard de creación.

---

**Fin del documento**

