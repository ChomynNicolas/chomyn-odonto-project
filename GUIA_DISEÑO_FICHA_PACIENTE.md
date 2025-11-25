# Guía de Diseño - Ficha de Paciente MVP
## Sistema Chomyn Odontología

---

## 📋 Tabla de Permisos de Edición - Header y Datos Básicos

| Campo / Área | Editable | Quién puede editar | Audit Log | Confirmación | Notas UX/Seguridad |
|--------------|----------|-------------------|-----------|--------------|-------------------|
| **IDENTIDAD** |
| Nombre completo (firstName, lastName, secondLastName) | ✅ Sí | ADMIN, RECEP | ✅ Obligatorio | ⚠️ Confirmación requerida | Cambio crítico. Mostrar diff antes de guardar. Validar formato. |
| Fecha de nacimiento | ✅ Sí | ADMIN, RECEP | ✅ Obligatorio | ⚠️ Confirmación requerida | Afecta cálculo de edad. Validar coherencia con edad. |
| Edad (calculada) | ❌ No | - | - | - | Solo lectura, calculada automáticamente. |
| Género | ✅ Sí | ADMIN, RECEP | ✅ Obligatorio | - | Opciones: MALE, FEMALE, OTHER. |
| **DOCUMENTO** |
| Tipo de documento | ✅ Sí | ADMIN, RECEP | ✅ Obligatorio | ⚠️ Confirmación requerida | Cambio crítico. Validar que no exista duplicado. |
| Número de documento | ✅ Sí | ADMIN, RECEP | ✅ Obligatorio | ⚠️ Confirmación requerida | Cambio crítico. Validar formato y unicidad. |
| Fecha emisión documento | ✅ Sí | ADMIN, RECEP | ✅ Opcional | - | Campo informativo. |
| Fecha vencimiento documento | ✅ Sí | ADMIN, RECEP | ✅ Opcional | - | Mostrar alerta si está vencido. |
| **CONTACTO** |
| Teléfono principal | ✅ Sí | ADMIN, RECEP, ODONT | ✅ Obligatorio | - | ODONT puede actualizar durante consulta. Validar formato internacional. |
| Email | ✅ Sí | ADMIN, RECEP | ✅ Opcional | - | Validar formato email. |
| Contacto de emergencia (nombre) | ✅ Sí | ADMIN, RECEP, ODONT | ✅ Opcional | - | ODONT puede actualizar durante consulta. |
| Contacto de emergencia (teléfono) | ✅ Sí | ADMIN, RECEP, ODONT | ✅ Opcional | - | ODONT puede actualizar durante consulta. |
| Contacto de emergencia (relación) | ✅ Sí | ADMIN, RECEP, ODONT | ✅ Opcional | - | ODONT puede actualizar durante consulta. |
| **UBICACIÓN** |
| Ciudad | ✅ Sí | ADMIN, RECEP | ✅ Opcional | - | Campo informativo. |
| País | ✅ Sí | ADMIN, RECEP | ✅ Opcional | - | Campo informativo. |
| Dirección completa | ✅ Sí | ADMIN, RECEP | ✅ Opcional | - | No mostrar en header (solo en tab administrativo). |
| **BANDERAS DE RIESGO** |
| Alergias severas (count) | ❌ No (derivado) | - | - | - | Calculado desde anamnesis. Solo lectura. |
| Embarazo (isPregnant) | ✅ Sí | ADMIN, ODONT | ✅ Obligatorio | - | Solo ODONT/ADMIN pueden marcar. Actualizar desde anamnesis o manualmente. |
| Urgencia percibida | ✅ Sí | ADMIN, ODONT | ✅ Obligatorio | - | Solo ODONT/ADMIN. Niveles: RUTINA, PRIORITARIO, URGENCIA. |
| Dolor actual | ❌ No (derivado) | - | - | - | Calculado desde anamnesis. Solo lectura. |
| **ESTADO** |
| Estado (Activo/Inactivo) | ✅ Sí | ADMIN | ✅ Obligatorio | ⚠️ Confirmación requerida | Solo ADMIN. Mostrar modal de confirmación. |
| **METADATOS** |
| Fecha de creación | ❌ No | - | - | - | Solo lectura. |
| Última actualización | ❌ No | - | - | - | Solo lectura. Mostrar timestamp. |

---

## 📋 Tabla de Permisos de Edición - Tabs

### Tab: Anamnesis

| Acción | ADMIN | ODONT | RECEP | Audit Log | Notas |
|--------|-------|-------|-------|-----------|-------|
| Ver anamnesis completa | ✅ | ✅ | ❌ | - | RECEP no tiene acceso. |
| Crear anamnesis inicial | ✅ | ✅ | ❌ | ✅ Obligatorio | Primera vez que se completa. |
| Editar anamnesis existente | ✅ | ✅ | ❌ | ✅ Obligatorio | Crear nueva versión (versionado). |
| Ver historial de versiones | ✅ | ✅ | ❌ | - | Timeline de cambios. |
| Agregar alergia | ✅ | ✅ | ❌ | ✅ Obligatorio | Desde catálogo o texto libre. |
| Eliminar alergia | ✅ | ✅ | ❌ | ✅ Obligatorio | Solo marcar como removida (soft delete). |
| Agregar medicación | ✅ | ✅ | ❌ | ✅ Obligatorio | Desde catálogo o texto libre. |
| Eliminar medicación | ✅ | ✅ | ❌ | ✅ Obligatorio | Solo marcar como removida (soft delete). |
| Marcar embarazo | ✅ | ✅ | ❌ | ✅ Obligatorio | Sincronizar con header. |
| Actualizar urgencia | ✅ | ✅ | ❌ | ✅ Obligatorio | Sincronizar con header. |

### Tab: Historial Clínico

| Acción | ADMIN | ODONT | RECEP | Audit Log | Notas |
|--------|-------|-------|-------|-----------|-------|
| Ver listado de consultas | ✅ | ✅ | ❌ | - | Ordenado por fecha descendente. |
| Ver detalle de consulta | ✅ | ✅ | ❌ | - | Expandir card o navegar a página. |
| Filtrar por fecha | ✅ | ✅ | ❌ | - | Rango de fechas. |
| Filtrar por profesional | ✅ | ✅ | ❌ | - | Dropdown de profesionales. |
| Buscar en notas | ✅ | ✅ | ❌ | - | Búsqueda full-text. |
| Ver diagnósticos de consulta | ✅ | ✅ | ❌ | - | Lista de diagnósticos activos/resueltos. |
| Ver procedimientos de consulta | ✅ | ✅ | ❌ | - | Lista con detalles. |
| Ver adjuntos de consulta | ✅ | ✅ | ❌ | - | Galería de imágenes/RX. |
| Ver signos vitales | ✅ | ✅ | ❌ | - | BP, frecuencia cardíaca. |
| Crear nota clínica (sin consulta) | ✅ | ✅ | ❌ | ✅ Obligatorio | Nota administrativa o recordatorio. |
| Editar consulta cerrada | ❌ | ❌ | ❌ | - | Solo lectura después de finalizada. |
| Editar consulta abierta | ✅ | ✅ | ❌ | ✅ Obligatorio | Solo si está en progreso. |

### Tab: Planes de Tratamiento

| Acción | ADMIN | ODONT | RECEP | Audit Log | Notas |
|--------|-------|-------|-------|-----------|-------|
| Ver planes activos | ✅ | ✅ | ❌ | - | Cards con progreso visual. |
| Ver planes completados | ✅ | ✅ | ❌ | - | Lista histórica. |
| Ver planes cancelados | ✅ | ✅ | ❌ | - | Lista histórica. |
| Crear nuevo plan | ✅ | ✅ | ❌ | ✅ Obligatorio | Wizard o formulario paso a paso. |
| Editar plan activo | ✅ | ✅ | ❌ | ✅ Obligatorio | Agregar/modificar pasos. |
| Marcar paso como completado | ✅ | ✅ | ❌ | ✅ Obligatorio | Con fecha y profesional. |
| Cerrar plan | ✅ | ✅ | ❌ | ✅ Obligatorio | Marcar como completado. |
| Cancelar plan | ✅ | ✅ | ❌ | ✅ Obligatorio | Con motivo. |
| Ver historial de cambios | ✅ | ✅ | ❌ | - | Timeline de modificaciones. |
| Filtrar por estado | ✅ | ✅ | ❌ | - | Activo, Completado, Cancelado. |
| Buscar por nombre/procedimiento | ✅ | ✅ | ❌ | - | Búsqueda en planes. |

### Tab: Odontograma

| Acción | ADMIN | ODONT | RECEP | Audit Log | Notas |
|--------|-------|-------|-------|-----------|-------|
| Ver odontograma actual | ✅ | ✅ | ❌ | - | Vista interactiva. |
| Ver periodontograma | ✅ | ✅ | ❌ | - | Vista interactiva. |
| Editar odontograma | ✅ | ✅ | ❌ | ✅ Obligatorio | Click en pieza para editar. |
| Agregar condición (caries, restauración, etc.) | ✅ | ✅ | ❌ | ✅ Obligatorio | Modal de edición por pieza. |
| Eliminar condición | ✅ | ✅ | ❌ | ✅ Obligatorio | Confirmación requerida. |
| Ver historial de versiones | ✅ | ✅ | ❌ | - | Timeline con fechas. |
| Comparar versiones | ✅ | ✅ | ❌ | - | Vista side-by-side (futuro). |
| Restaurar versión anterior | ✅ | ✅ | ❌ | ✅ Obligatorio | Con confirmación. |
| Exportar odontograma | ✅ | ✅ | ❌ | - | PDF o imagen. |
| Filtrar por fecha | ✅ | ✅ | ❌ | - | Ver estado en fecha específica. |

### Tab: Administrativo

| Acción | ADMIN | ODONT | RECEP | Audit Log | Notas |
|--------|-------|-------|-------|-----------|-------|
| Ver datos administrativos | ✅ | ✅ | ✅ | - | Todos pueden ver. |
| Ver responsables legales | ✅ | ✅ | ✅ | - | Lista de responsables. |
| Agregar responsable legal | ✅ | ❌ | ✅ | ✅ Obligatorio | Solo ADMIN/RECEP. |
| Editar responsable legal | ✅ | ❌ | ✅ | ✅ Obligatorio | Solo ADMIN/RECEP. |
| Eliminar responsable legal | ✅ | ❌ | ✅ | ✅ Obligatorio | Solo ADMIN/RECEP. Soft delete. |
| Ver consentimientos | ✅ | ✅ | ✅ | - | Lista de consentimientos. |
| Subir consentimiento | ✅ | ✅ | ❌ | ✅ Obligatorio | Solo ADMIN/ODONT. |
| Descargar consentimiento | ✅ | ✅ | ✅ | ✅ Opcional | Tracking de descargas. |
| Ver notas administrativas | ✅ | ✅ | ✅ | - | Notas internas. |
| Editar notas administrativas | ✅ | ❌ | ✅ | ✅ Obligatorio | Solo ADMIN/RECEP. |
| Ver historial de citas | ✅ | ✅ | ✅ | - | Lista completa. |
| Ver facturación | ✅ | ✅ | ✅ | - | Resumen financiero (si aplica). |
| Exportar datos | ✅ | ✅ | ⚠️ Condicional | ✅ Obligatorio | RECEP solo si está habilitado. |

---

## 🎯 MVP Funcionalidades por Tab

### Tab: Anamnesis

#### ✅ MVP - Debe incluir:

**Ver:**
- [x] Formulario de anamnesis completo (adulto/pediátrico)
- [x] Estado de completitud (indicador visual)
- [x] Fecha de última actualización
- [x] Lista de alergias con severidad
- [x] Lista de medicaciones actuales
- [x] Indicadores visuales de campos críticos (alergias severas, embarazo)

**Crear/Editar:**
- [x] Botón "Completar Anamnesis" o "Actualizar Anamnesis"
- [x] Formulario modal o página completa con secciones:
  - Datos generales (motivo consulta, dolor actual, urgencia)
  - Antecedentes médicos (enfermedades crónicas)
  - Alergias (agregar desde catálogo o texto libre)
  - Medicación actual (agregar desde catálogo o texto libre)
  - Hábitos (tabaco, bruxismo, higiene)
  - Embarazo (solo si es mujer)
- [x] Guardar como borrador (auto-save opcional)
- [x] Validación de campos requeridos

**Buscar/Filtrar:**
- [x] No necesario en MVP (solo una anamnesis por paciente)

**Acciones mínimas:**
1. Ver anamnesis existente o estado "No completada"
2. Completar/actualizar anamnesis
3. Agregar/eliminar alergias y medicaciones
4. Sincronización automática con banderas de riesgo del header

#### ⏳ Futuro (no MVP):
- Historial de versiones con diff visual
- Comparar versiones lado a lado
- Plantillas de anamnesis
- Importar desde otros sistemas
- Notificaciones de cambios críticos

---

### Tab: Historial Clínico

#### ✅ MVP - Debe incluir:

**Ver:**
- [x] Lista de consultas ordenadas por fecha (más reciente primero)
- [x] Card por consulta con:
  - Fecha y hora
  - Profesional
  - Motivo de consulta
  - Estado (en progreso, completada, cancelada)
  - Resumen de diagnósticos (badges)
  - Resumen de procedimientos (count)
  - Indicador de adjuntos (si tiene)
- [x] Vista detalle al hacer click:
  - Información completa de la consulta
  - Diagnósticos con estado
  - Procedimientos realizados
  - Notas clínicas
  - Signos vitales
  - Adjuntos (galería)

**Crear/Editar:**
- [x] Botón "Nueva Consulta" (redirige a crear cita o iniciar consulta)
- [x] Editar consulta en progreso (solo si está abierta)
- [x] Agregar nota clínica rápida (sin consulta asociada)

**Buscar/Filtrar:**
- [x] Filtro por rango de fechas (último mes, último año, personalizado)
- [x] Búsqueda básica en motivo/notas (input de texto)

**Acciones mínimas:**
1. Ver lista de consultas con información esencial
2. Expandir/ver detalle de consulta
3. Filtrar por fecha
4. Buscar texto en consultas
5. Navegar a crear nueva consulta

#### ⏳ Futuro (no MVP):
- Filtros avanzados (por diagnóstico, procedimiento, profesional)
- Vista timeline visual
- Exportar historial completo
- Comparar consultas
- Estadísticas de visitas
- Gráficos de evolución

---

### Tab: Planes de Tratamiento

#### ✅ MVP - Debe incluir:

**Ver:**
- [x] Lista de planes activos (cards con progreso)
- [x] Indicador visual de progreso (barra de progreso o porcentaje)
- [x] Pasos del plan con estado (pendiente, en progreso, completado)
- [x] Fecha de creación y última actualización
- [x] Profesional responsable

**Crear/Editar:**
- [x] Botón "Nuevo Plan de Tratamiento"
- [x] Formulario básico:
  - Nombre del plan
  - Descripción
  - Pasos (agregar múltiples)
  - Fecha estimada de inicio
- [x] Marcar paso como completado
- [x] Cerrar plan (marcar como completado)
- [x] Cancelar plan (con motivo)

**Buscar/Filtrar:**
- [x] Filtro por estado (Activo, Completado, Cancelado)
- [x] Búsqueda por nombre del plan

**Acciones mínimas:**
1. Ver planes activos con progreso
2. Crear nuevo plan con pasos básicos
3. Marcar pasos como completados
4. Cerrar o cancelar plan
5. Filtrar por estado

#### ⏳ Futuro (no MVP):
- Asociar procedimientos a pasos
- Presupuesto y costos
- Notificaciones de vencimiento
- Plantillas de planes
- Compartir plan con paciente
- Aprobación de planes

---

### Tab: Odontograma

#### ✅ MVP - Debe incluir:

**Ver:**
- [x] Odontograma interactivo (vista completa de piezas)
- [x] Estado actual de cada pieza (colores/iconos)
- [x] Leyenda de condiciones (caries, restauración, ausente, etc.)
- [x] Fecha de última actualización
- [x] Información de la pieza al hacer hover

**Crear/Editar:**
- [x] Click en pieza para editar
- [x] Modal o panel lateral con opciones:
  - Agregar condición (caries, restauración, extracción, etc.)
  - Eliminar condición
  - Notas de la pieza
- [x] Guardar cambios (crea nueva versión)
- [x] Confirmación antes de eliminar condición

**Buscar/Filtrar:**
- [x] No necesario en MVP (solo un odontograma actual)

**Acciones mínimas:**
1. Ver odontograma actual
2. Click en pieza para ver/editar
3. Agregar condiciones a piezas
4. Eliminar condiciones (con confirmación)
5. Ver fecha de última actualización

#### ⏳ Futuro (no MVP):
- Periodontograma completo
- Historial de versiones con timeline
- Comparar versiones
- Restaurar versión anterior
- Exportar a PDF/imagen
- Vista 3D (avanzado)

---

### Tab: Administrativo

#### ✅ MVP - Debe incluir:

**Ver:**
- [x] Sección de responsables legales (lista)
- [x] Sección de consentimientos (lista con estado)
- [x] Notas administrativas (texto)
- [x] Resumen de citas (últimas 5-10)
- [x] Información de contacto completa

**Crear/Editar:**
- [x] Agregar responsable legal (formulario básico)
- [x] Editar responsable legal
- [x] Eliminar responsable legal (soft delete)
- [x] Subir consentimiento (drag & drop o botón)
- [x] Editar notas administrativas (textarea)

**Buscar/Filtrar:**
- [x] No necesario en MVP (listas pequeñas)

**Acciones mínimas:**
1. Ver responsables legales
2. Agregar/editar responsable
3. Ver consentimientos
4. Subir nuevo consentimiento
5. Ver/editar notas administrativas

#### ⏳ Futuro (no MVP):
- Gestión completa de facturación
- Historial de pagos
- Seguros y coberturas
- Documentos adicionales
- Exportar datos administrativos

---

## 🎨 Recomendaciones UX/UI Concretas

### 1. Header del Paciente

#### Banderas de Riesgo
**Problema:** Las banderas pueden verse "ruidosas" si hay muchas.

**Solución MVP:**
- **Banner superior:** Solo para alergias severas (ya implementado). Usar color `error-500` con icono `AlertTriangle`. Aparece solo si `highSeverityAllergies > 0`.
- **Badges en header:** Máximo 3 badges visibles:
  1. Alergias severas (si > 0) - `variant="destructive"`
  2. Embarazo (si aplica) - `variant="secondary"` con icono `Baby`
  3. Urgencia (si es URGENCIA) - `variant="destructive"`
- **Tooltip en hover:** Mostrar detalles adicionales (qué alergias, desde cuándo embarazada, etc.)
- **Colapso inteligente:** Si hay más de 3, mostrar "+X más" con dropdown

**Implementación sugerida:**
```tsx
// Componente PatientRiskBadges con lógica de colapso
// Mostrar siempre las 2 más críticas, colapsar el resto
```

#### Edición Inline vs Modal
**Recomendación:** Usar **modal/sheet** para editar datos del header.

**Razón:**
- Los campos son muchos y requieren validación
- Mejor UX para mostrar confirmaciones y diffs
- Permite agrupar campos relacionados

**Flujo sugerido:**
1. Click en "Editar Paciente" → Abre `EditPatientSheet`
2. Formulario con secciones (Identidad, Contacto, Ubicación)
3. Al guardar, mostrar diff de cambios críticos (nombre, documento)
4. Confirmación para cambios críticos
5. Toast de éxito con link a audit log

### 2. Historial Clínico - Navegación entre Consultas

**Problema:** Navegar entre múltiples consultas puede ser confuso.

**Solución MVP:**

#### Vista Lista (Default)
- Cards apilados verticalmente
- Cada card expandible (accordion)
- Indicador visual de consulta actual (si está en progreso)
- Badge de "Nueva" si tiene menos de 24h

#### Vista Detalle (Al hacer click)
- Navegación con flechas anterior/siguiente
- Breadcrumb: "Historial Clínico > Consulta del [fecha]"
- Botón "Volver a lista"
- Información completa expandida

**Componente sugerido:**
```tsx
// ClinicalHistoryTab con:
// - Lista de consultas (default)
// - Vista detalle con navegación (al expandir)
// - Filtros en top bar
```

#### Indicadores Visuales
- **Color de borde izquierdo** según estado:
  - Verde: Completada
  - Azul: En progreso
  - Gris: Cancelada
- **Icono de adjuntos** si tiene RX/fotos
- **Badge de diagnósticos** con count

### 3. Odontograma - Interactividad

**Problema:** El odontograma puede ser abrumador si hay muchas condiciones.

**Solución MVP:**

#### Vista Principal
- Odontograma completo visible
- **Hover:** Tooltip con condiciones de la pieza
- **Click:** Abre panel lateral o modal con detalles
- **Colores sutiles:** Usar colores pastel para condiciones (no saturados)
- **Leyenda siempre visible:** Sidebar o footer con leyenda

#### Panel de Edición
- Al hacer click en pieza, panel lateral (drawer) se abre
- Lista de condiciones actuales
- Botón "Agregar condición"
- Botón "Eliminar" con confirmación
- Campo de notas

**Componente sugerido:**
```tsx
// OdontogramView con:
// - Canvas interactivo (SVG o componente especializado)
// - Drawer lateral para edición
// - Leyenda flotante
```

### 4. Planes de Tratamiento - Progreso Visual

**Problema:** Mostrar progreso de manera clara y motivadora.

**Solución MVP:**

#### Card de Plan
- **Barra de progreso** horizontal (ej: 3/5 pasos completados = 60%)
- **Lista de pasos** con checkboxes
- **Fecha estimada** de finalización
- **Badge de estado** (Activo, Completado, Cancelado)

#### Vista Detalle
- Timeline vertical de pasos
- Cada paso con:
  - Checkbox (completado/pendiente)
  - Fecha de completado (si aplica)
  - Profesional que completó
  - Notas del paso

**Componente sugerido:**
```tsx
// TreatmentPlanCard con ProgressBar
// TreatmentPlanDetail con Timeline component
```

### 5. Anamnesis - Estado de Completitud

**Problema:** Indicar claramente qué falta completar.

**Solución MVP:**

#### Indicador de Completitud
- **Progress bar** en top del formulario (ej: 75% completado)
- **Secciones coloreadas:**
  - Verde: Completada
  - Amarillo: Parcialmente completada
  - Gris: No completada
- **Badge de "Crítico"** en secciones obligatorias (alergias, medicación)

#### Guardado Automático
- **Auto-save** cada 30 segundos (opcional, puede desactivarse)
- **Indicador de "Guardado"** en bottom right
- **Alerta al salir** si hay cambios sin guardar

### 6. Responsive Design

**Consideraciones MVP:**
- **Mobile:** Header colapsa a una columna, badges se apilan
- **Tablet:** Tabs en horizontal, contenido en 2 columnas cuando sea posible
- **Desktop:** Layout completo con sidebar de información adicional

### 7. Estados de Carga y Vacío

**Estados a implementar:**
- **Loading:** Skeleton loaders para listas, spinners para acciones
- **Empty state:** Ilustraciones o mensajes claros ("No hay consultas aún", "Completa la anamnesis")
- **Error:** Mensajes amigables con opción de reintentar

---

## 🚦 Priorización MVP vs Futuro

### ✅ Debe estar en MVP (Crítico)

1. **Header:**
   - Edición de datos básicos (nombre, documento, contacto)
   - Banderas de riesgo visibles
   - Permisos por rol funcionando

2. **Anamnesis:**
   - Completar/editar anamnesis
   - Agregar/eliminar alergias y medicaciones
   - Sincronización con banderas de riesgo

3. **Historial Clínico:**
   - Ver lista de consultas
   - Ver detalle de consulta
   - Filtro básico por fecha

4. **Planes de Tratamiento:**
   - Crear plan básico
   - Marcar pasos como completados
   - Ver progreso visual

5. **Odontograma:**
   - Ver odontograma actual
   - Editar condiciones de piezas
   - Guardar cambios

6. **Administrativo:**
   - Ver/editar responsables legales
   - Subir/ver consentimientos
   - Notas administrativas

### ⏳ Puede esperar (Futuro)

1. **Historial de versiones** con diff visual (anamnesis, odontograma)
2. **Comparar versiones** lado a lado
3. **Exportar** a PDF (historial, odontograma)
4. **Búsqueda avanzada** con múltiples filtros
5. **Notificaciones** de cambios críticos
6. **Estadísticas y gráficos** de evolución
7. **Vista timeline** visual del historial
8. **Plantillas** para anamnesis y planes
9. **Periodontograma completo** (solo odontograma en MVP)
10. **3D visualization** del odontograma

---

## 🔒 Consideraciones de Seguridad y Auditoría

### Campos que requieren Audit Log obligatorio:
- Nombre completo
- Documento (tipo y número)
- Fecha de nacimiento
- Estado (Activo/Inactivo)
- Cualquier cambio en anamnesis
- Cambios en odontograma
- Cambios en planes de tratamiento
- Eliminación de responsables legales

### Campos que requieren Confirmación:
- Cambio de nombre completo (mostrar diff)
- Cambio de documento (validar unicidad)
- Cambio de fecha de nacimiento (validar coherencia)
- Cambio de estado a Inactivo
- Eliminación de condiciones en odontograma
- Cancelación de plan de tratamiento

### Implementación sugerida:
```tsx
// Hook useAuditLog para registrar cambios
// Componente ConfirmDialog para confirmaciones críticas
// Servicio de validación de cambios críticos
```

---

## 📝 Checklist de Implementación MVP

### Header
- [ ] Implementar `EditPatientSheet` con validaciones
- [ ] Agregar confirmación para cambios críticos
- [ ] Integrar audit log en actualizaciones
- [ ] Mejorar visualización de banderas de riesgo
- [ ] Sincronizar banderas con anamnesis

### Anamnesis Tab
- [ ] Formulario completo de anamnesis
- [ ] Gestión de alergias (agregar/eliminar)
- [ ] Gestión de medicaciones (agregar/eliminar)
- [ ] Indicador de completitud
- [ ] Auto-save opcional

### Historial Clínico Tab
- [ ] Lista de consultas con cards
- [ ] Vista detalle expandible
- [ ] Filtro por fecha
- [ ] Búsqueda básica
- [ ] Navegación entre consultas

### Planes de Tratamiento Tab
- [ ] Lista de planes con progreso
- [ ] Crear nuevo plan
- [ ] Marcar pasos como completados
- [ ] Cerrar/cancelar plan
- [ ] Filtro por estado

### Odontograma Tab
- [ ] Vista interactiva del odontograma
- [ ] Panel de edición por pieza
- [ ] Agregar/eliminar condiciones
- [ ] Leyenda visible
- [ ] Guardar cambios con versión

### Administrativo Tab
- [ ] Lista de responsables legales
- [ ] CRUD de responsables
- [ ] Lista de consentimientos
- [ ] Subir consentimiento
- [ ] Notas administrativas

---

**Documento creado:** Diciembre 2024  
**Versión:** 1.0  
**Autor:** Guía de diseño para MVP de ficha de paciente

