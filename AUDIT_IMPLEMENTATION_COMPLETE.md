# Implementación Completa: Sistema de Auditoría para Agenda

## ✅ Resumen de Implementación

### Archivos Creados

1. **`src/lib/audit/transaction-audit.ts`** ✅
   - Módulo centralizado para auditoría dentro de transacciones Prisma
   - Funciones tipadas y reutilizables para todas las operaciones de citas

### Archivos Modificados

1. **`src/lib/audit/actions.ts`** ✅
   - Agregadas acciones: `CITA_CREATE`, `CITA_CANCEL`, `CITA_REPROGRAMAR`, `CITA_REPROGRAMAR_OVERLAP`, `CITA_ESTADO_CHANGE`, `CITA_TRANSITION`
   - Agregada entidad: `Cita`

2. **`src/app/api/agenda/citas/[id]/cancelar/_service.ts`** ✅
   - Implementada auditoría completa con motivo y notas

3. **`src/app/api/agenda/citas/_create.service.ts`** ✅
   - Implementada auditoría al crear cita exitosamente

4. **`src/app/api/agenda/citas/[id]/estado/_service.ts`** ✅
   - Implementada auditoría al cambiar estado de cita

5. **`src/app/api/agenda/citas/[id]/reprogramar/_service.ts`** ✅
   - Refactorizado para usar nuevo módulo `transaction-audit.ts`
   - Mantiene misma funcionalidad pero más consistente

## 📋 Matriz de Auditoría Completa

| Endpoint | Operación | Auditoría | Estado |
|----------|-----------|-----------|--------|
| `POST /api/agenda/citas` | Crear cita | ✅ **IMPLEMENTADO** | Completo |
| `PUT /api/agenda/citas/[id]/reprogramar` | Reprogramar | ✅ **MEJORADO** | Completo |
| `PATCH /api/agenda/citas/[id]/cancelar` | Cancelar | ✅ **IMPLEMENTADO** | Completo |
| `PATCH /api/agenda/citas/[id]/estado` | Cambiar estado | ✅ **IMPLEMENTADO** | Completo |

## 🎯 Funciones de Auditoría Implementadas

### `auditCitaCancel`
**Ubicación**: `src/lib/audit/transaction-audit.ts`

**Metadata Incluida**:
- `motivoCancelacion`: Motivo de cancelación (PACIENTE, PROFESIONAL, CLINICA, etc.)
- `notas`: Notas adicionales del usuario
- `estadoPrevio`: Estado antes de cancelar
- `estadoNuevo`: "CANCELLED"
- `inicioISO`, `finISO`: Horarios de la cita
- `pacienteId`, `profesionalId`, `consultorioId`: IDs relacionados
- `timestamp`: Timestamp ISO

**Uso**: `cancelar/_service.ts` línea 126-138

### `auditCitaCreate`
**Ubicación**: `src/lib/audit/transaction-audit.ts`

**Metadata Incluida**:
- `tipo`: Tipo de cita (CONSULTA, LIMPIEZA, etc.)
- `inicioISO`, `finISO`: Horarios de la cita
- `duracionMinutos`: Duración en minutos
- `pacienteId`, `profesionalId`, `consultorioId`: IDs relacionados
- `motivo`, `notas`: Motivo y notas de la cita
- `estado`: "SCHEDULED"
- `timestamp`: Timestamp ISO

**Uso**: `_create.service.ts` línea 360-373

### `auditCitaEstadoChange`
**Ubicación**: `src/lib/audit/transaction-audit.ts`

**Metadata Incluida**:
- `estadoPrevio`: Estado anterior
- `estadoNuevo`: Estado nuevo
- `nota`: Nota opcional del cambio
- `timestamp`: Timestamp ISO

**Uso**: `estado/_service.ts` línea 156-163

### `auditCitaReprogramar`
**Ubicación**: `src/lib/audit/transaction-audit.ts`

**Metadata Incluida**:
- `citaOriginalId`: ID de la cita original cancelada
- `anteriorInicioISO`, `anteriorFinISO`: Horarios anteriores
- `nuevoInicioISO`, `nuevoFinISO`: Horarios nuevos
- `profesionalId`, `consultorioId`: IDs relacionados
- `timestamp`: Timestamp ISO
- Metadata adicional: tiempos de ejecución (queryTimeMs, overlapCheckTimeMs, etc.)

**Uso**: `reprogramar/_service.ts` línea 510-528

### `auditCitaReprogramarOverlap`
**Ubicación**: `src/lib/audit/transaction-audit.ts`

**Metadata Incluida**:
- `intentoInicioISO`, `intentoFinISO`: Horarios intentados
- `profesionalId`, `consultorioId`: IDs relacionados
- `conflictos`: Array de conflictos detectados
- `timestamp`: Timestamp ISO
- Metadata adicional: tiempos de ejecución

**Uso**: `reprogramar/_service.ts` línea 364-381

## 📝 Ejemplos de Registros de Auditoría

### Ejemplo 1: Cancelación de Cita

```json
{
  "idAuditLog": 123,
  "actorId": 5,
  "action": "CITA_CANCEL",
  "entity": "Cita",
  "entityId": 42,
  "ip": "192.168.1.100",
  "metadata": {
    "motivoCancelacion": "PACIENTE",
    "notas": "Paciente enfermo, solicita reagendar",
    "estadoPrevio": "CONFIRMED",
    "estadoNuevo": "CANCELLED",
    "inicioISO": "2024-01-15T10:00:00.000Z",
    "finISO": "2024-01-15T10:30:00.000Z",
    "pacienteId": 10,
    "profesionalId": 3,
    "consultorioId": 1,
    "timestamp": "2024-01-14T15:30:00.000Z"
  },
  "createdAt": "2024-01-14T15:30:00.000Z"
}
```

### Ejemplo 2: Creación de Cita

```json
{
  "idAuditLog": 124,
  "actorId": 2,
  "action": "CITA_CREATE",
  "entity": "Cita",
  "entityId": 43,
  "ip": "192.168.1.101",
  "metadata": {
    "tipo": "CONSULTA",
    "inicioISO": "2024-01-20T09:00:00.000Z",
    "finISO": "2024-01-20T09:30:00.000Z",
    "duracionMinutos": 30,
    "pacienteId": 15,
    "profesionalId": 3,
    "consultorioId": 2,
    "motivo": "Dolor de muela",
    "notas": null,
    "estado": "SCHEDULED",
    "timestamp": "2024-01-14T16:00:00.000Z"
  },
  "createdAt": "2024-01-14T16:00:00.000Z"
}
```

### Ejemplo 3: Cambio de Estado

```json
{
  "idAuditLog": 125,
  "actorId": 3,
  "action": "CITA_ESTADO_CHANGE",
  "entity": "Cita",
  "entityId": 43,
  "ip": "192.168.1.102",
  "metadata": {
    "estadoPrevio": "SCHEDULED",
    "estadoNuevo": "CONFIRMED",
    "nota": "Paciente confirmó asistencia",
    "timestamp": "2024-01-15T08:00:00.000Z"
  },
  "createdAt": "2024-01-15T08:00:00.000Z"
}
```

### Ejemplo 4: Reprogramación Exitosa

```json
{
  "idAuditLog": 126,
  "actorId": 2,
  "action": "CITA_REPROGRAMAR",
  "entity": "Cita",
  "entityId": 44,
  "ip": "192.168.1.101",
  "metadata": {
    "citaOriginalId": 42,
    "anteriorInicioISO": "2024-01-15T10:00:00.000Z",
    "anteriorFinISO": "2024-01-15T10:30:00.000Z",
    "nuevoInicioISO": "2024-01-16T14:00:00.000Z",
    "nuevoFinISO": "2024-01-16T14:30:00.000Z",
    "profesionalId": 3,
    "consultorioId": 1,
    "queryTimeMs": "12.34",
    "overlapCheckTimeMs": "5.67",
    "blockingCheckTimeMs": "3.21",
    "createTimeMs": "45.67",
    "totalTimeMs": "66.89",
    "timestamp": "2024-01-15T12:00:00.000Z"
  },
  "createdAt": "2024-01-15T12:00:00.000Z"
}
```

### Ejemplo 5: Reprogramación Fallida (Overlap)

```json
{
  "idAuditLog": 127,
  "actorId": 2,
  "action": "CITA_REPROGRAMAR_OVERLAP",
  "entity": "Cita",
  "entityId": 42,
  "ip": "192.168.1.101",
  "metadata": {
    "intentoInicioISO": "2024-01-16T14:00:00.000Z",
    "intentoFinISO": "2024-01-16T14:30:00.000Z",
    "profesionalId": 3,
    "consultorioId": 1,
    "conflictos": [
      {
        "citaId": 45,
        "inicioISO": "2024-01-16T14:00:00.000Z",
        "finISO": "2024-01-16T14:30:00.000Z"
      }
    ],
    "queryTimeMs": "10.12",
    "overlapCheckTimeMs": "4.56",
    "timestamp": "2024-01-15T12:05:00.000Z"
  },
  "createdAt": "2024-01-15T12:05:00.000Z"
}
```

## 🏗️ Arquitectura Modular

### Módulo Centralizado

**`src/lib/audit/transaction-audit.ts`**:
- Funciones helper tipadas para auditoría dentro de transacciones
- Acepta `PrismaClient` (puede ser transacción)
- Manejo seguro de errores (no rompe transacción principal)
- Metadata consistente y completa

### Ventajas del Diseño

1. ✅ **Tipado Fuerte**: TypeScript garantiza tipos correctos
2. ✅ **Reutilizable**: Funciones helper para todas las operaciones
3. ✅ **Consistente**: Misma estructura de metadata en todos los logs
4. ✅ **Seguro**: Errores de auditoría no rompen operación principal
5. ✅ **Atómico**: Auditoría dentro de transacción garantiza consistencia

## 📚 Documentación de Uso

### Cómo Usar en Nuevos Endpoints

```typescript
import { auditCitaCancel } from "@/lib/audit/transaction-audit";

// Dentro de una transacción Prisma
await prisma.$transaction(async (tx) => {
  // ... operación principal ...
  
  // Auditoría
  await auditCitaCancel({
    tx, // Pasar el cliente de transacción
    actorId: userId,
    citaId: cita.idCita,
    motivoCancelacion: "PACIENTE",
    notas: "Notas adicionales",
    estadoPrevio: cita.estado,
    inicioISO: cita.inicio.toISOString(),
    finISO: cita.fin.toISOString(),
    pacienteId: cita.pacienteId,
    profesionalId: cita.profesionalId,
    consultorioId: cita.consultorioId,
  });
  
  // ... resto de la operación ...
});
```

### Agregar Nueva Acción de Auditoría

1. **Agregar acción en `actions.ts`**:
```typescript
export const AuditAction = {
  // ...
  CITA_NUEVA_ACCION: "CITA_NUEVA_ACCION",
} as const
```

2. **Crear función helper en `transaction-audit.ts`**:
```typescript
export async function auditCitaNuevaAccion(opts: {
  tx: PrismaClient;
  actorId: number;
  citaId: number;
  // ... otros parámetros ...
}): Promise<void> {
  await safeTransactionAudit(opts.tx, {
    actorId: opts.actorId,
    action: AuditAction.CITA_NUEVA_ACCION,
    entity: AuditEntity.Cita,
    entityId: opts.citaId,
    metadata: {
      // ... metadata específica ...
      timestamp: new Date().toISOString(),
    },
  });
}
```

3. **Usar en el servicio**:
```typescript
import { auditCitaNuevaAccion } from "@/lib/audit/transaction-audit";

await auditCitaNuevaAccion({
  tx,
  actorId: userId,
  citaId: cita.idCita,
  // ... otros parámetros ...
});
```

## ✅ Validación y Verificación

### Checklist de Implementación

- [x] Módulo `transaction-audit.ts` creado
- [x] Acciones de auditoría agregadas a `actions.ts`
- [x] Auditoría implementada en cancelación
- [x] Auditoría implementada en creación
- [x] Auditoría implementada en cambio de estado
- [x] Reprogramación refactorizada para usar nuevo módulo
- [x] Sin errores de linting
- [x] Tipos correctos en todas las funciones

### Pruebas Recomendadas

1. **Cancelar cita**:
   - Verificar que se crea registro en `AuditLog`
   - Verificar que metadata incluye motivo y notas
   - Verificar que estado previo es correcto

2. **Crear cita**:
   - Verificar que se crea registro en `AuditLog`
   - Verificar que metadata incluye todos los campos de la cita

3. **Cambiar estado**:
   - Verificar que se crea registro en `AuditLog`
   - Verificar que estados previo y nuevo son correctos

4. **Reprogramar cita**:
   - Verificar que se crea registro en `AuditLog` con IDs de ambas citas
   - Verificar que se registran intentos fallidos por overlap

## 🎯 Resultado Final

**Sistema de auditoría completo y profesional implementado:**

- ✅ Todas las operaciones críticas tienen auditoría
- ✅ Metadata completa y consistente
- ✅ Código modular y reutilizable
- ✅ Tipado fuerte con TypeScript
- ✅ Manejo seguro de errores
- ✅ Fácil de extender para nuevas operaciones

El sistema ahora tiene un trail de auditoría completo para todas las operaciones de citas, cumpliendo con estándares profesionales de trazabilidad y cumplimiento.

