# Roadmap Técnico: Completar Funcionalidades Clínicas del Sistema

## 📋 Resumen Ejecutivo

**Objetivo:** Completar todas las funcionalidades faltantes y limitaciones identificadas en el análisis MVP para alcanzar un sistema clínico completo, profesional y funcional.

**Estado Actual:** 75% de cobertura funcional  
**Objetivo Final:** 100% de cobertura funcional con mejoras de calidad

**Duración Estimada Total:** 3-4 semanas  
**Esfuerzo Estimado:** 40-50 horas de desarrollo

---

## 🎯 Fases del Roadmap

### **FASE 1: Funcionalidades Críticas para Producción** 🔴
**Duración:** 1 semana  
**Esfuerzo:** 12-16 horas  
**Prioridad:** ALTA - Bloqueante para uso en producción

### **FASE 2: Integraciones Clínicas Esenciales** 🟡
**Duración:** 1 semana  
**Esfuerzo:** 12-16 horas  
**Prioridad:** MEDIA - Mejora significativa de funcionalidad

### **FASE 3: Optimizaciones y Completitud** 🟢
**Duración:** 1-2 semanas  
**Esfuerzo:** 16-18 horas  
**Prioridad:** BAJA - Mejoras de calidad y completitud

---

## 📦 FASE 1: Funcionalidades Críticas para Producción

### **Objetivo**
Implementar funcionalidades esenciales que faltan para uso clínico completo: signos vitales y acceso a alergias durante la consulta.

### **Requisitos Previos**
- ✅ Schema de base de datos completo (`PatientVitals`, `PatientAllergy`)
- ✅ Componentes base de UI (`Card`, `Button`, `Input`, `Dialog`, etc.)
- ✅ Sistema de autenticación y RBAC funcionando
- ✅ API base de consulta funcionando

### **Tareas Técnicas**

#### **Tarea 1.1: Módulo de Signos Vitales en Consulta**

**Archivos a Crear:**
- `src/components/consulta-clinica/modules/VitalesModule.tsx`
- `src/app/api/agenda/citas/[id]/consulta/vitales/route.ts`
- `src/app/api/agenda/citas/[id]/consulta/vitales/_schemas.ts`

**Archivos a Modificar:**
- `src/app/api/agenda/citas/[id]/consulta/_dto.ts` - Agregar `VitalesDTO`
- `src/app/api/agenda/citas/[id]/consulta/_service.ts` - Agregar mapeo de vitales
- `src/components/consulta-clinica/ConsultaClinicaWorkspace.tsx` - Agregar tab de vitales

**Especificaciones Técnicas:**

1. **DTO (`_dto.ts`):**
```typescript
export interface VitalesDTO {
  id: number
  measuredAt: string
  heightCm: number | null
  weightKg: number | null
  bmi: number | null
  bpSyst: number | null
  bpDiast: number | null
  heartRate: number | null
  notes: string | null
  createdBy: {
    id: number
    nombre: string
  }
}
```

2. **Schema Zod (`_schemas.ts`):**
```typescript
export const createVitalesSchema = z.object({
  heightCm: z.number().int().min(0).max(300).nullable().optional(),
  weightKg: z.number().int().min(0).max(500).nullable().optional(),
  bpSyst: z.number().int().min(0).max(300).nullable().optional(),
  bpDiast: z.number().int().min(0).max(200).nullable().optional(),
  heartRate: z.number().int().min(0).max(300).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  measuredAt: z.string().datetime().optional(),
})
```

3. **Componente (`VitalesModule.tsx`):**
- Formulario con campos numéricos para cada signo vital
- Cálculo automático de BMI cuando hay altura y peso
- Validación de rangos razonables
- Visualización de último registro si existe
- Botón "Registrar Nuevos Signos Vitales"
- Búsqueda y filtrado (si hay múltiples registros)
- CRUD completo con validaciones

4. **API Route (`route.ts`):**
- GET: Obtener signos vitales de la consulta (o del paciente si no hay en consulta)
- POST: Crear nuevos signos vitales vinculados a `consultaId`
- PUT: Actualizar signos vitales existentes
- DELETE: Eliminar signos vitales (soft delete recomendado)
- Validación RBAC (solo ODONT/ADMIN)
- Validación de estado de consulta (no FINAL)

**Resultado Esperado:**
- Módulo funcional de signos vitales integrado en `ConsultaClinicaWorkspace`
- API completa con validaciones
- Cálculo automático de BMI
- Visualización clara de datos

---

#### **Tarea 1.2: Acceso a Alergias Durante Consulta**

**Archivos a Crear:**
- `src/components/consulta-clinica/modules/AlergiasModule.tsx`

**Archivos a Modificar:**
- `src/app/api/agenda/citas/[id]/consulta/_dto.ts` - Agregar `AlergiasDTO[]`
- `src/app/api/agenda/citas/[id]/consulta/_service.ts` - Agregar consulta de alergias del paciente
- `src/components/consulta-clinica/ConsultaClinicaWorkspace.tsx` - Agregar tab de alergias

**Especificaciones Técnicas:**

1. **Componente (`AlergiasModule.tsx`):**
- **Modo Solo Lectura (Recomendado para MVP):**
  - Mostrar alergias activas del paciente
  - Badge de severidad (MILD, MODERATE, SEVERE)
  - Mostrar reacciones documentadas
  - Botón "Ver en Historia del Paciente" (link a vista de paciente)
  - Mensaje si no hay alergias registradas


2. **API:**
- Usar endpoint existente `/api/pacientes/[id]/alergias` para obtener alergias
- O crear endpoint específico `/api/agenda/citas/[id]/consulta/alergias` que consulte alergias del paciente

**Resultado Esperado:**
- Módulo de alergias visible durante consulta
- Acceso rápido a información crítica de seguridad
- Visualización clara de severidad y reacciones

---

#### **Tarea 1.3: Integración de Módulos en Workspace**

**Archivos a Modificar:**
- `src/components/consulta-clinica/ConsultaClinicaWorkspace.tsx`

**Especificaciones Técnicas:**

1. Agregar nuevos tabs:
```typescript
<TabsTrigger value="vitales">
  <Activity className="h-4 w-4" />
  <span className="hidden sm:inline">Signos Vitales</span>
</TabsTrigger>
<TabsTrigger value="alergias">
  <AlertTriangle className="h-4 w-4" />
  <span className="hidden sm:inline">Alergias</span>
</TabsTrigger>
```

2. Agregar TabsContent correspondientes:
```typescript
<TabsContent value="vitales">
  <VitalesModule 
    citaId={citaId} 
    consulta={consulta} 
    canEdit={canEditModules} 
    hasConsulta={hasConsulta}
    onUpdate={fetchConsulta} 
  />
</TabsContent>
```

3. Actualizar `TabsList` para ajustar grid (de 7 a 9 tabs):
```typescript
<TabsList className="grid w-full grid-cols-4 lg:grid-cols-9">
```

**Resultado Esperado:**
- Workspace actualizado con nuevos módulos integrados
- Navegación funcional entre todos los tabs

---

### **Prompt Técnico para Fase 1**

```
Implementar módulos críticos faltantes para completar funcionalidad clínica esencial:

1. CREAR módulo de Signos Vitales:
   - Componente: src/components/consulta-clinica/modules/VitalesModule.tsx
   - API: src/app/api/agenda/citas/[id]/consulta/vitales/route.ts
   - Schema: src/app/api/agenda/citas/[id]/consulta/vitales/_schemas.ts
   - DTO: Agregar VitalesDTO a _dto.ts
   - Service: Agregar mapeo en _service.ts
   - Campos: heightCm, weightKg, bmi (calculado), bpSyst, bpDiast, heartRate, notes
   - Validaciones: Rangos razonables, cálculo automático de BMI
   - CRUD completo con RBAC y validación de estado de consulta

2. CREAR módulo de Alergias (solo lectura):
   - Componente: src/components/consulta-clinica/modules/AlergiasModule.tsx
   - Mostrar alergias activas del paciente con severidad y reacciones
   - Badge de severidad (MILD/MODERATE/SEVERE)
   - Link a vista completa de paciente si se necesita editar

3. INTEGRAR módulos en ConsultaClinicaWorkspace:
   - Agregar tabs "Signos Vitales" y "Alergias"
   - Actualizar TabsList grid a 9 columnas
   - Pasar props correctas (canEditModules, hasConsulta, onUpdate)

Requisitos:
- Seguir patrones existentes de otros módulos (AnamnesisModule, DiagnosticosModule)
- Validaciones Zod en frontend y backend
- Manejo de errores robusto
- UI consistente con diseño existente
- Logs de debug para troubleshooting
```

---

## 📦 FASE 2: Integraciones Clínicas Esenciales

### **Objetivo**
Integrar funcionalidades existentes que no están accesibles durante la consulta: planes de tratamiento y campos directos de consulta.

### **Requisitos Previos**
- ✅ Fase 1 completada
- ✅ Schema `TreatmentPlan` y `TreatmentStep` existente
- ✅ API de planes de tratamiento funcionando (si existe)

### **Tareas Técnicas**

#### **Tarea 2.1: Campos Directos de Consulta (reason, diagnosis, clinicalNotes)**

**Archivos a Crear:**
- `src/components/consulta-clinica/modules/ResumenModule.tsx` (opcional, o agregar al header)

**Archivos a Modificar:**
- `src/app/api/agenda/citas/[id]/consulta/route.ts` - Agregar PUT para actualizar campos
- `src/app/api/agenda/citas/[id]/consulta/_schemas.ts` - Agregar schema de actualización
- `src/components/consulta-clinica/ConsultaClinicaWorkspace.tsx` - Agregar sección editable

**Especificaciones Técnicas:**

1. **Opción A - Sección Expandible en Header (Recomendada):**
   - Agregar botón "Editar Resumen" en header de `ConsultaClinicaWorkspace`
   - Dialog o Accordion con campos:
     - `reason` (Textarea) - Motivo de consulta
     - `diagnosis` (Textarea) - Diagnóstico general
     - `clinicalNotes` (Textarea) - Notas clínicas generales
   - Guardar con botón "Guardar Cambios"
   - Mostrar valores actuales si existen

2. **Opción B - Nuevo Tab "Resumen":**
   - Crear `ResumenModule.tsx` similar a otros módulos
   - Formulario con los tres campos
   - Guardado automático o manual

3. **API:**
```typescript
// PUT /api/agenda/citas/[id]/consulta
{
  reason?: string | null
  diagnosis?: string | null
  clinicalNotes?: string | null
}
```

**Resultado Esperado:**
- Campos `reason`, `diagnosis`, `clinicalNotes` editables durante consulta
- Valores guardados correctamente en base de datos
- Visualización de valores existentes

---

#### **Tarea 2.2: Integración de Planes de Tratamiento en Consulta**

**Archivos a Crear:**
- `src/components/consulta-clinica/modules/PlanesTratamientoModule.tsx`
- `src/app/api/agenda/citas/[id]/consulta/planes/route.ts` (si no existe)

**Archivos a Modificar:**
- `src/app/api/agenda/citas/[id]/consulta/_dto.ts` - Agregar `PlanTratamientoDTO`
- `src/app/api/agenda/citas/[id]/consulta/_service.ts` - Agregar consulta de planes
- `src/components/consulta-clinica/modules/ProcedimientosModule.tsx` - Agregar selector de `treatmentStepId`
- `src/components/consulta-clinica/ConsultaClinicaWorkspace.tsx` - Agregar tab o sección

**Especificaciones Técnicas:**

1. **Componente `PlanesTratamientoModule.tsx`:**
   - Mostrar plan activo del paciente (si existe)
   - Lista de pasos del plan con estado (PENDING, SCHEDULED, IN_PROGRESS, COMPLETED)
   - Visualización de:
     - Orden del paso
     - Procedimiento (catálogo o texto libre)
     - Diente y superficie (si aplica)
     - Costo estimado
     - Prioridad
     - Estado
   - Botón "Ver Plan Completo" (link a vista de planes)
   - Opcional: Botón "Crear Nuevo Plan" (si no existe)

2. **Modificar `ProcedimientosModule.tsx`:**
   - Agregar campo opcional "Vincular a Plan de Tratamiento"
   - Selector de `treatmentStepId` si hay plan activo
   - Al crear procedimiento, actualizar estado del paso a COMPLETED si se vincula

3. **API:**
   - GET `/api/agenda/citas/[id]/consulta/planes` - Obtener plan activo del paciente
   - O usar endpoint existente `/api/pacientes/[id]/planes` filtrando por `isActive: true`

**Resultado Esperado:**
- Visualización de plan activo durante consulta
- Vinculación de procedimientos a pasos del plan
- Actualización automática de estados de pasos

---

#### **Tarea 2.3: Selector de Catálogo de Procedimientos**

**Archivos a Modificar:**
- `src/components/consulta-clinica/modules/ProcedimientosModule.tsx`
- `src/app/api/agenda/citas/[id]/consulta/procedimientos/route.ts`
- `src/app/api/agenda/citas/[id]/consulta/procedimientos/_schemas.ts`

**Archivos a Crear (si no existen):**
- `src/app/api/procedimientos/catalogo/route.ts` - Endpoint para listar catálogo

**Especificaciones Técnicas:**

1. **Modificar `ProcedimientosModule.tsx`:**
   - Agregar selector de catálogo antes del campo `serviceType`
   - Si se selecciona del catálogo:
     - Pre-llenar `serviceType` con nombre del procedimiento
     - Mostrar descripción del procedimiento
     - Pre-llenar `unitPriceCents` si existe precio por defecto
     - Habilitar campos de diente/superficie si `aplicaDiente` o `aplicaSuperficie` es true
   - Si no se selecciona del catálogo:
     - Permitir texto libre en `serviceType`

2. **API de Catálogo:**
```typescript
// GET /api/procedimientos/catalogo?activo=true
// Retorna lista de ProcedimientoCatalogo con:
// - idProcedimiento
// - code
// - nombre
// - descripcion
// - defaultPriceCents
// - aplicaDiente
// - aplicaSuperficie
```

3. **Actualizar Schema:**
   - Agregar `procedureId` al schema de creación
   - Validar que si viene `procedureId`, no se requiera `serviceType`

**Resultado Esperado:**
- Selector de catálogo funcional en creación de procedimientos
- Pre-llenado automático de campos relacionados
- Validación correcta de campos según tipo de procedimiento

---

### **Prompt Técnico para Fase 2**

```
Implementar integraciones clínicas esenciales para completar funcionalidad:

1. HABILITAR edición de campos directos de Consulta:
   - Agregar sección expandible o tab "Resumen" en ConsultaClinicaWorkspace
   - Campos editables: reason (motivo), diagnosis (diagnóstico general), clinicalNotes (notas clínicas)
   - API: PUT /api/agenda/citas/[id]/consulta con validación de estado (no FINAL)
   - Schema: Agregar updateConsultaSchema en _schemas.ts
   - UI: Textareas con contador de caracteres, validaciones

2. INTEGRAR Planes de Tratamiento en consulta:
   - Componente: PlanesTratamientoModule.tsx para mostrar plan activo
   - Visualizar pasos del plan con estados y detalles
   - Modificar ProcedimientosModule para agregar selector de treatmentStepId
   - Al vincular procedimiento a paso, actualizar estado del paso a COMPLETED
   - API: Usar endpoint existente de planes o crear específico para consulta

3. AGREGAR selector de catálogo de procedimientos:
   - Modificar ProcedimientosModule para incluir selector de ProcedimientoCatalogo
   - Pre-llenar campos según catálogo seleccionado (nombre, precio, diente/superficie)
   - API: Crear o usar endpoint GET /api/procedimientos/catalogo
   - Validación: Si viene procedureId, serviceType opcional

Requisitos:
- Mantener compatibilidad con código existente
- Validaciones Zod completas
- Manejo de estados de carga y errores
- UI consistente con módulos existentes
```

---

## 📦 FASE 3: Optimizaciones y Completitud

### **Objetivo**
Completar funcionalidades opcionales y optimizar la experiencia del usuario con mejoras de calidad.

### **Requisitos Previos**
- ✅ Fase 1 completada
- ✅ Fase 2 completada
- ✅ Sistema funcionando correctamente

### **Tareas Técnicas**

#### **Tarea 3.1: Campos de Costos en Procedimientos**

**Archivos a Modificar:**
- `src/components/consulta-clinica/modules/ProcedimientosModule.tsx`
- `src/app/api/agenda/citas/[id]/consulta/procedimientos/_schemas.ts`

**Especificaciones Técnicas:**

1. **Agregar campos al formulario:**
   - `unitPriceCents` (Input numérico) - Precio unitario en centavos
   - `totalCents` (Input numérico, calculado automáticamente) - Total = unitPriceCents × quantity
   - Formato de visualización: Mostrar en formato monetario (ej: $50.00)
   - Validación: Solo números positivos

2. **Lógica de cálculo:**
   - Si se cambia `quantity` o `unitPriceCents`, calcular `totalCents` automáticamente
   - Si viene `procedureId` del catálogo y tiene `defaultPriceCents`, pre-llenar `unitPriceCents`

3. **Actualizar Schema:**
   - Agregar `unitPriceCents` y `totalCents` al schema de creación/actualización
   - Validación: `totalCents` debe ser igual a `unitPriceCents × quantity` si ambos están presentes

**Resultado Esperado:**
- Campos de costos funcionales en procedimientos
- Cálculo automático de total
- Pre-llenado desde catálogo si aplica

---

#### **Tarea 3.2: Mejoras de UX en Módulos Existentes**

**Archivos a Modificar:**
- Todos los módulos en `src/components/consulta-clinica/modules/`

**Especificaciones Técnicas:**

1. **Mejoras Generales:**
   - Agregar tooltips informativos en campos complejos
   - Mejorar mensajes de error con sugerencias
   - Agregar confirmaciones antes de eliminar datos importantes
   - Mejorar estados de carga (skeletons más específicos)

2. **Mejoras Específicas por Módulo:**
   - **AnamnesisModule:** Sugerencias de títulos comunes
   - **DiagnosticosModule:** Autocompletado de códigos CIE-10 (si hay catálogo)
   - **ProcedimientosModule:** Validación de diente válido (1-32 o 51-85)
   - **MedicacionesModule:** Sugerencias de dosis comunes por medicamento
   - **OdontogramaModule:** Atajos de teclado para estados comunes
   - **PeriodontogramaModule:** Validación de rangos de mediciones

3. **Mejoras de Accesibilidad:**
   - Agregar `aria-label` a todos los botones sin texto visible
   - Mejorar navegación por teclado
   - Contraste de colores adecuado
   - Etiquetas asociadas correctamente a inputs

**Resultado Esperado:**
- Interfaz más intuitiva y accesible
- Menos errores de usuario
- Mejor experiencia general

---

#### **Tarea 3.3: Validaciones Adicionales y Robustez**

**Archivos a Modificar:**
- Todos los schemas en `src/app/api/agenda/citas/[id]/consulta/*/_schemas.ts`
- Todos los componentes de módulos

**Especificaciones Técnicas:**

1. **Validaciones de Negocio:**
   - Validar que no se puedan crear procedimientos/diagnósticos si consulta está FINAL
   - Validar rangos razonables de valores (presión arterial, frecuencia cardíaca, etc.)
   - Validar formato de códigos (CIE-10, etc.)
   - Validar fechas (no futuras para registros clínicos)

2. **Manejo de Errores:**
   - Mensajes de error específicos y accionables
   - Logging detallado en backend para debugging
   - Manejo de errores de red (reintentos, mensajes claros)
   - Validación de permisos antes de mostrar acciones

3. **Optimizaciones de Performance:**
   - Lazy loading de módulos pesados (odontograma, periodontograma)
   - Debounce en búsquedas
   - Memoización de cálculos costosos
   - Optimización de queries de base de datos

**Resultado Esperado:**
- Sistema más robusto y confiable
- Mejor experiencia de usuario
- Menos bugs y errores

---

#### **Tarea 3.4: Documentación y Testing**

**Archivos a Crear:**
- `docs/API_CONSULTA_CLINICA.md` - Documentación de API
- `docs/MODULOS_CONSULTA.md` - Documentación de componentes
- Tests unitarios para módulos críticos

**Especificaciones Técnicas:**

1. **Documentación de API:**
   - Endpoints disponibles
   - Parámetros requeridos/opcionales
   - Respuestas esperadas
   - Códigos de error
   - Ejemplos de requests/responses

2. **Documentación de Componentes:**
   - Props de cada módulo
   - Estados manejados
   - Eventos emitidos
   - Ejemplos de uso

3. **Testing:**
   - Tests unitarios para funciones de cálculo (BMI, totales)
   - Tests de integración para flujos críticos
   - Tests de validación de schemas

**Resultado Esperado:**
- Documentación completa y actualizada
- Tests que aseguren calidad
- Facilita mantenimiento futuro

---

### **Prompt Técnico para Fase 3**

```
Implementar optimizaciones y completitud del sistema:

1. AGREGAR campos de costos en ProcedimientosModule:
   - Campos: unitPriceCents, totalCents (calculado automáticamente)
   - Formato monetario en visualización
   - Cálculo automático: totalCents = unitPriceCents × quantity
   - Pre-llenado desde catálogo si tiene defaultPriceCents
   - Validación: totalCents debe coincidir con cálculo

2. MEJORAR UX en módulos existentes:
   - Tooltips informativos en campos complejos
   - Mensajes de error mejorados con sugerencias
   - Confirmaciones antes de eliminar
   - Validaciones específicas por módulo (rangos, formatos)
   - Mejoras de accesibilidad (aria-labels, navegación por teclado)

3. AGREGAR validaciones adicionales:
   - Validar estado de consulta antes de crear/editar
   - Validar rangos razonables de valores clínicos
   - Validar formatos de códigos (CIE-10, etc.)
   - Manejo robusto de errores con mensajes específicos
   - Optimizaciones de performance (lazy loading, debounce, memoización)

4. CREAR documentación:
   - Documentación de API (endpoints, parámetros, respuestas)
   - Documentación de componentes (props, estados, eventos)
   - Tests unitarios para funciones críticas
   - Tests de integración para flujos principales

Requisitos:
- No romper funcionalidad existente
- Mantener consistencia de código
- Seguir mejores prácticas de desarrollo
- Documentación clara y completa
```

---

## 📊 Resumen de Fases

| Fase | Duración | Esfuerzo | Prioridad | Entregables |
|------|----------|----------|-----------|-------------|
| **Fase 1** | 1 semana | 12-16h | 🔴 ALTA | Signos vitales, Alergias, Integración |
| **Fase 2** | 1 semana | 12-16h | 🟡 MEDIA | Campos consulta, Planes tratamiento, Catálogo |
| **Fase 3** | 1-2 semanas | 16-18h | 🟢 BAJA | Costos, UX, Validaciones, Documentación |
| **TOTAL** | 3-4 semanas | 40-50h | - | Sistema 100% funcional |

---

## ✅ Criterios de Éxito por Fase

### **Fase 1 - Completado cuando:**
- ✅ Módulo de signos vitales funcional y probado
- ✅ Módulo de alergias visible durante consulta
- ✅ Ambos módulos integrados en workspace
- ✅ Tests manuales pasando

### **Fase 2 - Completado cuando:**
- ✅ Campos directos de consulta editables
- ✅ Planes de tratamiento visibles en consulta
- ✅ Procedimientos vinculables a pasos de plan
- ✅ Selector de catálogo funcionando

### **Fase 3 - Completado cuando:**
- ✅ Campos de costos implementados
- ✅ Mejoras de UX aplicadas
- ✅ Validaciones robustas funcionando
- ✅ Documentación completa
- ✅ Tests implementados

---

## 🚀 Orden de Implementación Recomendado

1. **Semana 1:** Fase 1 completa
2. **Semana 2:** Fase 2 completa
3. **Semanas 3-4:** Fase 3 (puede hacerse en paralelo con uso del sistema)

---

## 📝 Notas de Implementación

### **Patrones a Seguir:**
- Usar mismo patrón de componentes que `AnamnesisModule` o `DiagnosticosModule`
- Validaciones Zod en frontend y backend
- Manejo de errores con `toast.error()` y mensajes claros
- Estados de carga con `isSubmitting`, `isLoading`
- RBAC en todos los endpoints
- Validación de estado de consulta (no FINAL) antes de editar

### **Archivos de Referencia:**
- `src/components/consulta-clinica/modules/AnamnesisModule.tsx` - Patrón de módulo completo
- `src/app/api/agenda/citas/[id]/consulta/anamnesis/route.ts` - Patrón de API
- `src/app/api/agenda/citas/[id]/consulta/_schemas.ts` - Patrón de validación

### **Consideraciones:**
- Mantener compatibilidad con datos existentes
- No romper funcionalidad actual
- Agregar migraciones de base de datos si es necesario
- Actualizar tipos TypeScript en `_dto.ts`
- Agregar logs de debug para troubleshooting

---

**Fecha de Creación:** 2025-11-12  
**Versión del Roadmap:** 1.0  
**Estado:** Listo para implementación

