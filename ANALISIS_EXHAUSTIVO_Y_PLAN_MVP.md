# Análisis Exhaustivo del Sistema de Clínica Odontológica
## Plan de Trabajo MVP - 5 Días

---

## RESUMEN EJECUTIVO

El sistema presenta una **arquitectura sólida** con Next.js, Prisma, PostgreSQL y NextAuth, con una estructura de base de datos bien diseñada. La mayoría de los módulos críticos están **implementados parcialmente**, pero requieren **completar funcionalidades**, **mejorar validaciones**, **fortalecer auditoría** y **corregir bugs** para alcanzar un MVP funcional.

**Estado General:** El proyecto está aproximadamente al **70-75%** de completitud para un MVP funcional. Las bases están bien establecidas, pero faltan detalles críticos de implementación, validaciones robustas y pruebas.

**Riesgos Críticos Identificados:**
1. **Auditoría incompleta**: No todos los módulos registran cambios en AuditLog
2. **Validaciones de solapamiento**: Funcionan pero pueden mejorarse
3. **Historial de odontograma**: Implementado pero requiere mejoras en visualización
4. **Consentimientos**: Funcional pero falta validación automática en algunos flujos
5. **Gestión de documentos**: Funcional pero falta validación de tipos y tamaños

---

## 1. ANÁLISIS DETALLADO POR MÓDULO

### 1.1 AUTENTICACIÓN

**Requerimiento:** Validación de usuarios mediante credenciales (usuario + contraseña), contraseña cifrada, roles (doctor, secretario/recepcionista, administrador).

**Estado:** ✅ **CUMPLE COMPLETAMENTE**

**Evidencia:**
- Implementado en `src/auth.ts` con NextAuth v5
- Contraseñas cifradas con `bcryptjs` (línea 69: `bcrypt.compare`)
- Roles definidos: ADMIN, ODONT, RECEP (enum `RolNombre` en schema.prisma)
- Validación de usuario activo (`estaActivo`)
- Registro de último login (`ultimoLoginAt`)

**Fortalezas:**
- Uso de NextAuth (estándar de la industria)
- Cifrado adecuado de contraseñas
- Manejo de sesiones JWT
- Validación de usuarios activos

**Riesgos/Problemas:**
- ⚠️ **BAJO**: No se detectó rate limiting para intentos de login fallidos
- ⚠️ **BAJO**: No hay política de expiración de contraseñas

**Recomendaciones:**
- Agregar rate limiting en producción
- Considerar política de contraseñas (longitud mínima, complejidad)

---

### 1.2 REGISTRO DE PACIENTES

**Requerimiento:** Alta de pacientes por recepcionista con datos obligatorios (nombre completo, género, DNI/Cédula, RUC si corresponde, teléfono, correo electrónico, domicilio), antecedentes médicos (alergias, medicación), datos complementarios (responsable de pago, preferencias de contacto), digitalización de documentos, evitar pérdida de fichas físicas.

**Estado:** ✅ **CUMPLE PARCIALMENTE** (85%)

**Evidencia:**
- Formulario completo en `src/components/pacientes/wizard/PacienteWizard.tsx`
- API en `src/app/api/pacientes/route.ts` y `src/app/api/pacientes/_service.create.ts`
- Schema de validación en `src/app/api/pacientes/_schemas.ts`
- Modelo de datos completo en `prisma/schema.prisma`:
  - `Persona` (nombres, apellidos, género, fechaNacimiento, direccion, ciudad, pais)
  - `Documento` (tipo, numero, RUC)
  - `PersonaContacto` (teléfono, email con preferencias)
  - `PacienteResponsable` (responsable de pago)
  - `PatientAllergy` y `PatientMedication` (antecedentes médicos)
- Sistema de adjuntos implementado (`Adjunto` model con Cloudinary)
- Auditoría parcial: se registra creación en `createPaciente` pero falta en algunos campos

**Fortalezas:**
- Estructura de datos completa y normalizada
- Validación con Zod
- Soporte para múltiples contactos con preferencias
- Integración con Cloudinary para documentos
- Transacciones atómicas en creación

**Riesgos/Problemas:**
- ⚠️ **MEDIO**: Auditoría no completa en todos los campos modificados
- ⚠️ **MEDIO**: No se detectó validación de duplicados por DNI antes de crear
- ⚠️ **BAJO**: Falta validación de formato de teléfono por país
- ⚠️ **BAJO**: No hay backup automático de documentos (depende de Cloudinary)

**Recomendaciones:**
- Completar auditoría en todas las operaciones de paciente
- Agregar validación de duplicados por DNI antes de crear
- Implementar validación de formato de teléfono
- Documentar proceso de backup de Cloudinary

---

### 1.3 AGENDA DE TURNOS (CITAS)

**Requerimiento:** Agenda digital para recepcionista/odontólogo, crear/reprogramar/cancelar citas, registrar tipo de tratamiento, duración estimada, profesional asignado, datos básicos del paciente, prevenir solapamiento de turnos, reorganizar citas ante cancelaciones.

**Estado:** ✅ **CUMPLE PARCIALMENTE** (80%)

**Evidencia:**
- Modelo `Cita` completo en schema.prisma con estados (SCHEDULED, CONFIRMED, CHECKED_IN, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW)
- Creación de citas: `src/app/api/agenda/citas/route.ts` y `src/app/api/agenda/citas/_create.service.ts`
- Validación de solapamiento implementada en `findConflicts()` (líneas 26-126 de `_create.service.ts`)
- Reprogramación: `src/app/api/agenda/citas/[id]/reprogramar/_service.ts` con validación de conflictos
- Cancelación: `src/app/api/agenda/citas/[id]/cancelar/route.ts`
- Historial de estados: `CitaEstadoHistorial` model
- Transiciones de estado: `src/app/api/agenda/citas/[id]/transition/_service.ts`

**Fortalezas:**
- Validación robusta de solapamientos (profesional y consultorio)
- Sistema de estados bien definido
- Historial de cambios de estado
- Reprogramación crea nueva cita y cancela la anterior (mantiene trazabilidad)
- Transacciones atómicas

**Riesgos/Problemas:**
- ⚠️ **MEDIO**: La reprogramación crea una nueva cita en lugar de actualizar la existente (puede confundir en reportes)
- ⚠️ **BAJO**: No hay validación de horarios de trabajo del profesional
- ⚠️ **BAJO**: No se detectó validación de disponibilidad de consultorio
- ⚠️ **MEDIO**: Auditoría parcial: se registra creación y reprogramación, pero falta en algunos campos de actualización

**Recomendaciones:**
- Considerar opción de actualizar cita existente vs crear nueva en reprogramación
- Agregar validación de horarios de trabajo del profesional
- Completar auditoría en todas las operaciones de citas
- Agregar validación de disponibilidad de consultorio

---

### 1.4 TRATAMIENTOS Y PROCEDIMIENTOS

**Requerimiento:** Documentar procedimientos realizados, notas clínicas, resultados, anexar fotografías, radiografías, estudios de laboratorio, historia clínica y odontograma, registrar y consultar historia clínica, gestionar odontograma interactivo, registrar diagnósticos y planes de tratamiento, registrar alergias y medicación, guardar versiones históricas por cita, adjuntar imágenes/radiografías/documentos, visualizar historial del odontograma, auditoría completa.

**Estado:** ✅ **CUMPLE PARCIALMENTE** (75%)

**Evidencia:**
- Modelo `Consulta` (1:1 con Cita) con estados DRAFT/FINAL
- `ConsultaProcedimiento` para procedimientos realizados
- `ProcedimientoCatalogo` para catálogo de procedimientos
- `ClinicalHistoryEntry` para historia clínica general
- `PatientDiagnosis` para diagnósticos
- `PatientAllergy` y `PatientMedication` para alergias y medicación
- `Adjunto` para fotografías, radiografías, documentos
- `OdontogramSnapshot` y `OdontogramEntry` para odontograma versionable
- Workspace de consulta: `src/components/consulta-clinica/ConsultaClinicaWorkspace.tsx`
- Módulos implementados:
  - `AnamnesisMVPForm` (anamnesis)
  - `DiagnosticosModule` (diagnósticos)
  - `ProcedimientosModule` (procedimientos)
  - `AdjuntosModule` (adjuntos)
  - `OdontogramaModule` (odontograma)
  - `VitalesModule` (signos vitales)
  - `MedicacionModule` (medicación)
  - `PlanesTratamientoModule` (planes de tratamiento)

**Fortalezas:**
- Estructura completa de datos clínicos
- Odontograma versionable con snapshots
- Separación clara entre anamnesis, diagnósticos, procedimientos
- Sistema de adjuntos funcional con Cloudinary
- Workspace integrado para consulta clínica

**Riesgos/Problemas:**
- ⚠️ **ALTO**: Auditoría incompleta: no se detectó registro de cambios en odontograma en AuditLog
- ⚠️ **MEDIO**: Historial de odontograma implementado pero falta mejor visualización comparativa
- ⚠️ **MEDIO**: No se detectó validación de que procedimientos estén asociados a una consulta activa
- ⚠️ **BAJO**: Falta validación de tipos de archivo permitidos en adjuntos
- ⚠️ **BAJO**: No hay límite de tamaño de archivo validado en frontend

**Recomendaciones:**
- **CRÍTICO**: Implementar auditoría completa para cambios en odontograma
- Mejorar visualización del historial de odontograma (comparación lado a lado)
- Agregar validación de procedimientos asociados a consulta activa
- Validar tipos y tamaños de archivo en frontend y backend
- Completar auditoría en todos los módulos clínicos

---

### 1.5 ODONTOGRAMA

**Requerimiento:** Registrar estado por pieza dental, visualizar historial de cambios del odontograma, auditoría completa de cambios (quién, cuándo, qué se cambió).

**Estado:** ⚠️ **CUMPLE PARCIALMENTE** (70%)

**Evidencia:**
- Modelo `OdontogramSnapshot` y `OdontogramEntry` implementado
- Componente `OdontogramaModule` en `src/components/consulta-clinica/modules/OdontogramaModule.tsx`
- API para guardar: `src/app/api/pacientes/[id]/odontograma/route.ts`
- Historial: componente `OdontogramHistory` existe
- API de historial: se menciona `/api/pacientes/[id]/odontograma/historial` pero no se encontró implementación completa

**Fortalezas:**
- Estructura de datos versionable correcta
- Componente de edición funcional
- Historial de snapshots por paciente

**Riesgos/Problemas:**
- ⚠️ **ALTO**: **AUDITORÍA FALTANTE**: No se detectó registro en AuditLog cuando se modifica el odontograma
- ⚠️ **MEDIO**: API de historial mencionada pero no implementada completamente
- ⚠️ **MEDIO**: Visualización del historial básica, falta comparación detallada
- ⚠️ **BAJO**: No se detectó validación de números de diente válidos (1-32, 51-85)

**Recomendaciones:**
- **CRÍTICO**: Implementar auditoría en `POST /api/pacientes/[id]/odontograma`
- Completar API de historial del odontograma
- Mejorar visualización comparativa del historial
- Agregar validación de números de diente válidos

---

### 1.6 CONSENTIMIENTOS INFORMADOS

**Requerimiento:** Subir y asociar consentimientos firmados para menores de edad y para cirugías en pacientes de todas las edades, ligados al paciente y/o procedimiento, con fecha, responsable y trazabilidad.

**Estado:** ✅ **CUMPLE PARCIALMENTE** (85%)

**Evidencia:**
- Modelo `Consentimiento` completo en schema.prisma
- Tipos: `CONSENTIMIENTO_MENOR_ATENCION`, `TRATAMIENTO_ESPECIFICO`, `ANESTESIA`, `CIRUGIA`, `RADIOGRAFIA`, `DATOS_PERSONALES`, `OTRO`
- Componente `UploadConsentDialog` en `src/components/pacientes/consentimientos/UploadConsentDialog.tsx`
- API: `src/app/api/pacientes/[id]/consentimiento/route.ts` y `_service.ts`
- Validación de consentimiento para menores en `src/app/api/agenda/citas/[id]/transition/_service.ts` (líneas 124-203)
- Auditoría implementada en creación de consentimiento

**Fortalezas:**
- Validación automática de consentimiento para menores al iniciar consulta
- Asociación correcta con paciente y responsable
- Vigencia de consentimientos (vigente_hasta)
- Integración con Cloudinary
- Auditoría en creación

**Riesgos/Problemas:**
- ⚠️ **MEDIO**: No se detectó validación de consentimiento para cirugías en todas las edades antes de procedimientos
- ⚠️ **BAJO**: Falta notificación cuando un consentimiento está próximo a vencer
- ⚠️ **BAJO**: No hay validación de que el responsable tenga autoridad legal

**Recomendaciones:**
- Agregar validación de consentimiento para cirugías antes de procedimientos quirúrgicos
- Implementar alertas de consentimientos próximos a vencer
- Validar autoridad legal del responsable

---

### 1.7 AUDITORÍA

**Requerimiento:** Todas las operaciones críticas deben tener auditoría completa: creación/edición/eliminación de pacientes, creación/reprogramación/cancelación de citas, modificación de historia clínica, procedimientos y odontograma, subida o modificación de consentimientos y documentos. Registrar: usuario, fecha y hora, acción realizada y detalle del cambio.

**Estado:** ⚠️ **CUMPLE PARCIALMENTE** (60%)

**Evidencia:**
- Modelo `AuditLog` implementado en schema.prisma
- Utilidad `writeAudit` y `logAudit` en `src/lib/audit/log.ts`
- Auditoría implementada en:
  - ✅ Creación de pacientes (`createPaciente`)
  - ✅ Creación de citas (`createCita`)
  - ✅ Reprogramación de citas (`reprogramarCita`)
  - ✅ Transiciones de estado de citas (`executeCitaTransition`)
  - ✅ Creación de consentimientos (`crearConsentimiento`)
  - ✅ Exportaciones (`/api/audit/export`)

**Fortalezas:**
- Estructura de auditoría bien diseñada
- Metadata JSON para detalles flexibles
- Registro de IP y user agent

**Riesgos/Problemas:**
- ⚠️ **ALTO**: **AUDITORÍA INCOMPLETA**:
  - ❌ Edición de pacientes: no se detectó auditoría en `updatePaciente`
  - ❌ Eliminación de pacientes: no implementada
  - ❌ Modificación de odontograma: **NO IMPLEMENTADA**
  - ❌ Modificación de procedimientos: no detectada
  - ❌ Modificación de diagnósticos: no detectada
  - ❌ Modificación de historia clínica: no detectada
  - ❌ Modificación de consentimientos: no detectada
  - ❌ Subida/modificación de adjuntos: parcial

**Recomendaciones:**
- **CRÍTICO**: Implementar auditoría en todas las operaciones de modificación
- Agregar auditoría en eliminación de pacientes (soft delete)
- Implementar auditoría en cambios de odontograma
- Completar auditoría en módulos clínicos (procedimientos, diagnósticos, historia clínica)

---

## 2. EVALUACIÓN DE FUNCIONALIDADES CRÍTICAS

### 2.1 ALTA DE PACIENTE

**Estado:** ✅ **FUNCIONAL** (85%)

**Funciona:**
- ✅ Guardado completo de datos obligatorios y complementarios
- ✅ Adjuntar documentación (Cloudinary)
- ✅ Validaciones básicas (campos obligatorios, formatos)

**Falta:**
- ⚠️ Validación de duplicados por DNI antes de crear
- ⚠️ Auditoría completa en edición
- ⚠️ Validación de formato de teléfono

**Resultado:** Funcional para MVP con mejoras recomendadas.

---

### 2.2 CREACIÓN DE CITA

**Estado:** ✅ **FUNCIONAL** (85%)

**Funciona:**
- ✅ Creación correcta con todos los datos requeridos
- ✅ Prevención de solapamiento para mismo profesional
- ✅ Respuestas claras ante errores de validación

**Falta:**
- ⚠️ Validación de horarios de trabajo del profesional
- ⚠️ Validación de disponibilidad de consultorio
- ⚠️ Auditoría completa en todos los campos

**Resultado:** Funcional para MVP.

---

### 2.3 REPROGRAMACIÓN DE CITA

**Estado:** ✅ **FUNCIONAL** (80%)

**Funciona:**
- ✅ Cambio de fecha y hora respetando reglas de solapamiento
- ✅ Historial/auditoría de cambios (crea nueva cita y cancela anterior)
- ✅ Validación de conflictos

**Falta:**
- ⚠️ Opción de actualizar cita existente vs crear nueva
- ⚠️ Validación de horarios de trabajo

**Resultado:** Funcional para MVP.

---

### 2.4 CANCELACIÓN DE CITA

**Estado:** ✅ **FUNCIONAL** (85%)

**Funciona:**
- ✅ Cancelación correcta
- ✅ Trazabilidad (quién canceló, cuándo, motivo)
- ✅ Historial de cambios de estado

**Falta:**
- ⚠️ Auditoría completa en metadata

**Resultado:** Funcional para MVP.

---

### 2.5 CONSULTA DEL PACIENTE POR ODONTÓLOGO

**Estado:** ✅ **FUNCIONAL** (80%)

**Funciona:**
- ✅ Ver datos completos y actualizados del paciente
- ✅ Registrar procedimientos, diagnósticos, notas clínicas y resultados
- ✅ Persistencia correcta y consistente

**Falta:**
- ⚠️ Auditoría completa en cambios
- ⚠️ Validación de procedimientos asociados a consulta activa

**Resultado:** Funcional para MVP con mejoras recomendadas.

---

### 2.6 HISTORIA CLÍNICA COMPLETA DEL PACIENTE

**Estado:** ✅ **FUNCIONAL** (75%)

**Funciona:**
- ✅ Guardado de citas, consultas, procedimientos
- ✅ Relación clara entre paciente, citas, procedimientos, documentos y consentimientos

**Falta:**
- ⚠️ Visualización integrada de toda la historia
- ⚠️ Auditoría completa en cambios

**Resultado:** Funcional para MVP.

---

### 2.7 ODONTOGRAMA

**Estado:** ⚠️ **FUNCIONAL PARCIALMENTE** (70%)

**Funciona:**
- ✅ Registro del estado por pieza dental
- ✅ Visualización básica del historial

**Falta:**
- ❌ **CRÍTICO**: Auditoría completa de cambios (NO IMPLEMENTADA)
- ⚠️ Visualización comparativa del historial mejorada
- ⚠️ API de historial completa

**Resultado:** Funcional para MVP pero **requiere auditoría crítica**.

---

### 2.8 CONSENTIMIENTOS INFORMADOS

**Estado:** ✅ **FUNCIONAL** (85%)

**Funciona:**
- ✅ Subida y asociación de consentimientos firmados
- ✅ Trazabilidad y auditoría básica
- ✅ Validación para menores al iniciar consulta

**Falta:**
- ⚠️ Validación para cirugías en todas las edades
- ⚠️ Alertas de vencimiento

**Resultado:** Funcional para MVP.

---

## 3. PLAN DE TRABAJO EN 5 DÍAS

### DÍA 1 (Lunes) - Fundaciones y Auditoría Crítica
**Objetivos:** Completar auditoría en operaciones críticas y validar alta de pacientes.

**Tareas:**
1. **Auditoría en Odontograma** (2-3 horas)
   - Implementar `writeAudit` en `POST /api/pacientes/[id]/odontograma`
   - Registrar: usuario, fecha, cambios realizados (diff de entries)
   - Probar guardado y verificar registro en AuditLog

2. **Auditoría en Edición de Pacientes** (1-2 horas)
   - Revisar `src/app/api/pacientes/[id]/_service.update.ts`
   - Agregar `writeAudit` para cambios en datos personales, contactos, responsables
   - Registrar diff de campos modificados

3. **Validación de Duplicados en Alta de Paciente** (1 hora)
   - Agregar validación en `createPaciente` para verificar DNI existente
   - Retornar error claro si existe duplicado
   - Probar con DNI duplicado

4. **Validación de Formato de Teléfono** (1 hora)
   - Agregar validación en schema de paciente
   - Validar formato básico (solo números, longitud mínima)
   - Probar con teléfonos inválidos

**Resultado Esperado:**
- ✅ Auditoría completa en odontograma funcionando
- ✅ Auditoría en edición de pacientes funcionando
- ✅ Validación de duplicados funcionando
- ✅ Validación de teléfono funcionando

---

### DÍA 2 (Martes) - Citas y Validaciones
**Objetivos:** Mejorar validaciones de citas y completar auditoría en citas.

**Tareas:**
1. **Validación de Horarios de Trabajo** (2 horas)
   - Revisar modelo `Profesional.disponibilidad` (JSON)
   - Implementar validación en `createCita` y `reprogramarCita`
   - Validar que la cita esté dentro del horario de trabajo del profesional
   - Probar con horarios fuera de rango

2. **Validación de Disponibilidad de Consultorio** (1 hora)
   - Agregar validación en `findConflicts` para consultorio
   - Verificar que consultorio esté activo
   - Probar con consultorio inactivo

3. **Completar Auditoría en Cancelación de Citas** (1 hora)
   - Revisar `src/app/api/agenda/citas/[id]/cancelar/_service.ts`
   - Agregar `writeAudit` con metadata completa (motivo, notas)
   - Verificar registro en AuditLog

4. **Mejorar Mensajes de Error en Validaciones** (1 hora)
   - Revisar mensajes de error en creación/reprogramación de citas
   - Hacer mensajes más claros y específicos
   - Probar con diferentes escenarios de error

**Resultado Esperado:**
- ✅ Validación de horarios de trabajo funcionando
- ✅ Validación de disponibilidad de consultorio funcionando
- ✅ Auditoría completa en cancelación funcionando
- ✅ Mensajes de error mejorados

---

### DÍA 3 (Miércoles) - Módulos Clínicos y Auditoría
**Objetivos:** Completar auditoría en módulos clínicos y mejorar validaciones.

**Tareas:**
1. **Auditoría en Procedimientos** (1.5 horas)
   - Revisar `src/app/api/agenda/citas/[id]/procedimientos/`
   - Agregar `writeAudit` en creación, edición y eliminación
   - Registrar cambios en procedimientos

2. **Auditoría en Diagnósticos** (1.5 horas)
   - Revisar `DiagnosticosModule` y su API
   - Agregar `writeAudit` en creación, actualización y resolución
   - Registrar cambios en diagnósticos

3. **Auditoría en Historia Clínica** (1 hora)
   - Revisar `ClinicalHistoryEntry` y su API
   - Agregar `writeAudit` en creación y edición
   - Registrar cambios en historia clínica

4. **Validación de Procedimientos Asociados a Consulta Activa** (1 hora)
   - Agregar validación en creación de procedimientos
   - Verificar que la consulta esté en estado DRAFT o FINAL
   - Probar con consulta no iniciada

**Resultado Esperado:**
- ✅ Auditoría completa en procedimientos funcionando
- ✅ Auditoría completa en diagnósticos funcionando
- ✅ Auditoría completa en historia clínica funcionando
- ✅ Validación de consulta activa funcionando

---

### DÍA 4 (Jueves) - Odontograma y Consentimientos
**Objetivos:** Mejorar odontograma y completar validaciones de consentimientos.

**Tareas:**
1. **Completar API de Historial de Odontograma** (2 horas)
   - Implementar `GET /api/pacientes/[id]/odontograma/historial`
   - Retornar todos los snapshots ordenados por fecha
   - Incluir información de quién creó cada snapshot
   - Probar con paciente con múltiples snapshots

2. **Mejorar Visualización del Historial de Odontograma** (2 horas)
   - Mejorar componente `OdontogramHistory`
   - Agregar comparación visual lado a lado
   - Mostrar diferencias entre snapshots
   - Probar con múltiples snapshots

3. **Validación de Consentimiento para Cirugías** (1.5 horas)
   - Revisar tipos de procedimientos quirúrgicos en catálogo
   - Agregar validación antes de crear procedimiento quirúrgico
   - Verificar consentimiento vigente de tipo CIRUGIA
   - Probar con procedimiento quirúrgico sin consentimiento

4. **Validación de Números de Diente Válidos** (0.5 horas)
   - Agregar validación en `OdontogramEntry`
   - Validar rango 1-32 y 51-85
   - Probar con números inválidos

**Resultado Esperado:**
- ✅ API de historial de odontograma funcionando
- ✅ Visualización mejorada del historial funcionando
- ✅ Validación de consentimiento para cirugías funcionando
- ✅ Validación de números de diente funcionando

---

### DÍA 5 (Viernes) - Validaciones Finales, Adjuntos y Pruebas
**Objetivos:** Completar validaciones de adjuntos, mejorar mensajes de error y realizar pruebas integrales.

**Tareas:**
1. **Validación de Tipos y Tamaños de Archivo en Adjuntos** (2 horas)
   - Revisar `AttachmentUploadDialog` y API de adjuntos
   - Agregar validación de tipos permitidos (imágenes, PDFs)
   - Agregar validación de tamaño máximo (ej: 10MB)
   - Validar en frontend y backend
   - Probar con archivos inválidos

2. **Auditoría en Modificación de Adjuntos** (1 hora)
   - Revisar API de adjuntos
   - Agregar `writeAudit` en eliminación de adjuntos
   - Registrar cambios en adjuntos

3. **Auditoría en Modificación de Consentimientos** (1 hora)
   - Revisar API de consentimientos
   - Agregar `writeAudit` en actualización y desactivación
   - Registrar cambios en consentimientos

4. **Pruebas Integrales y Corrección de Bugs** (2 horas)
   - Probar flujo completo: alta de paciente → crear cita → iniciar consulta → registrar procedimientos → guardar odontograma
   - Verificar auditoría en cada paso
   - Corregir bugs encontrados
   - Probar casos edge (duplicados, conflictos, validaciones)

**Resultado Esperado:**
- ✅ Validación de tipos y tamaños de archivo funcionando
- ✅ Auditoría completa en adjuntos y consentimientos funcionando
- ✅ Sistema probado integralmente
- ✅ Bugs críticos corregidos

---

## 4. RESUMEN DE PRIORIDADES

### CRÍTICAS (Deben estar funcionando al final de los 5 días)
1. ✅ Auditoría completa en odontograma
2. ✅ Auditoría en edición de pacientes
3. ✅ Validación de duplicados en alta de paciente
4. ✅ Validación de horarios de trabajo en citas
5. ✅ Auditoría completa en módulos clínicos (procedimientos, diagnósticos, historia clínica)
6. ✅ Validación de consentimiento para cirugías
7. ✅ Validación de tipos y tamaños de archivo

### IMPORTANTES (Recomendadas pero no bloqueantes)
1. ⚠️ Mejora de visualización del historial de odontograma
2. ⚠️ Validación de formato de teléfono
3. ⚠️ Validación de disponibilidad de consultorio
4. ⚠️ Mejora de mensajes de error

### OPCIONALES (Pueden dejarse para después del MVP)
1. ⚠️ Alertas de consentimientos próximos a vencer
2. ⚠️ Validación de autoridad legal del responsable
3. ⚠️ Opción de actualizar cita vs crear nueva en reprogramación

---

## 5. CONCLUSIÓN

El sistema está **bien estructurado** y la mayoría de las funcionalidades críticas están **implementadas parcialmente**. El principal trabajo para alcanzar un MVP funcional consiste en:

1. **Completar la auditoría** en todos los módulos (especialmente odontograma y edición de pacientes)
2. **Mejorar validaciones** (duplicados, horarios, tipos de archivo)
3. **Completar APIs** (historial de odontograma)
4. **Mejorar visualizaciones** (historial comparativo)

Con el plan de 5 días propuesto, el sistema debería alcanzar un **MVP funcional** con todas las funcionalidades críticas operativas y auditoría completa.

**Estado Actual:** ~70-75% completo para MVP
**Estado Esperado al Finalizar:** ~95% completo para MVP funcional

---

## 6. NOTAS ADICIONALES

- **Backups**: El sistema depende de Cloudinary para almacenamiento de documentos. Asegurar que Cloudinary tenga backups configurados.
- **Seguridad**: Considerar agregar rate limiting en producción para APIs críticas.
- **Performance**: Las consultas de auditoría pueden volverse lentas con muchos registros. Considerar índices adicionales si es necesario.
- **Testing**: Se recomienda agregar tests automatizados después del MVP para mantener la calidad del código.

