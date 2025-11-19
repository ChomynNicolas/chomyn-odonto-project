# Análisis y Plan de Implementación: Sistema de Auditoría para Agenda

## Fase 1: Análisis del Estado Actual

### 1.1. Infraestructura Existente

**Módulo de Auditoría Base**:
- ✅ `src/lib/audit/log.ts` - Función `writeAudit` y `safeAuditWrite`
- ✅ `src/lib/audit/actions.ts` - Definiciones de acciones y entidades
- ✅ Modelo `AuditLog` en Prisma con campos: `actorId`, `action`, `entity`, `entityId`, `ip`, `metadata`, `createdAt`

**Características del Módulo Actual**:
- Extrae IP y user-agent de headers automáticamente
- Maneja errores con `safeAuditWrite` (no rompe operación principal)
- Soporta metadata personalizada

### 1.2. Estado de Auditoría en Endpoints de Agenda

| Endpoint | Operación | Auditoría | Historial Estado | Estado |
|----------|-----------|-----------|------------------|--------|
| `POST /api/agenda/citas` | Crear cita | ❌ **FALTA** | N/A | **PENDIENTE** |
| `PUT /api/agenda/citas/[id]/reprogramar` | Reprogramar | ✅ Parcial | ✅ Completo | **MEJORAR** |
| `PATCH /api/agenda/citas/[id]/cancelar` | Cancelar | ❌ **FALTA** | ✅ Completo | **IMPLEMENTAR** |
| `PATCH /api/agenda/citas/[id]/estado` | Cambiar estado | ❌ **FALTA** | ✅ Completo | **IMPLEMENTAR** |
| `POST /api/agenda/citas/[id]/transition` | Transición estado | ❌ **FALTA** | ✅ Completo | **IMPLEMENTAR** |

### 1.3. Patrones Actuales

**En `reprogramar/_service.ts`**:
- Usa `tx.auditLog.create` directamente dentro de transacción
- Registra intentos fallidos (OVERLAP) y éxito
- Metadata incluye tiempos de ejecución, IDs, fechas ISO

**Problemas Identificados**:
1. ❌ No hay módulo centralizado para auditoría dentro de transacciones
2. ❌ Acciones de auditoría no están tipadas (magic strings)
3. ❌ Cancelación no tiene auditoría
4. ❌ Creación de citas no tiene auditoría
5. ❌ Cambios de estado no tienen auditoría

## Fase 2: Diseño de Arquitectura Modular

### 2.1. Extensión de Acciones de Auditoría

**Archivo**: `src/lib/audit/actions.ts`

```typescript
export const AuditAction = {
  // ... acciones existentes
  // Agenda / Citas
  CITA_CREATE: "CITA_CREATE",
  CITA_CANCEL: "CITA_CANCEL",
  CITA_REPROGRAMAR: "CITA_REPROGRAMAR",
  CITA_REPROGRAMAR_OVERLAP: "CITA_REPROGRAMAR_OVERLAP", // Ya existe
  CITA_ESTADO_CHANGE: "CITA_ESTADO_CHANGE",
  CITA_TRANSITION: "CITA_TRANSITION",
} as const
```

### 2.2. Módulo de Auditoría para Transacciones

**Archivo**: `src/lib/audit/transaction-audit.ts` (NUEVO)

Funciones helper que aceptan `PrismaClient` o transacción para usar dentro de `$transaction`:

```typescript
export async function auditCitaCancel(opts: {
  tx: PrismaClient,
  actorId: number,
  citaId: number,
  motivoCancelacion: string,
  notas?: string,
  estadoPrevio: EstadoCita,
  metadata?: Record<string, unknown>
}): Promise<void>

export async function auditCitaCreate(opts: {
  tx: PrismaClient,
  actorId: number,
  citaId: number,
  metadata?: Record<string, unknown>
}): Promise<void>

export async function auditCitaEstadoChange(opts: {
  tx: PrismaClient,
  actorId: number,
  citaId: number,
  estadoPrevio: EstadoCita,
  estadoNuevo: EstadoCita,
  nota?: string,
  metadata?: Record<string, unknown>
}): Promise<void>
```

### 2.3. Esquema de Metadata Estándar

**Para Cancelación**:
```typescript
{
  motivoCancelacion: "PACIENTE" | "PROFESIONAL" | "CLINICA" | "EMERGENCIA" | "OTRO",
  notas?: string,
  estadoPrevio: EstadoCita,
  estadoNuevo: "CANCELLED",
  inicioISO: string,
  finISO: string,
  pacienteId: number,
  profesionalId: number,
  consultorioId?: number,
  timestamp: string
}
```

**Para Creación**:
```typescript
{
  tipo: TipoCita,
  inicioISO: string,
  finISO: string,
  duracionMinutos: number,
  pacienteId: number,
  profesionalId: number,
  consultorioId?: number,
  motivo?: string,
  timestamp: string
}
```

**Para Cambio de Estado**:
```typescript
{
  estadoPrevio: EstadoCita,
  estadoNuevo: EstadoCita,
  nota?: string,
  timestamp: string
}
```

## Fase 3: Implementación Concreta

### 3.1. Extender `actions.ts`

Agregar acciones de agenda al archivo existente.

### 3.2. Crear `transaction-audit.ts`

Módulo nuevo con funciones helper tipadas para auditoría dentro de transacciones.

### 3.3. Implementar en Cancelación

Agregar auditoría completa con motivo y notas.

### 3.4. Implementar en Creación

Agregar auditoría cuando se crea una cita exitosamente.

### 3.5. Implementar en Cambio de Estado

Agregar auditoría cuando se cambia estado de cita.

## Fase 4: Plan de Implementación por Fases

### Fase 1: Extender Infraestructura (15 min)
- Extender `actions.ts` con acciones de agenda
- Crear `transaction-audit.ts` con helpers tipados

### Fase 2: Implementar Cancelación (20 min)
- Agregar auditoría completa en `cancelar/_service.ts`
- Incluir motivo, notas, estado previo, metadata completa

### Fase 3: Implementar Creación (15 min)
- Agregar auditoría en `_create.service.ts`
- Registrar cuando cita se crea exitosamente

### Fase 4: Implementar Cambio de Estado (15 min)
- Agregar auditoría en `estado/_service.ts`
- Registrar transiciones de estado

### Fase 5: Refactorizar Reprogramación (10 min)
- Migrar a usar nuevo módulo `transaction-audit.ts`
- Mantener misma funcionalidad pero más consistente

### Fase 6: Validación y Documentación (15 min)
- Verificar que todos los logs se crean correctamente
- Documentar uso del módulo

