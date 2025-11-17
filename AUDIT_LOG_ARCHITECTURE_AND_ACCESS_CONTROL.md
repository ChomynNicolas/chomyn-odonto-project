# Arquitectura de Auditoría y Control de Acceso
## Sistema de Trazabilidad para Aplicación Clínica SaaS

**Versión:** 1.0  
**Fecha:** 2025-01-XX  
**Autor:** Arquitectura de Software  
**Estado:** Propuesta de Implementación

---

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Modelo de Permisos y Visibilidad](#modelo-de-permisos-y-visibilidad)
3. [Diseño Funcional de Auditoría](#diseño-funcional-de-auditoría)
4. [UX/UI según Rol](#uxui-según-rol)
5. [Seguridad y Cumplimiento](#seguridad-y-cumplimiento)
6. [Plan de Implementación por Fases](#plan-de-implementación-por-fases)
7. [Anexos](#anexos)

---

## 1. Visión General

### 1.1 Objetivos

El sistema de auditoría debe proporcionar:

- **Trazabilidad completa**: Registro de todas las acciones críticas en el sistema
- **Privacidad**: Protección de datos sensibles según rol del usuario
- **Cumplimiento**: Adherencia a regulaciones de salud (HIPAA-like, GDPR)
- **Investigación**: Capacidad de investigar incidentes y cambios no autorizados
- **Transparencia**: Visibilidad apropiada para cada rol sin exponer información innecesaria

### 1.2 Principios Fundamentales

1. **Principio de Menor Privilegio**: Los usuarios solo ven lo necesario para su trabajo
2. **Inmutabilidad**: Los logs de auditoría nunca se modifican ni eliminan
3. **Integridad**: Los logs son verificables y no pueden ser alterados
4. **Confidencialidad**: Datos sensibles se ofuscan según el rol
5. **Disponibilidad**: Los logs están disponibles para auditorías cuando se necesiten

### 1.3 Tipos de Auditoría

#### A. Auditoría Global (Solo ADMIN)
- **Ubicación**: `/audit-log`
- **Alcance**: Todos los eventos del sistema
- **Visibilidad**: Completa, sin restricciones
- **Uso**: Investigaciones, cumplimiento, análisis de seguridad

#### B. Auditoría Contextual (ODONT y RECEP)
- **Ubicación**: Integrada en contextos específicos (ficha de paciente, consulta, cita)
- **Alcance**: Solo eventos relacionados con el contexto actual
- **Visibilidad**: Limitada a información relevante para el rol
- **Uso**: Seguimiento de cambios en el trabajo diario

---

## 2. Modelo de Permisos y Visibilidad

### 2.1 Matriz de Acceso por Rol

| Recurso | ADMIN | ODONT | RECEP |
|---------|-------|-------|-------|
| **Página Global `/audit-log`** | ✅ Completo | ❌ Bloqueado | ❌ Bloqueado |
| **Historial de Paciente** | ✅ Completo | ✅ Solo clínico | ❌ No accede |
| **Historial de Consulta** | ✅ Completo | ✅ Solo propia | ❌ No accede |
| **Historial de Cita** | ✅ Completo | ✅ Solo propia | ✅ Solo asignadas |
| **Historial de Factura** | ✅ Completo | ❌ No accede | ✅ Solo propia |
| **Cambios de Permisos** | ✅ Completo | ❌ No accede | ❌ No accede |
| **Accesos de Usuarios** | ✅ Completo | ❌ No accede | ❌ No accede |

### 2.2 Reglas de Visibilidad por Campo

#### Campos Siempre Visibles (Todos los Roles)
- Fecha y hora del evento
- Tipo de acción (CREATE, UPDATE, DELETE, etc.)
- Entidad afectada (Patient, Appointment, etc.)
- ID del recurso afectado

#### Campos Solo para ADMIN
- IP del usuario
- User-Agent completo
- Endpoint/Path de la petición
- Metadata técnica completa
- Información de otros usuarios
- Cambios en permisos y roles
- Accesos a historias clínicas de otros pacientes

#### Campos para ODONT (Contextual)
- Usuario que realizó la acción (solo nombre, sin email)
- Cambios en datos clínicos del paciente actual
- Cambios en su propia consulta
- Resumen de cambios (sin detalles técnicos)
- **NO ve**: IP, user-agent, cambios de otros profesionales, datos administrativos

#### Campos para RECEP (Contextual)
- Usuario que realizó la acción (solo nombre)
- Cambios en estado de citas asignadas
- Cambios en facturas/recibos propios
- Resumen de cambios administrativos
- **NO ve**: IP, user-agent, datos clínicos, cambios de otros usuarios

### 2.3 Ofuscación de Datos Sensibles

#### Datos que se Ofuscan para ODONT/RECEP
- **Emails de usuarios**: `usuario@***.com`
- **IPs**: `192.168.***.***`
- **Datos de otros pacientes**: Solo ID, sin nombres
- **Metadata técnica**: Solo resumen, sin detalles

#### Datos que NUNCA se Registran
- Contraseñas (ni hash)
- Números de tarjeta de crédito completos
- Información médica sensible no relacionada con el contexto
- Tokens de sesión

### 2.4 Implementación RBAC

```typescript
// src/lib/audit/rbac.ts

export enum AuditAccessLevel {
  NONE = "NONE",           // Sin acceso
  CONTEXTUAL = "CONTEXTUAL", // Solo contexto específico
  FULL = "FULL"            // Acceso completo
}

export interface AuditPermission {
  canViewGlobalLog: boolean
  canViewContextualLog: boolean
  canExportLogs: boolean
  canViewTechnicalDetails: boolean
  canViewOtherUsers: boolean
  canViewSensitiveActions: boolean
  accessLevel: AuditAccessLevel
}

export function getAuditPermissions(role: "ADMIN" | "ODONT" | "RECEP"): AuditPermission {
  switch (role) {
    case "ADMIN":
      return {
        canViewGlobalLog: true,
        canViewContextualLog: true,
        canExportLogs: true,
        canViewTechnicalDetails: true,
        canViewOtherUsers: true,
        canViewSensitiveActions: true,
        accessLevel: AuditAccessLevel.FULL,
      }
    case "ODONT":
      return {
        canViewGlobalLog: false,
        canViewContextualLog: true,
        canExportLogs: false,
        canViewTechnicalDetails: false,
        canViewOtherUsers: false,
        canViewSensitiveActions: false,
        accessLevel: AuditAccessLevel.CONTEXTUAL,
      }
    case "RECEP":
      return {
        canViewGlobalLog: false,
        canViewContextualLog: true,
        canExportLogs: false,
        canViewTechnicalDetails: false,
        canViewOtherUsers: false,
        canViewSensitiveActions: false,
        accessLevel: AuditAccessLevel.CONTEXTUAL,
      }
    default:
      return {
        canViewGlobalLog: false,
        canViewContextualLog: false,
        canExportLogs: false,
        canViewTechnicalDetails: false,
        canViewOtherUsers: false,
        canViewSensitiveActions: false,
        accessLevel: AuditAccessLevel.NONE,
      }
  }
}
```

---

## 3. Diseño Funcional de Auditoría

### 3.1 Estructura del Registro de Auditoría

Cada evento de auditoría debe contener:

#### Campos Obligatorios
```typescript
{
  id: number                    // ID único del log
  actorId: number              // ID del usuario que realizó la acción
  action: string               // Tipo de acción (ej: "PATIENT_UPDATE")
  entity: string               // Entidad afectada (ej: "Patient")
  entityId: number             // ID de la entidad afectada
  createdAt: DateTime          // Timestamp preciso
}
```

#### Campos Opcionales pero Recomendados
```typescript
{
  ip: string | null            // IP del cliente
  metadata: {
    // Contexto técnico
    path?: string              // Endpoint de la API
    userAgent?: string         // User-Agent del navegador
    method?: string            // HTTP method
    
    // Contexto de negocio
    summary?: string           // Resumen legible del cambio
    reason?: string            // Motivo del cambio (si aplica)
    
    // Diferencias (para UPDATE)
    changes?: {
      added?: number
      removed?: number
      modified?: number
    }
    diff?: {
      field: string
      oldValue: unknown
      newValue: unknown
    }[]
    
    // Metadata específica por acción
    [key: string]: unknown
  }
}
```

### 3.2 Categorías de Acciones

#### Acciones de Paciente
- `PATIENT_CREATE` - Crear paciente
- `PATIENT_UPDATE` - Actualizar datos del paciente
- `PATIENT_DELETE` - Eliminar paciente (lógico)
- `PATIENT_VIEW` - Ver ficha completa (solo si es sensible)
- `PATIENT_PRINT` - Imprimir ficha
- `PATIENT_PDF_EXPORT` - Exportar PDF

#### Acciones de Consulta Clínica
- `CONSULTA_CREATE` - Crear consulta
- `CONSULTA_UPDATE` - Actualizar consulta
- `CONSULTA_FINALIZE` - Finalizar consulta
- `ODONTOGRAM_CREATE` - Crear odontograma
- `ODONTOGRAM_UPDATE` - Actualizar odontograma
- `DIAGNOSIS_CREATE` - Crear diagnóstico
- `DIAGNOSIS_UPDATE` - Actualizar diagnóstico
- `PROCEDURE_CREATE` - Registrar procedimiento
- `ATTACHMENT_UPLOAD` - Subir adjunto
- `ATTACHMENT_DELETE` - Eliminar adjunto

#### Acciones de Citas
- `APPOINTMENT_CREATE` - Crear cita
- `APPOINTMENT_UPDATE` - Actualizar cita
- `APPOINTMENT_CANCEL` - Cancelar cita
- `APPOINTMENT_RESCHEDULE` - Reprogramar cita
- `APPOINTMENT_STATUS_CHANGE` - Cambiar estado

#### Acciones de Usuarios y Seguridad
- `USER_CREATE` - Crear usuario
- `USER_UPDATE` - Actualizar usuario
- `USER_DELETE` - Eliminar usuario
- `USER_ROLE_CHANGE` - Cambiar rol de usuario
- `USER_PASSWORD_CHANGE` - Cambiar contraseña
- `LOGIN` - Inicio de sesión
- `LOGIN_FAILED` - Intento de login fallido
- `LOGOUT` - Cierre de sesión
- `SESSION_EXPIRED` - Sesión expirada

#### Acciones de Facturación
- `INVOICE_CREATE` - Crear factura
- `INVOICE_UPDATE` - Actualizar factura
- `INVOICE_CANCEL` - Anular factura
- `PAYMENT_RECORD` - Registrar pago
- `PAYMENT_REFUND` - Reembolso

### 3.3 Niveles de Detalle según Acción

#### Nivel 1: Acciones Críticas (Registro Completo)
- Cambios de permisos
- Eliminaciones
- Accesos a datos sensibles
- Cambios en configuración del sistema

**Registro**: Incluye diff completo, IP, user-agent, motivo

#### Nivel 2: Acciones Importantes (Registro Detallado)
- Creación/actualización de pacientes
- Creación/actualización de consultas
- Cambios en diagnósticos
- Modificaciones de odontograma

**Registro**: Incluye diff, resumen, usuario, timestamp

#### Nivel 3: Acciones Rutinarias (Registro Básico)
- Visualizaciones (solo si es sensible)
- Impresiones
- Exportaciones

**Registro**: Incluye acción, entidad, usuario, timestamp

### 3.4 Formato de Metadata según Tipo de Acción

#### Para UPDATE
```json
{
  "summary": "2 entrada(s) agregada(s), 1 entrada(s) modificada(s)",
  "changes": {
    "added": 2,
    "removed": 0,
    "modified": 1
  },
  "diff": [
    {
      "field": "nombre",
      "oldValue": "Juan",
      "newValue": "Juan Carlos"
    }
  ],
  "path": "/api/pacientes/123",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

#### Para CREATE
```json
{
  "summary": "Paciente creado",
  "entriesCount": 1,
  "path": "/api/pacientes",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

#### Para DELETE
```json
{
  "summary": "Paciente eliminado",
  "reason": "Solicitud del paciente",
  "previousValue": {
    "nombre": "Juan",
    "apellidos": "Pérez"
  },
  "path": "/api/pacientes/123",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

## 4. UX/UI según Rol

### 4.1 ADMIN - Página Global `/audit-log`

#### Vista Principal
```
┌─────────────────────────────────────────────────────────────┐
│  📊 Registro de Auditoría                    [Actualizar]  │
│  Visualiza y rastrea todos los cambios en el sistema       │
│  [Exportar CSV] [Exportar PDF]                             │
├─────────────────────────────────────────────────────────────┤
│  🔍 Filtros (Expandido)                                     │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Desde: [2025-01-01] Hasta: [2025-01-31]            │  │
│  │ Usuario: [Todos ▼] Acción: [Todas ▼]               │  │
│  │ Entidad: [Todas ▼] ID Recurso: [___]               │  │
│  │ Búsqueda: [________________] IP: [________]        │  │
│  │ [Limpiar] [Aplicar Filtros]                        │  │
│  └─────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  📋 Eventos de Auditoría (1,234 registros)                 │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Fecha/Hora    │ Usuario      │ Acción │ Recurso │ ID │ │
│  ├─────────────────────────────────────────────────────┤  │
│  │ 15/01 10:30   │ Dr. Gómez    │ UPDATE │ Patient │ 123│ │
│  │ 15/01 10:25   │ Admin        │ CREATE │ User    │ 45 │ │
│  │ 15/01 10:20   │ Recep. María │ CANCEL │ Cita    │ 67 │ │
│  └─────────────────────────────────────────────────────┘  │
│  [< Anterior] [1] [2] [3] [Siguiente >]                   │
└─────────────────────────────────────────────────────────────┘
```

#### Detalle del Evento (Modal)
```
┌─────────────────────────────────────────────────────────────┐
│  Detalle del Evento de Auditoría #1234              [X]    │
├─────────────────────────────────────────────────────────────┤
│  Información General                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Fecha: 15/01/2025 10:30:15                          │   │
│  │ Usuario: Dr. Juan Gómez (ODONT)                     │   │
│  │ Email: juan.gomez@***.com                           │   │
│  │ Acción: Actualizar Paciente                          │   │
│  │ Recurso: Paciente                                    │   │
│  │ ID Recurso: 123                                      │   │
│  │ IP: 192.168.1.100                                    │   │
│  │ User-Agent: Mozilla/5.0...                          │   │
│  │ Endpoint: /api/pacientes/123                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Cambios Realizados                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Campo        │ Antes        │ Después              │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ nombre        │ Juan         │ Juan Carlos          │   │
│  │ telefono      │ 0981123456   │ 0981123457           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Metadata Completa                                          │
│  [JSON expandible con toda la información]                  │
└─────────────────────────────────────────────────────────────┘
```

**Campos Visibles para ADMIN:**
- ✅ Todos los campos sin restricción
- ✅ IP completa
- ✅ User-Agent completo
- ✅ Email de usuarios
- ✅ Metadata técnica completa
- ✅ Cambios en cualquier entidad
- ✅ Acciones de cualquier usuario

### 4.2 ODONT - Historial Contextual en Ficha de Paciente

#### Vista en Pestaña "Historial de Cambios"
```
┌─────────────────────────────────────────────────────────────┐
│  📋 Historial de Cambios                                    │
│  Registro de modificaciones en la historia clínica          │
├─────────────────────────────────────────────────────────────┤
│  🔍 Filtrar por: [Último mes ▼]                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 15/01/2025 10:30                                     │  │
│  │ 👤 Dr. Juan Gómez                                    │  │
│  │ 📝 Odontograma actualizado                           │  │
│  │ Cambios: 2 dientes modificados                       │  │
│  │ [Ver detalles]                                       │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ 14/01/2025 15:20                                     │  │
│  │ 👤 Dr. Juan Gómez                                    │  │
│  │ 📝 Diagnóstico agregado: Caries                      │  │
│  │ Diente: 16                                            │  │
│  │ [Ver detalles]                                       │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### Detalle Contextual (Drawer/Sidebar)
```
┌─────────────────────────────────────────────────────────────┐
│  Detalle del Cambio                                  [X]    │
├─────────────────────────────────────────────────────────────┤
│  Fecha: 15/01/2025 10:30                                    │
│  Realizado por: Dr. Juan Gómez                              │
│  Acción: Odontograma actualizado                            │
│                                                             │
│  Cambios Realizados                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • Diente 16: Condición cambiada de INTACT a CARIES  │   │
│  │ • Diente 17: Notas agregadas                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Notas: "Caries detectada en examen clínico"                │
└─────────────────────────────────────────────────────────────┘
```

**Campos Visibles para ODONT:**
- ✅ Fecha y hora
- ✅ Nombre del usuario (sin email)
- ✅ Tipo de acción
- ✅ Cambios en datos clínicos
- ✅ Resumen de cambios
- ❌ IP (ofuscada: `***.***.***.***`)
- ❌ User-Agent
- ❌ Cambios de otros profesionales
- ❌ Cambios administrativos
- ❌ Metadata técnica

### 4.3 RECEP - Historial en Gestión de Citas

#### Vista en Panel de Citas
```
┌─────────────────────────────────────────────────────────────┐
│  Cita #1234 - Juan Pérez                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Estado: CONFIRMED                                  │   │
│  │ Fecha: 20/01/2025 10:00                            │   │
│  │                                                      │   │
│  │ 📋 Historial de Cambios                             │   │
│  │ ┌──────────────────────────────────────────────┐   │   │
│  │ │ 15/01 14:30 - María López                     │   │   │
│  │ │ Estado cambiado: SCHEDULED → CONFIRMED        │   │   │
│  │ │                                                 │   │   │
│  │ │ 14/01 09:15 - María López                     │   │   │
│  │ │ Cita reprogramada: 18/01 → 20/01              │   │   │
│  │ └──────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Campos Visibles para RECEP:**
- ✅ Fecha y hora
- ✅ Nombre del usuario (sin email)
- ✅ Cambios en estado de citas
- ✅ Cambios en fechas/horarios
- ✅ Resumen de cambios administrativos
- ❌ IP
- ❌ User-Agent
- ❌ Datos clínicos
- ❌ Cambios de otros usuarios
- ❌ Metadata técnica

---

## 5. Seguridad y Cumplimiento

### 5.1 Protección de Logs

#### Reglas de Inmutabilidad
1. **Los logs NUNCA se modifican**: Una vez creados, son de solo lectura
2. **Los logs NUNCA se eliminan**: Solo se archivan después del período de retención
3. **Acceso de solo lectura**: Ningún usuario puede modificar logs, ni siquiera ADMIN
4. **Integridad verificable**: Hash de cada log para detectar alteraciones

#### Implementación Técnica
```typescript
// Los logs solo se crean, nunca se actualizan
await prisma.auditLog.create({
  data: { /* ... */ }
})

// NO permitir UPDATE ni DELETE
// prisma.auditLog.update() // ❌ BLOQUEADO
// prisma.auditLog.delete() // ❌ BLOQUEADO
```

### 5.2 Retención de Datos

#### Política de Retención
- **Logs activos**: 2 años en base de datos principal
- **Logs archivados**: 5 años adicionales en almacenamiento frío
- **Logs críticos**: Retención permanente (cambios de permisos, eliminaciones)

#### Implementación
```sql
-- Archivar logs mayores a 2 años
CREATE TABLE audit_logs_archive (
  -- Misma estructura que audit_logs
  -- Almacenamiento en S3 o almacenamiento frío
);

-- Proceso automático mensual
-- Mover logs > 2 años a archive
-- Comprimir y almacenar en S3
```

### 5.3 Encriptación

#### Datos que Requieren Encriptación
- **En tránsito**: TLS 1.3 para todas las comunicaciones
- **En reposo**: Encriptación a nivel de base de datos
- **Backups**: Encriptación de backups con claves separadas

#### Implementación
```typescript
// Los logs se almacenan encriptados en la BD
// La aplicación desencripta automáticamente al leer
// Los backups se encriptan antes de almacenar
```

### 5.4 Cumplimiento Regulatorio

#### Principios HIPAA-like Aplicados
1. **Auditoría de Accesos**: Registro de quién accedió a qué y cuándo
2. **Control de Acceso**: Solo usuarios autorizados pueden ver logs
3. **Integridad**: Los logs no pueden ser alterados
4. **Transmisión Segura**: Comunicaciones encriptadas
5. **Retención**: Política clara de retención de datos

#### Principios GDPR Aplicados
1. **Minimización de Datos**: Solo se registra lo necesario
2. **Limitación de Propósito**: Los logs solo para auditoría
3. **Limitación de Almacenamiento**: Retención limitada
4. **Confidencialidad**: Datos sensibles ofuscados según rol

### 5.5 Medidas de Seguridad Adicionales

#### Prevención de Acceso No Autorizado
- Autenticación requerida para todos los endpoints
- Validación de permisos en cada request
- Rate limiting en endpoints de auditoría
- Logging de intentos de acceso no autorizado

#### Detección de Anomalías
- Alertas para múltiples accesos fallidos
- Alertas para accesos fuera de horario laboral
- Alertas para cambios masivos en corto tiempo
- Alertas para accesos desde IPs sospechosas

---

## 6. Plan de Implementación por Fases

### FASE 1: Diseño y Preparación (Semana 1)

#### Paso 1.1: Revisar y Actualizar Modelo de Datos
- [ ] Revisar estructura actual de `AuditLog` en schema.prisma
- [ ] Agregar campos necesarios si faltan (hash, archivedAt, etc.)
- [ ] Crear índices adicionales para búsquedas eficientes
- [ ] Documentar estructura completa

#### Paso 1.2: Definir Reglas RBAC
- [ ] Crear archivo `src/lib/audit/rbac.ts`
- [ ] Implementar función `getAuditPermissions(role)`
- [ ] Definir constantes de acciones y entidades
- [ ] Crear helpers para verificar permisos

#### Paso 1.3: Crear Tipos y Schemas
- [ ] Actualizar `src/lib/types/audit.ts` con tipos completos
- [ ] Crear schemas de validación para filtros
- [ ] Definir interfaces para respuestas según rol
- [ ] Documentar todos los tipos

**Entregables:**
- Schema actualizado
- Archivo RBAC completo
- Tipos TypeScript documentados

---

### FASE 2: Backend - Core de Auditoría (Semana 2)

#### Paso 2.1: Mejorar Función de Escritura de Logs
- [ ] Actualizar `src/lib/audit/log.ts`
- [ ] Agregar validación de campos obligatorios
- [ ] Implementar sanitización de datos sensibles
- [ ] Agregar hash de integridad
- [ ] Mejorar manejo de errores

#### Paso 2.2: Crear Helpers de Filtrado por Rol
- [ ] Crear `src/lib/audit/filters.ts`
- [ ] Implementar función para filtrar campos según rol
- [ ] Implementar función para ofuscar datos sensibles
- [ ] Crear función para generar resúmenes legibles

#### Paso 2.3: Actualizar Endpoints Existentes
- [ ] Actualizar `GET /api/audit/logs` con filtrado por rol
- [ ] Agregar validación de permisos
- [ ] Implementar ofuscación de datos según rol
- [ ] Agregar rate limiting

**Entregables:**
- Función de escritura mejorada
- Helpers de filtrado
- Endpoints actualizados con seguridad

---

### FASE 3: Backend - Endpoints Contextuales (Semana 3)

#### Paso 3.1: Endpoint de Historial de Paciente
- [ ] Crear `GET /api/pacientes/[id]/audit`
- [ ] Filtrar solo eventos del paciente
- [ ] Aplicar visibilidad según rol (ODONT ve más que RECEP)
- [ ] Ofuscar datos sensibles

#### Paso 3.2: Endpoint de Historial de Consulta
- [ ] Crear `GET /api/agenda/citas/[id]/consulta/audit`
- [ ] Filtrar solo eventos de la consulta
- [ ] Verificar que ODONT solo vea sus propias consultas
- [ ] Aplicar filtros de visibilidad

#### Paso 3.3: Endpoint de Historial de Citas
- [ ] Crear `GET /api/agenda/citas/[id]/audit`
- [ ] Filtrar solo eventos de la cita
- [ ] RECEP solo ve citas asignadas
- [ ] ODONT solo ve citas propias

**Entregables:**
- 3 endpoints contextuales funcionales
- Validación de permisos implementada

---

### FASE 4: Frontend - Componentes Contextuales (Semana 4)

#### Paso 4.1: Componente de Historial para Paciente
- [ ] Crear `src/components/pacientes/audit/PatientAuditHistory.tsx`
- [ ] Integrar en pestaña de paciente
- [ ] Mostrar solo información clínica relevante
- [ ] Implementar filtros básicos (fecha, tipo)

#### Paso 4.2: Componente de Historial para Consulta
- [ ] Crear `src/components/consulta-clinica/AuditHistory.tsx`
- [ ] Integrar en workspace de consulta
- [ ] Mostrar cambios en la consulta actual
- [ ] Verificar permisos antes de mostrar

#### Paso 4.3: Componente de Historial para Citas
- [ ] Crear `src/components/agenda/AuditHistory.tsx`
- [ ] Integrar en detalle de cita
- [ ] Mostrar cambios de estado y reprogramaciones
- [ ] Aplicar filtros según rol

**Entregables:**
- 3 componentes contextuales
- Integración en páginas existentes

---

### FASE 5: Frontend - Página Global ADMIN (Semana 5)

#### Paso 5.1: Actualizar Página `/audit-log`
- [ ] Verificar que solo ADMIN puede acceder
- [ ] Implementar redirección si no es ADMIN
- [ ] Agregar mensaje de acceso denegado para otros roles
- [ ] Mejorar UI con todos los campos visibles

#### Paso 5.2: Mejorar Componentes Existentes
- [ ] Actualizar `AuditLogTable` para mostrar todos los campos
- [ ] Actualizar `AuditLogDetail` con información técnica completa
- [ ] Agregar visualización de IP y user-agent
- [ ] Mejorar visualización de metadata

**Entregables:**
- Página global funcional
- Componentes mejorados

---

### FASE 6: Seguridad y Protección (Semana 6)

#### Paso 6.1: Implementar Inmutabilidad
- [ ] Crear middleware para bloquear UPDATE/DELETE en AuditLog
- [ ] Agregar validación en Prisma schema
- [ ] Crear función de verificación de integridad (hash)
- [ ] Documentar políticas de inmutabilidad

#### Paso 6.2: Implementar Rate Limiting
- [ ] Agregar rate limiting a endpoints de auditoría
- [ ] Configurar límites por rol
- [ ] Implementar logging de intentos excesivos
- [ ] Crear alertas para administradores

#### Paso 6.3: Implementar Archivo de Logs
- [ ] Crear script de archivo mensual
- [ ] Implementar migración a almacenamiento frío
- [ ] Crear endpoint para consultar logs archivados
- [ ] Documentar proceso de archivo

**Entregables:**
- Protección de inmutabilidad
- Rate limiting configurado
- Sistema de archivo funcional

---

### FASE 7: Pruebas y Validación (Semana 7)

#### Paso 7.1: Pruebas de Permisos
- [ ] Probar acceso de ADMIN a página global
- [ ] Verificar bloqueo de ODONT/RECEP a página global
- [ ] Probar acceso contextual de ODONT
- [ ] Probar acceso contextual de RECEP
- [ ] Verificar ofuscación de datos sensibles

#### Paso 7.2: Pruebas de Funcionalidad
- [ ] Probar filtros avanzados
- [ ] Probar exportación CSV
- [ ] Probar visualización de diff
- [ ] Probar paginación con grandes volúmenes
- [ ] Probar búsqueda de texto

#### Paso 7.3: Pruebas de Seguridad
- [ ] Intentar modificar logs (debe fallar)
- [ ] Intentar eliminar logs (debe fallar)
- [ ] Probar acceso no autorizado
- [ ] Probar rate limiting
- [ ] Verificar encriptación de datos

**Entregables:**
- Suite de pruebas completa
- Documentación de casos de prueba
- Reporte de cobertura

---

### FASE 8: Documentación y Monitoreo (Semana 8)

#### Paso 8.1: Documentación de Usuario
- [ ] Crear guía para ADMIN sobre uso de `/audit-log`
- [ ] Crear guía para ODONT sobre historial contextual
- [ ] Crear guía para RECEP sobre historial de citas
- [ ] Crear FAQ de preguntas comunes

#### Paso 8.2: Documentación Técnica
- [ ] Documentar arquitectura completa
- [ ] Documentar APIs y endpoints
- [ ] Documentar políticas de seguridad
- [ ] Crear diagramas de flujo

#### Paso 8.3: Monitoreo y Alertas
- [ ] Configurar alertas para accesos no autorizados
- [ ] Configurar alertas para cambios críticos
- [ ] Crear dashboard de métricas de auditoría
- [ ] Documentar procedimientos de respuesta a incidentes

**Entregables:**
- Documentación completa
- Sistema de monitoreo configurado
- Procedimientos documentados

---

## 7. Anexos

### Anexo A: Matriz de Acceso Completa

| Acción | ADMIN | ODONT | RECEP |
|--------|-------|-------|-------|
| Ver página global | ✅ | ❌ | ❌ |
| Ver historial de paciente | ✅ Completo | ✅ Solo clínico | ❌ |
| Ver historial de consulta propia | ✅ | ✅ | ❌ |
| Ver historial de consulta ajena | ✅ | ❌ | ❌ |
| Ver historial de cita propia | ✅ | ✅ | ❌ |
| Ver historial de cita asignada | ✅ | ❌ | ✅ |
| Ver historial de factura | ✅ | ❌ | ✅ Solo propia |
| Ver cambios de permisos | ✅ | ❌ | ❌ |
| Ver IPs y user-agents | ✅ | ❌ | ❌ |
| Exportar logs | ✅ | ❌ | ❌ |
| Ver metadata técnica | ✅ | ❌ | ❌ |

### Anexo B: Ejemplos de Ofuscación

#### Email
```
Original: juan.gomez@clinica.com
ODONT ve: juan.gomez@***.com
RECEP ve: juan.gomez@***.com
```

#### IP
```
Original: 192.168.1.100
ODONT ve: 192.168.***.***
RECEP ve: 192.168.***.***
```

#### Datos de Otro Usuario
```
Original: { nombre: "María López", email: "maria@..." }
ODONT ve: { nombre: "Usuario #45", email: "***" }
RECEP ve: { nombre: "Usuario #45", email: "***" }
```

### Anexo C: Checklist de Implementación

#### Backend
- [ ] Schema de AuditLog actualizado
- [ ] RBAC implementado
- [ ] Función de escritura mejorada
- [ ] Helpers de filtrado por rol
- [ ] Endpoints globales protegidos
- [ ] Endpoints contextuales creados
- [ ] Rate limiting configurado
- [ ] Inmutabilidad implementada

#### Frontend
- [ ] Página global `/audit-log` protegida
- [ ] Componente de historial de paciente
- [ ] Componente de historial de consulta
- [ ] Componente de historial de citas
- [ ] Filtros avanzados funcionales
- [ ] Exportación CSV implementada
- [ ] Visualización de diff mejorada

#### Seguridad
- [ ] Validación de permisos en todos los endpoints
- [ ] Ofuscación de datos sensibles
- [ ] Rate limiting activo
- [ ] Logs inmutables
- [ ] Encriptación configurada
- [ ] Alertas configuradas

#### Documentación
- [ ] Documentación de usuario completa
- [ ] Documentación técnica completa
- [ ] Guías de uso por rol
- [ ] Procedimientos de respuesta documentados

---

## 8. Consideraciones Finales

### 8.1 Mejores Prácticas Aplicadas

1. **Principio de Menor Privilegio**: Cada rol ve solo lo necesario
2. **Defensa en Profundidad**: Múltiples capas de seguridad
3. **Auditoría Completa**: Registro de todas las acciones críticas
4. **Privacidad por Diseño**: Datos sensibles ofuscados desde el origen
5. **Transparencia Controlada**: Visibilidad apropiada sin exponer información innecesaria

### 8.2 Métricas de Éxito

- ✅ Todos los eventos críticos están registrados
- ✅ Los usuarios solo ven lo que necesitan
- ✅ No hay accesos no autorizados
- ✅ Los logs son inmutables y verificables
- ✅ El sistema cumple con regulaciones aplicables

### 8.3 Mantenimiento Continuo

- Revisar logs periódicamente para detectar anomalías
- Actualizar políticas de retención según necesidades
- Revisar y ajustar permisos según cambios organizacionales
- Mantener documentación actualizada
- Realizar auditorías de seguridad periódicas

---

**Fin del Documento**

Este documento sirve como guía completa para la implementación del sistema de auditoría con control de acceso basado en roles. Cada fase debe ser completada y probada antes de pasar a la siguiente.

