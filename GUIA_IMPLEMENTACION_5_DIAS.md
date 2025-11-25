# Guía de Implementación - MVP Ficha de Paciente
## Plan de Trabajo: 5 Días

**Objetivo:** Completar todas las funcionalidades del MVP de la ficha de paciente según `GUIA_DISEÑO_FICHA_PACIENTE.md` y tener un sistema funcional y probado.

---

## 📅 Día 1: Header, Permisos y Edición de Datos Básicos

### 🎯 Objetivos del Día
- ✅ Implementar edición completa del header del paciente
- ✅ Configurar permisos por rol correctamente
- ✅ Integrar audit log para cambios críticos
- ✅ Mejorar visualización de banderas de riesgo
- ✅ Testing básico de edición y permisos

### 📋 Tareas Específicas

#### 1. Componente `EditPatientSheet` (2-3 horas)
**Archivo:** `src/components/pacientes/EditPatientSheet.tsx` (ya existe, mejorar)

**Tareas:**
- [ ] Verificar que el componente existente tenga todos los campos necesarios:
  - Identidad: firstName, lastName, secondLastName, dateOfBirth, gender
  - Documento: documentType, documentNumber, documentIssueDate, documentExpiryDate
  - Contacto: phone, email, emergencyContact (name, phone, relation)
  - Ubicación: city, country, address
- [ ] Agregar validaciones con Zod según `patientUpdateBodySchema`
- [ ] Implementar secciones con `Accordion` o `Tabs` para organizar campos
- [ ] Agregar indicadores visuales de campos requeridos
- [ ] Implementar estado de carga durante guardado

**Componentes a usar:**
- `Sheet` de shadcn/ui
- `Form` de react-hook-form
- `Input`, `Select`, `DatePicker` (flatpickr)
- `Button`, `Label`

#### 2. Confirmación de Cambios Críticos (1-2 horas)
**Archivo:** `src/components/pacientes/ConfirmCriticalChangeDialog.tsx` (nuevo)

**Tareas:**
- [ ] Crear componente de diálogo de confirmación
- [ ] Mostrar diff visual de cambios críticos (nombre, documento, fecha nacimiento)
- [ ] Implementar lógica para detectar cambios críticos
- [ ] Agregar campo de "motivo del cambio" para cambios críticos
- [ ] Integrar con `EditPatientSheet`

**Ejemplo de diff:**
```
Nombre: "Juan Pérez" → "Juan Carlos Pérez"
Documento: "1234567" → "1234568"
```

#### 3. Integración de Audit Log (1-2 horas)
**Archivo:** `src/app/api/pacientes/[id]/route.ts` (modificar PATCH)

**Tareas:**
- [ ] Verificar que el endpoint PATCH ya registre en audit log
- [ ] Asegurar que se registren todos los campos críticos:
  - Nombre completo
  - Documento
  - Fecha de nacimiento
  - Estado (Activo/Inactivo)
- [ ] Agregar metadata con diff de cambios
- [ ] Incluir IP del usuario y timestamp

**Verificar:**
- [ ] El servicio `updatePaciente` en `_service.update.ts` ya tiene audit log
- [ ] Se está usando `createAuditLog` correctamente

#### 4. Mejora de Banderas de Riesgo (1-2 horas)
**Archivo:** `src/app/(dashboard)/pacientes/[id]/_components/PatientHeader.tsx` (modificar)

**Tareas:**
- [ ] Implementar componente `PatientRiskBadges` separado
- [ ] Lógica de colapso: mostrar máximo 3 badges, resto en dropdown
- [ ] Agregar tooltips con detalles (qué alergias, desde cuándo embarazada)
- [ ] Mejorar estilos: usar colores sutiles pero visibles
- [ ] Sincronizar con datos de anamnesis (preparar para día 2)

**Componente sugerido:**
```tsx
// PatientRiskBadges.tsx
// - Recibe riskFlags
// - Muestra las 2 más críticas siempre
// - Colapsa el resto en "+X más" con Popover
```

#### 5. Permisos por Rol (1 hora)
**Archivo:** `src/lib/utils/rbac.ts` (verificar y ajustar)

**Tareas:**
- [ ] Verificar que `getPermissions` tenga todos los permisos necesarios
- [ ] Asegurar que `canEditDemographics` y `canEditContacts` estén correctos
- [ ] Agregar permisos específicos si faltan:
  - `canEditRiskFlags` (solo ADMIN, ODONT)
  - `canEditEmergencyContact` (ADMIN, RECEP, ODONT)
- [ ] Crear hook `usePatientPermissions(patientId, currentRole)`

#### 6. Testing y Verificación (1-2 horas)

**Checklist de Testing:**
- [ ] **Como ADMIN:**
  - [ ] Puedo editar todos los campos del paciente
  - [ ] Al cambiar nombre, aparece confirmación con diff
  - [ ] Al cambiar documento, valida unicidad
  - [ ] Los cambios se registran en audit log
  - [ ] Puedo cambiar estado a Inactivo (con confirmación)
  
- [ ] **Como RECEP:**
  - [ ] Puedo editar datos demográficos y contacto
  - [ ] NO puedo editar banderas de riesgo
  - [ ] NO puedo cambiar estado del paciente
  - [ ] Los cambios se registran en audit log
  
- [ ] **Como ODONT:**
  - [ ] Puedo editar teléfono y contacto de emergencia
  - [ ] NO puedo editar nombre, documento, fecha nacimiento
  - [ ] Puedo editar banderas de riesgo (embarazo, urgencia)
  - [ ] Los cambios se registran en audit log

- [ ] **Validaciones:**
  - [ ] Formato de teléfono válido
  - [ ] Email válido
  - [ ] Documento único (no duplicados)
  - [ ] Fecha de nacimiento coherente con edad

### 📝 Entregables del Día 1
- ✅ `EditPatientSheet` completo y funcional
- ✅ Confirmación de cambios críticos implementada
- ✅ Audit log integrado y funcionando
- ✅ Banderas de riesgo mejoradas
- ✅ Permisos por rol verificados
- ✅ Testing básico completado

### ⏱️ Tiempo Estimado: 8-10 horas

---

## 📅 Día 2: Tab Anamnesis (Completo)

### 🎯 Objetivos del Día
- ✅ Implementar formulario completo de anamnesis
- ✅ Gestión de alergias (agregar/eliminar desde catálogo)
- ✅ Gestión de medicaciones (agregar/eliminar desde catálogo)
- ✅ Indicador de completitud
- ✅ Sincronización con banderas de riesgo del header
- ✅ Auto-save opcional

### 📋 Tareas Específicas

#### 1. Componente Principal `AnamnesisTab` (2-3 horas)
**Archivo:** `src/app/(dashboard)/pacientes/[id]/_components/tabs/AnamnesisTab.tsx` (ya existe, completar)

**Tareas:**
- [ ] Verificar estructura actual del componente
- [ ] Implementar vista de lectura cuando anamnesis existe
- [ ] Implementar vista de "No completada" cuando no existe
- [ ] Agregar botón "Completar Anamnesis" o "Actualizar Anamnesis"
- [ ] Integrar con API: `GET /api/anamnesis/[pacienteId]`

**Estructura sugerida:**
```tsx
// Si no existe: mostrar empty state con botón
// Si existe: mostrar resumen + botón editar
// Al hacer click: abrir formulario completo
```

#### 2. Formulario de Anamnesis (3-4 horas)
**Archivo:** `src/components/pacientes/anamnesis/AnamnesisForm.tsx` (nuevo o modificar existente)

**Tareas:**
- [ ] Crear formulario con secciones usando `Accordion`:
  1. **Datos Generales:**
     - Motivo de consulta (textarea)
     - ¿Tiene dolor actual? (switch)
     - Intensidad del dolor (slider 1-10, solo si tiene dolor)
     - Urgencia percibida (select: RUTINA, PRIORITARIO, URGENCIA)
  
  2. **Antecedentes Médicos:**
     - ¿Tiene enfermedades crónicas? (switch)
     - Lista de enfermedades (si tiene, agregar múltiples)
  
  3. **Alergias:**
     - ¿Tiene alergias? (switch)
     - Lista de alergias con severidad (componente separado)
  
  4. **Medicación Actual:**
     - ¿Tiene medicación actual? (switch)
     - Lista de medicaciones (componente separado)
  
  5. **Hábitos:**
     - Exposición a humo de tabaco (select: Sí, No, Ex-fumador)
     - Bruxismo (switch)
     - Cepillados por día (number input)
     - ¿Usa hilo dental? (switch)
     - Última visita dental (date picker)
  
  6. **Embarazo** (solo si género es FEMALE):
     - ¿Está embarazada? (switch)
  
  7. **Pediatría** (solo si es anamnesis pediátrica):
     - ¿Tiene hábitos de succión? (switch)
     - Lactancia registrada (switch)

- [ ] Validaciones con Zod
- [ ] Estado de completitud calculado dinámicamente
- [ ] Guardar como borrador (opcional)

**Componentes a usar:**
- `Form`, `FormField`, `FormItem`, `FormLabel`
- `Switch`, `Select`, `Textarea`, `Slider`
- `Accordion` para secciones
- `Button` para guardar

#### 3. Gestión de Alergias (2-3 horas)
**Archivo:** `src/components/pacientes/anamnesis/AllergiesSection.tsx` (nuevo)

**Tareas:**
- [ ] Crear componente para listar alergias
- [ ] Botón "Agregar Alergia"
- [ ] Modal/Dialog para agregar:
  - Búsqueda en catálogo de alergias (`useAllergyCatalog`)
  - O texto libre si no está en catálogo
  - Severidad (select: LEVE, MODERADA, SEVERA)
  - Notas (opcional)
- [ ] Lista de alergias con:
  - Nombre
  - Badge de severidad (color según severidad)
  - Botón eliminar (soft delete, con confirmación)
- [ ] Integrar con API: `POST /api/anamnesis/[id]/allergies`

**Componente sugerido:**
```tsx
// AllergiesSection.tsx
// - Lista de alergias actuales
// - Botón agregar que abre AddAllergyDialog
// - Cada alergia tiene badge de severidad y botón eliminar
```

#### 4. Gestión de Medicaciones (2-3 horas)
**Archivo:** `src/components/pacientes/anamnesis/MedicationsSection.tsx` (nuevo)

**Tareas:**
- [ ] Crear componente similar a AllergiesSection
- [ ] Botón "Agregar Medicación"
- [ ] Modal/Dialog para agregar:
  - Búsqueda en catálogo de medicaciones (`useMedicationCatalog`)
  - O texto libre si no está en catálogo
  - Dosis (opcional)
  - Frecuencia (opcional)
  - Notas (opcional)
- [ ] Lista de medicaciones con:
  - Nombre
  - Dosis y frecuencia (si aplica)
  - Botón eliminar (soft delete, con confirmación)
- [ ] Integrar con API: `POST /api/anamnesis/[id]/medications`

#### 5. Indicador de Completitud (1 hora)
**Archivo:** `src/components/pacientes/anamnesis/AnamnesisCompleteness.tsx` (nuevo)

**Tareas:**
- [ ] Crear componente que calcule % de completitud
- [ ] Progress bar visual
- [ ] Secciones coloreadas:
  - Verde: Completada
  - Amarillo: Parcialmente completada
  - Gris: No completada
- [ ] Badge "Crítico" en secciones obligatorias
- [ ] Mostrar en top del formulario

**Lógica de cálculo:**
- Campos obligatorios: motivo consulta, alergias (si tiene), medicación (si tiene)
- Campos opcionales: resto

#### 6. Auto-save Opcional (1-2 horas)
**Archivo:** `src/hooks/useAutoSaveDraft.ts` (ya existe, verificar)

**Tareas:**
- [ ] Verificar hook existente
- [ ] Integrar con formulario de anamnesis
- [ ] Guardar cada 30 segundos si hay cambios
- [ ] Indicador visual de "Guardado" en bottom right
- [ ] Alerta al salir si hay cambios sin guardar
- [ ] Usar `localStorage` o API de borradores

#### 7. Sincronización con Header (1-2 horas)
**Archivo:** `src/app/(dashboard)/pacientes/[id]/_components/PatientHeader.tsx` (modificar)

**Tareas:**
- [ ] Al guardar anamnesis, actualizar `riskFlags` en header
- [ ] Sincronizar:
  - `highSeverityAllergies` → contar alergias con severidad SEVERA
  - `isPregnant` → desde campo embarazo
  - `urgencyLevel` → desde urgencia percibida
  - `hasCurrentPain` → desde tiene dolor actual
- [ ] Usar `mutate` de SWR para refrescar datos
- [ ] Actualizar banderas en tiempo real

**Flujo:**
```tsx
// Al guardar anamnesis:
// 1. POST/PATCH /api/anamnesis
// 2. Calcular riskFlags desde respuesta
// 3. Actualizar header con mutate()
```

#### 8. API Endpoints (verificar existentes, 1 hora)

**Verificar/Implementar:**
- [ ] `GET /api/anamnesis/[pacienteId]` - Obtener anamnesis
- [ ] `POST /api/anamnesis` - Crear anamnesis
- [ ] `PATCH /api/anamnesis/[id]` - Actualizar anamnesis
- [ ] `POST /api/anamnesis/[id]/allergies` - Agregar alergia
- [ ] `DELETE /api/anamnesis/[id]/allergies/[allergyId]` - Eliminar alergia
- [ ] `POST /api/anamnesis/[id]/medications` - Agregar medicación
- [ ] `DELETE /api/anamnesis/[id]/medications/[medicationId]` - Eliminar medicación

#### 9. Testing y Verificación (1-2 horas)

**Checklist de Testing:**
- [ ] **Crear anamnesis nueva:**
  - [ ] Formulario se abre correctamente
  - [ ] Todas las secciones son accesibles
  - [ ] Validaciones funcionan
  - [ ] Se puede guardar exitosamente
  - [ ] Indicador de completitud se actualiza
  
- [ ] **Editar anamnesis existente:**
  - [ ] Se cargan los datos correctamente
  - [ ] Se pueden modificar campos
  - [ ] Se guarda correctamente
  - [ ] Se crea nueva versión (si aplica)
  
- [ ] **Gestión de alergias:**
  - [ ] Agregar alergia desde catálogo
  - [ ] Agregar alergia texto libre
  - [ ] Eliminar alergia (soft delete)
  - [ ] Severidad se muestra correctamente
  - [ ] Alergias severas se reflejan en header
  
- [ ] **Gestión de medicaciones:**
  - [ ] Agregar medicación desde catálogo
  - [ ] Agregar medicación texto libre
  - [ ] Eliminar medicación (soft delete)
  
- [ ] **Sincronización:**
  - [ ] Al guardar anamnesis, header se actualiza
  - [ ] Banderas de riesgo se muestran correctamente
  - [ ] Banner de alergias severas aparece si aplica
  
- [ ] **Auto-save:**
  - [ ] Se guarda automáticamente cada 30s
  - [ ] Indicador de "Guardado" aparece
  - [ ] Alerta al salir si hay cambios

### 📝 Entregables del Día 2
- ✅ Formulario completo de anamnesis funcional
- ✅ Gestión de alergias y medicaciones
- ✅ Indicador de completitud
- ✅ Auto-save implementado
- ✅ Sincronización con header funcionando
- ✅ Testing completo

### ⏱️ Tiempo Estimado: 10-12 horas

---

## 📅 Día 3: Tab Historial Clínico

### 🎯 Objetivos del Día
- ✅ Lista de consultas con cards
- ✅ Vista detalle expandible
- ✅ Filtro por fecha
- ✅ Búsqueda básica
- ✅ Navegación entre consultas
- ✅ Integración con datos de consultas existentes

### 📋 Tareas Específicas

#### 1. Componente Principal `ClinicalHistoryTab` (2-3 horas)
**Archivo:** `src/app/(dashboard)/pacientes/[id]/_components/tabs/ClinicalHistoryTab.tsx` (ya existe, completar)

**Tareas:**
- [ ] Verificar estructura actual
- [ ] Implementar estado de carga (skeleton)
- [ ] Implementar estado vacío ("No hay consultas aún")
- [ ] Integrar con API: `GET /api/pacientes/[id]/historia/entradas`
- [ ] Manejar paginación si aplica

#### 2. Lista de Consultas con Cards (3-4 horas)
**Archivo:** `src/components/pacientes/historial/ConsultationCard.tsx` (nuevo)

**Tareas:**
- [ ] Crear componente de card por consulta
- [ ] Información a mostrar:
  - Fecha y hora (formato legible)
  - Profesional (nombre completo)
  - Motivo de consulta
  - Estado (badge con color):
    - Verde: Completada
    - Azul: En progreso
    - Gris: Cancelada
  - Resumen de diagnósticos (badges con count)
  - Resumen de procedimientos (count)
  - Indicador de adjuntos (icono si tiene)
  - Signos vitales (si tiene: BP, HR)
- [ ] Borde izquierdo coloreado según estado
- [ ] Badge "Nueva" si tiene menos de 24h
- [ ] Hover effect y cursor pointer
- [ ] Click para expandir/ver detalle

**Componente sugerido:**
```tsx
// ConsultationCard.tsx
// - Card con información esencial
// - Borde izquierdo coloreado
// - Badges de diagnósticos y procedimientos
// - Expandible o navegable a detalle
```

#### 3. Vista Detalle de Consulta (3-4 horas)
**Archivo:** `src/components/pacientes/historial/ConsultationDetail.tsx` (nuevo)

**Tareas:**
- [ ] Crear componente de detalle completo
- [ ] Secciones a mostrar:
  1. **Información General:**
     - Fecha, hora, duración
     - Profesional
     - Estado
     - Motivo de consulta
  
  2. **Diagnósticos:**
     - Lista de diagnósticos con:
       - Código y nombre
       - Estado (activo/resuelto)
       - Fecha de resolución (si aplica)
       - Notas
  
  3. **Procedimientos:**
     - Lista de procedimientos con:
       - Nombre del procedimiento
       - Pieza dental (si aplica)
       - Notas
       - Fecha
  
  4. **Notas Clínicas:**
     - Texto completo de notas
  
  5. **Signos Vitales:**
     - Presión arterial
     - Frecuencia cardíaca
  
  6. **Adjuntos:**
     - Galería de imágenes/RX
     - Vista previa de imágenes
     - Descargar adjuntos

- [ ] Navegación anterior/siguiente (flechas)
- [ ] Breadcrumb: "Historial Clínico > Consulta del [fecha]"
- [ ] Botón "Volver a lista"
- [ ] Botón "Editar" (solo si está en progreso)

**Componentes a usar:**
- `Card`, `CardHeader`, `CardContent`
- `Badge` para estados
- `Button` para navegación
- `Image` o galería para adjuntos

#### 4. Filtros y Búsqueda (2-3 horas)
**Archivo:** `src/components/pacientes/historial/ClinicalHistoryFilters.tsx` (nuevo)

**Tareas:**
- [ ] Crear componente de filtros
- [ ] Filtro por fecha:
  - Presets: "Último mes", "Último año", "Últimos 3 meses"
  - Rango personalizado (DateRangePicker)
- [ ] Búsqueda de texto:
  - Input de búsqueda
  - Buscar en: motivo, notas, diagnósticos
  - Debounce de 300ms
- [ ] Filtro por profesional (select, opcional)
- [ ] Botón "Limpiar filtros"
- [ ] Mostrar count de resultados

**Componente sugerido:**
```tsx
// ClinicalHistoryFilters.tsx
// - DateRangePicker para fechas
// - Input de búsqueda con debounce
// - Select de profesionales
// - Botón limpiar
```

#### 5. Navegación entre Consultas (1-2 horas)
**Archivo:** `src/components/pacientes/historial/ConsultationDetail.tsx` (modificar)

**Tareas:**
- [ ] Agregar botones anterior/siguiente
- [ ] Calcular índices de consultas filtradas
- [ ] Navegar manteniendo filtros activos
- [ ] Deshabilitar botones en extremos
- [ ] Keyboard shortcuts (flechas izquierda/derecha)

#### 6. Integración con APIs (1-2 horas)

**Verificar/Implementar:**
- [ ] `GET /api/pacientes/[id]/historia/entradas` - Lista de entradas
  - Query params: `desde`, `hasta`, `profesionalId`, `q` (búsqueda)
  - Respuesta paginada
- [ ] `GET /api/pacientes/[id]/historia/entradas/[id]` - Detalle de entrada
- [ ] `GET /api/agenda/citas/[citaId]/historia/versiones` - Versiones (futuro)

#### 7. Testing y Verificación (1-2 horas)

**Checklist de Testing:**
- [ ] **Lista de consultas:**
  - [ ] Se muestran todas las consultas
  - [ ] Ordenadas por fecha descendente
  - [ ] Cards muestran información correcta
  - [ ] Estados se colorean correctamente
  - [ ] Badges de diagnósticos/procedimientos funcionan
  
- [ ] **Vista detalle:**
  - [ ] Se expande al hacer click
  - [ ] Muestra toda la información
  - [ ] Navegación anterior/siguiente funciona
  - [ ] Botón volver funciona
  
- [ ] **Filtros:**
  - [ ] Filtro por fecha funciona
  - [ ] Presets funcionan correctamente
  - [ ] Búsqueda de texto funciona
  - [ ] Filtro por profesional funciona
  - [ ] Limpiar filtros funciona
  
- [ ] **Estados:**
  - [ ] Loading se muestra correctamente
  - [ ] Empty state se muestra cuando no hay consultas
  - [ ] Error se maneja correctamente

### 📝 Entregables del Día 3
- ✅ Lista de consultas con cards funcional
- ✅ Vista detalle completa
- ✅ Filtros y búsqueda implementados
- ✅ Navegación entre consultas
- ✅ Testing completo

### ⏱️ Tiempo Estimado: 10-12 horas

---

## 📅 Día 4: Tabs Planes de Tratamiento y Odontograma

### 🎯 Objetivos del Día
- ✅ Lista de planes con progreso visual
- ✅ Crear y editar planes
- ✅ Marcar pasos como completados
- ✅ Vista interactiva del odontograma
- ✅ Edición de condiciones por pieza
- ✅ Guardar cambios con versionado

### 📋 Tareas Específicas - Planes de Tratamiento

#### 1. Componente Principal `TreatmentPlansTab` (1-2 horas)
**Archivo:** `src/app/(dashboard)/pacientes/[id]/_components/tabs/TreatmentPlansTab.tsx` (ya existe, completar)

**Tareas:**
- [ ] Verificar estructura actual
- [ ] Implementar estados: loading, empty, error
- [ ] Integrar con API: `GET /api/pacientes/[id]/planes`
- [ ] Filtro por estado (Activo, Completado, Cancelado)

#### 2. Card de Plan con Progreso (2-3 horas)
**Archivo:** `src/components/pacientes/planes/TreatmentPlanCard.tsx` (nuevo)

**Tareas:**
- [ ] Crear card con información:
  - Nombre del plan
  - Descripción
  - Barra de progreso (porcentaje)
  - Count de pasos: "3/5 completados"
  - Fecha de creación
  - Profesional responsable
  - Badge de estado
- [ ] Click para ver detalle
- [ ] Hover effect

**Componente sugerido:**
```tsx
// TreatmentPlanCard.tsx
// - Card con ProgressBar
// - Información esencial
// - Badge de estado
// - Click para expandir o navegar a detalle
```

#### 3. Vista Detalle de Plan (2-3 horas)
**Archivo:** `src/components/pacientes/planes/TreatmentPlanDetail.tsx` (nuevo)

**Tareas:**
- [ ] Timeline vertical de pasos
- [ ] Cada paso muestra:
  - Checkbox (completado/pendiente)
  - Nombre del paso
  - Descripción (opcional)
  - Fecha de completado (si aplica)
  - Profesional que completó (si aplica)
  - Notas del paso
- [ ] Botón "Marcar como completado" en pasos pendientes
- [ ] Botón "Cerrar Plan" (marcar como completado)
- [ ] Botón "Cancelar Plan" (con motivo)
- [ ] Botón "Editar Plan" (agregar/modificar pasos)

#### 4. Crear/Editar Plan (2-3 horas)
**Archivo:** `src/components/pacientes/planes/TreatmentPlanForm.tsx` (nuevo)

**Tareas:**
- [ ] Formulario con campos:
  - Nombre del plan (requerido)
  - Descripción (textarea)
  - Pasos (array):
    - Nombre del paso
    - Descripción (opcional)
    - Orden
  - Fecha estimada de inicio (opcional)
- [ ] Agregar/eliminar pasos dinámicamente
- [ ] Reordenar pasos (drag & drop opcional, o botones arriba/abajo)
- [ ] Validaciones
- [ ] Guardar plan

#### 5. Marcar Paso como Completado (1 hora)
**Archivo:** `src/components/pacientes/planes/TreatmentPlanDetail.tsx` (modificar)

**Tareas:**
- [ ] Botón en cada paso pendiente
- [ ] Al hacer click:
  - Marcar como completado
  - Registrar fecha actual
  - Registrar usuario actual
  - Actualizar progreso
- [ ] Integrar con API: `PATCH /api/planes/[id]/pasos/[pasoId]/completar`

#### 6. Integración con APIs (1 hora)

**Verificar/Implementar:**
- [ ] `GET /api/pacientes/[id]/planes` - Lista de planes
- [ ] `GET /api/planes/[id]` - Detalle de plan
- [ ] `POST /api/planes` - Crear plan
- [ ] `PATCH /api/planes/[id]` - Actualizar plan
- [ ] `PATCH /api/planes/[id]/pasos/[pasoId]/completar` - Completar paso
- [ ] `PATCH /api/planes/[id]/cerrar` - Cerrar plan
- [ ] `PATCH /api/planes/[id]/cancelar` - Cancelar plan

### 📋 Tareas Específicas - Odontograma

#### 7. Componente Principal `OdontogramTab` (1 hora)
**Archivo:** `src/app/(dashboard)/pacientes/[id]/_components/tabs/OdontogramTab.tsx` (ya existe, verificar)

**Tareas:**
- [ ] Verificar estructura actual
- [ ] Integrar con componente `OdontogramView`
- [ ] Estados: loading, empty

#### 8. Vista Interactiva del Odontograma (3-4 horas)
**Archivo:** `src/components/pacientes/odontograma/OdontogramView.tsx` (ya existe, mejorar)

**Tareas:**
- [ ] Verificar componente existente
- [ ] Asegurar que muestre todas las piezas (32 dientes)
- [ ] Colores/iconos según condiciones:
  - Caries: rojo
  - Restauración: azul
  - Ausente: gris
  - Extracción: negro
  - etc.
- [ ] Hover: tooltip con condiciones de la pieza
- [ ] Click: abrir panel de edición
- [ ] Leyenda siempre visible (sidebar o footer)
- [ ] Fecha de última actualización

#### 9. Panel de Edición por Pieza (2-3 horas)
**Archivo:** `src/components/pacientes/odontograma/ToothEditDrawer.tsx` (nuevo)

**Tareas:**
- [ ] Crear drawer lateral (Sheet o Drawer)
- [ ] Al hacer click en pieza, se abre drawer
- [ ] Mostrar:
  - Número de pieza
  - Lista de condiciones actuales
  - Botón "Agregar condición"
  - Botón "Eliminar" en cada condición (con confirmación)
  - Campo de notas
- [ ] Formulario para agregar condición:
  - Tipo de condición (select): Caries, Restauración, Extracción, etc.
  - Ubicación (select): Oclusal, Mesial, Distal, etc.
  - Material (si es restauración)
  - Notas
- [ ] Guardar cambios (crea nueva versión)

#### 10. Guardar Cambios con Versionado (1-2 horas)
**Archivo:** `src/components/pacientes/odontograma/OdontogramView.tsx` (modificar)

**Tareas:**
- [ ] Al guardar cambios, crear nueva versión
- [ ] Integrar con API: `PATCH /api/pacientes/[id]/odontograma`
- [ ] Body: lista de cambios (diff)
- [ ] Mostrar confirmación antes de guardar
- [ ] Actualizar vista después de guardar

**Estructura de cambios:**
```tsx
{
  cambios: [
    {
      pieza: "26",
      accion: "AGREGAR" | "ELIMINAR" | "MODIFICAR",
      condicion: { tipo: "CARIES", ubicacion: "OCLUSAL", ... }
    }
  ]
}
```

#### 11. Leyenda del Odontograma (1 hora)
**Archivo:** `src/components/pacientes/odontograma/OdontogramLegend.tsx` (nuevo)

**Tareas:**
- [ ] Crear componente de leyenda
- [ ] Mostrar todos los tipos de condiciones con su color/icono
- [ ] Posición: sidebar derecho o footer
- [ ] Siempre visible

#### 12. Integración con APIs (1 hora)

**Verificar/Implementar:**
- [ ] `GET /api/pacientes/[id]/odontograma` - Obtener odontograma actual
- [ ] `PATCH /api/pacientes/[id]/odontograma` - Actualizar odontograma
- [ ] `GET /api/pacientes/[id]/odontograma/versiones` - Historial (futuro)

#### 13. Testing y Verificación (2 horas)

**Checklist de Testing - Planes:**
- [ ] Ver lista de planes
- [ ] Crear nuevo plan
- [ ] Editar plan existente
- [ ] Marcar paso como completado
- [ ] Cerrar plan
- [ ] Cancelar plan
- [ ] Progreso se actualiza correctamente
- [ ] Filtros funcionan

**Checklist de Testing - Odontograma:**
- [ ] Ver odontograma actual
- [ ] Hover muestra tooltip
- [ ] Click abre panel de edición
- [ ] Agregar condición funciona
- [ ] Eliminar condición funciona (con confirmación)
- [ ] Guardar cambios crea nueva versión
- [ ] Leyenda se muestra correctamente

### 📝 Entregables del Día 4
- ✅ Planes de tratamiento completos
- ✅ Odontograma interactivo funcional
- ✅ Edición de condiciones por pieza
- ✅ Versionado de odontograma
- ✅ Testing completo

### ⏱️ Tiempo Estimado: 12-14 horas

---

## 📅 Día 5: Tab Administrativo, Testing Completo y Correcciones Finales

### 🎯 Objetivos del Día
- ✅ Gestión completa de responsables legales
- ✅ Subir y ver consentimientos
- ✅ Notas administrativas
- ✅ Testing end-to-end completo
- ✅ Corrección de bugs encontrados
- ✅ Documentación final

### 📋 Tareas Específicas

#### 1. Componente Principal `AdministrativeTab` (1 hora)
**Archivo:** `src/app/(dashboard)/pacientes/[id]/_components/tabs/AdministrativeTab.tsx` (ya existe, completar)

**Tareas:**
- [ ] Verificar estructura actual
- [ ] Organizar en secciones:
  1. Responsables Legales
  2. Consentimientos
  3. Notas Administrativas
  4. Resumen de Citas (últimas 5-10)

#### 2. Gestión de Responsables Legales (2-3 horas)
**Archivo:** `src/components/pacientes/administrativo/ResponsiblesSection.tsx` (nuevo)

**Tareas:**
- [ ] Lista de responsables legales
- [ ] Card por responsable con:
  - Nombre completo
  - Documento
  - Relación con paciente
  - Teléfono
  - Es principal (badge)
  - Autoridad legal (badge)
  - Fechas de vigencia
- [ ] Botón "Agregar Responsable"
- [ ] Formulario para agregar/editar:
  - Buscar persona existente o crear nueva
  - Relación (select)
  - Es principal (switch)
  - Autoridad legal (switch)
  - Fecha inicio vigencia
  - Fecha fin vigencia (opcional)
- [ ] Botón editar en cada responsable
- [ ] Botón eliminar (soft delete, con confirmación)
- [ ] Integrar con API: `GET/POST/PATCH/DELETE /api/pacientes/[id]/responsables`

#### 3. Gestión de Consentimientos (2-3 horas)
**Archivo:** `src/components/pacientes/administrativo/ConsentsSection.tsx` (nuevo o usar existente)

**Tareas:**
- [ ] Lista de consentimientos
- [ ] Card por consentimiento con:
  - Tipo de consentimiento
  - Fecha de firma
  - Estado (activo, vencido, próximo a vencer)
  - Archivo (preview o botón descargar)
- [ ] Botón "Subir Consentimiento"
- [ ] Modal/Dialog para subir:
  - Tipo de consentimiento (select)
  - Fecha de firma
  - Archivo (drag & drop o input file)
  - Notas (opcional)
- [ ] Validación de archivo (PDF, imágenes)
- [ ] Preview del archivo subido
- [ ] Botón descargar
- [ ] Integrar con API existente de consentimientos

**Verificar:**
- [ ] Ya existe `UploadConsentDialog.tsx` - revisar y mejorar si es necesario

#### 4. Notas Administrativas (1-2 horas)
**Archivo:** `src/components/pacientes/administrativo/AdminNotesSection.tsx` (nuevo)

**Tareas:**
- [ ] Textarea para notas administrativas
- [ ] Guardar automáticamente o con botón
- [ ] Historial de cambios (opcional, futuro)
- [ ] Integrar con API: `PATCH /api/pacientes/[id]/notas-administrativas`

#### 5. Resumen de Citas (1 hora)
**Archivo:** `src/components/pacientes/administrativo/AppointmentsSummary.tsx` (nuevo)

**Tareas:**
- [ ] Lista de últimas 5-10 citas
- [ ] Información básica: fecha, hora, profesional, tipo, estado
- [ ] Link a detalle de cita
- [ ] Integrar con API: `GET /api/pacientes/[id]/citas?limit=10`

#### 6. Testing End-to-End Completo (3-4 horas)

**Flujos completos a probar:**

**Flujo 1: Editar Paciente Completo**
1. [ ] Abrir ficha de paciente
2. [ ] Click en "Editar Paciente"
3. [ ] Modificar nombre (debe pedir confirmación)
4. [ ] Modificar teléfono
5. [ ] Guardar
6. [ ] Verificar que cambios se reflejan
7. [ ] Verificar que audit log se registró

**Flujo 2: Completar Anamnesis**
1. [ ] Ir a tab Anamnesis
2. [ ] Click en "Completar Anamnesis"
3. [ ] Llenar todos los campos
4. [ ] Agregar 2 alergias (una severa)
5. [ ] Agregar 1 medicación
6. [ ] Marcar embarazo (si aplica)
7. [ ] Guardar
8. [ ] Verificar que se guardó
9. [ ] Verificar que header muestra banderas de riesgo
10. [ ] Verificar que banner de alergias severas aparece

**Flujo 3: Ver Historial Clínico**
1. [ ] Ir a tab Historial Clínico
2. [ ] Ver lista de consultas
3. [ ] Filtrar por último mes
4. [ ] Buscar texto en consultas
5. [ ] Click en una consulta para ver detalle
6. [ ] Navegar anterior/siguiente
7. [ ] Volver a lista

**Flujo 4: Crear Plan de Tratamiento**
1. [ ] Ir a tab Planes de Tratamiento
2. [ ] Click en "Nuevo Plan"
3. [ ] Crear plan con 5 pasos
4. [ ] Guardar
5. [ ] Ver plan en lista
6. [ ] Marcar 2 pasos como completados
7. [ ] Verificar que progreso se actualiza
8. [ ] Cerrar plan

**Flujo 5: Editar Odontograma**
1. [ ] Ir a tab Odontograma
2. [ ] Ver odontograma actual
3. [ ] Click en pieza 26
4. [ ] Agregar condición "Caries" en oclusal
5. [ ] Guardar
6. [ ] Verificar que se guardó
7. [ ] Click en otra pieza
8. [ ] Agregar restauración
9. [ ] Guardar

**Flujo 6: Gestión Administrativa**
1. [ ] Ir a tab Administrativo
2. [ ] Agregar responsable legal
3. [ ] Subir consentimiento
4. [ ] Editar notas administrativas
5. [ ] Ver resumen de citas

**Testing de Permisos:**
- [ ] **Como ADMIN:** Todas las funcionalidades funcionan
- [ ] **Como RECEP:** 
  - [ ] Puede editar datos básicos
  - [ ] NO puede ver tabs clínicos
  - [ ] Puede gestionar responsables y consentimientos
- [ ] **Como ODONT:**
  - [ ] Puede ver todos los tabs clínicos
  - [ ] Puede editar anamnesis, planes, odontograma
  - [ ] NO puede editar datos demográficos básicos
  - [ ] Puede editar teléfono y contacto emergencia

**Testing de Validaciones:**
- [ ] Formato de teléfono
- [ ] Email válido
- [ ] Documento único
- [ ] Fechas coherentes
- [ ] Campos requeridos

**Testing de Estados:**
- [ ] Loading states
- [ ] Empty states
- [ ] Error states
- [ ] Success states

#### 7. Corrección de Bugs (2-3 horas)
- [ ] Revisar errores encontrados en testing
- [ ] Priorizar bugs críticos
- [ ] Corregir uno por uno
- [ ] Re-testear después de cada corrección

#### 8. Optimizaciones Finales (1-2 horas)
- [ ] Verificar que no hay console errors
- [ ] Optimizar renders innecesarios
- [ ] Verificar que imágenes se cargan correctamente
- [ ] Verificar responsive design (mobile, tablet, desktop)
- [ ] Verificar accesibilidad básica (keyboard navigation, focus)

#### 9. Documentación Final (1 hora)
- [ ] Actualizar README si es necesario
- [ ] Documentar APIs nuevas o modificadas
- [ ] Crear guía rápida de uso (opcional)

### 📝 Entregables del Día 5
- ✅ Tab Administrativo completo
- ✅ Testing end-to-end completado
- ✅ Bugs corregidos
- ✅ Sistema funcional y probado
- ✅ Listo para entrega

### ⏱️ Tiempo Estimado: 12-14 horas

---

## 📊 Resumen General

### Tiempo Total Estimado: 52-62 horas (5 días)

### Distribución por Día:
- **Día 1:** 8-10 horas (Header y permisos)
- **Día 2:** 10-12 horas (Anamnesis)
- **Día 3:** 10-12 horas (Historial Clínico)
- **Día 4:** 12-14 horas (Planes y Odontograma)
- **Día 5:** 12-14 horas (Administrativo y testing)

### Prioridades Críticas:
1. ✅ Día 1: Header funcional con permisos
2. ✅ Día 2: Anamnesis completa (necesaria para banderas de riesgo)
3. ✅ Día 3: Historial clínico básico
4. ✅ Día 4: Planes y odontograma
5. ✅ Día 5: Administrativo y testing completo

### Checklist Final de Entrega:

#### Funcionalidades Core:
- [ ] Header del paciente editable con permisos
- [ ] Tab Anamnesis completo
- [ ] Tab Historial Clínico funcional
- [ ] Tab Planes de Tratamiento funcional
- [ ] Tab Odontograma funcional
- [ ] Tab Administrativo completo

#### Calidad:
- [ ] Sin errores en consola
- [ ] Todas las validaciones funcionan
- [ ] Permisos por rol funcionan correctamente
- [ ] Audit log registra cambios críticos
- [ ] Responsive design funciona
- [ ] Estados de carga/vacío/error implementados

#### Testing:
- [ ] Testing manual completo
- [ ] Todos los flujos principales funcionan
- [ ] Permisos verificados para cada rol
- [ ] Bugs críticos corregidos

---

## 🚀 Tips para el Desarrollo

### Organización:
1. **Commits frecuentes:** Hacer commit después de cada funcionalidad completada
2. **Branch por día:** Crear branch `feature/patient-mvp-day-1`, etc.
3. **Testing continuo:** Probar mientras desarrollas, no solo al final
4. **Documentar decisiones:** Si cambias algo de la guía, documenta por qué

### Priorización:
- Si te falta tiempo, prioriza funcionalidades core sobre "nice to have"
- Los estados vacíos y de error son importantes para UX
- Las validaciones son críticas para seguridad

### Comunicación:
- Si encuentras problemas o necesitas cambiar algo, documenta la decisión
- Mantén un log de bugs encontrados durante desarrollo

---

**Documento creado:** Diciembre 2024  
**Versión:** 1.0  
**Para uso con:** `GUIA_DISEÑO_FICHA_PACIENTE.md`

