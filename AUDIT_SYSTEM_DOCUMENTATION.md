# Documentación: Sistema de Auditoría para Agenda

## 📖 Índice

1. [Visión General](#visión-general)
2. [Arquitectura](#arquitectura)
3. [Uso del Sistema](#uso-del-sistema)
4. [Ejemplos de Registros](#ejemplos-de-registros)
5. [Extensión del Sistema](#extensión-del-sistema)

## 🎯 Visión General

El sistema de auditoría proporciona un registro completo y trazable de todas las operaciones críticas relacionadas con citas (appointments) en el sistema. Cada operación importante genera un registro en la tabla `AuditLog` con metadata completa que permite:

- **Trazabilidad**: Saber quién hizo qué y cuándo
- **Cumplimiento**: Cumplir con requisitos de auditoría médica
- **Debugging**: Investigar problemas o comportamientos inesperados
- **Análisis**: Entender patrones de uso del sistema

## 🏗️ Arquitectura

### Componentes Principales

1. **`src/lib/audit/actions.ts`**
   - Define acciones y entidades como constantes tipadas
   - Evita magic strings y garantiza consistencia

2. **`src/lib/audit/transaction-audit.ts`**
   - Funciones helper para escribir auditoría dentro de transacciones Prisma
   - Manejo seguro de errores (no rompe operación principal)
   - Metadata consistente y completa

3. **`src/lib/audit/log.ts`**
   - Función base `writeAudit` para operaciones fuera de transacciones
   - Extracción automática de IP y user-agent de headers

### Modelo de Datos

**Tabla `AuditLog`**:
```prisma
model AuditLog {
  idAuditLog Int      @id @default(autoincrement())
  actorId    Int      // ID del usuario que realizó la acción
  action     String   // Acción realizada (ej: "CITA_CANCEL")
  entity     String   // Entidad afectada (ej: "Cita")
  entityId   Int      // ID de la entidad afectada
  ip         String?  // IP del cliente
  metadata   Json?    // Metadata adicional (estructurada)
  createdAt  DateTime @default(now())
  
  actor Usuario @relation(fields: [actorId], references: [idUsuario])
}
```

## 📚 Uso del Sistema

### Operaciones Auditadas Actualmente

| Operación | Función Helper | Acción | Metadata Principal |
|-----------|----------------|--------|-------------------|
| Crear cita | `auditCitaCreate` | `CITA_CREATE` | Tipo, horarios, IDs relacionados |
| Cancelar cita | `auditCitaCancel` | `CITA_CANCEL` | Motivo, notas, estado previo |
| Cambiar estado | `auditCitaEstadoChange` | `CITA_ESTADO_CHANGE` | Estados previo/nuevo, nota |
| Reprogramar | `auditCitaReprogramar` | `CITA_REPROGRAMAR` | IDs de citas, horarios anterior/nuevo |
| Reprogramar (fallido) | `auditCitaReprogramarOverlap` | `CITA_REPROGRAMAR_OVERLAP` | Intentos, conflictos detectados |

### Ejemplo de Uso Básico

```typescript
import { auditCitaCancel } from "@/lib/audit/transaction-audit";

// Dentro de una transacción Prisma
await prisma.$transaction(async (tx) => {
  // 1. Operación principal
  const cita = await tx.cita.update({
    where: { idCita },
    data: { estado: "CANCELLED", /* ... */ },
  });
  
  // 2. Auditoría (dentro de la misma transacción)
  await auditCitaCancel({
    tx, // IMPORTANTE: pasar el cliente de transacción
    actorId: userId,
    citaId: cita.idCita,
    motivoCancelacion: "PACIENTE",
    notas: "Paciente enfermo",
    estadoPrevio: "CONFIRMED",
    inicioISO: cita.inicio.toISOString(),
    finISO: cita.fin.toISOString(),
    pacienteId: cita.pacienteId,
    profesionalId: cita.profesionalId,
    consultorioId: cita.consultorioId,
  });
  
  return cita;
});
```

### Manejo de Errores

Las funciones de auditoría **nunca lanzan excepciones** que puedan romper la operación principal. Si la auditoría falla, se registra en consola pero la operación continúa:

```typescript
// Dentro de safeTransactionAudit
try {
  await tx.auditLog.create({ /* ... */ });
} catch (e) {
  // Log error pero no lanzar excepción
  console.error("[transaction-audit] Failed to write audit log:", e.message);
}
```

## 📋 Ejemplos de Registros de Auditoría

### 1. Cancelación de Cita

**Endpoint**: `PATCH /api/agenda/citas/[id]/cancelar`

**Registro Generado**:
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
    "notas": "Paciente enfermo, solicita reagendar para la próxima semana",
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

**Campos Clave**:
- `motivoCancelacion`: Razón estructurada de la cancelación
- `notas`: Comentarios adicionales del usuario
- `estadoPrevio`: Estado antes de cancelar (útil para análisis)
- IDs relacionados: Permiten trazabilidad completa

### 2. Creación de Cita

**Endpoint**: `POST /api/agenda/citas`

**Registro Generado**:
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

**Campos Clave**:
- `tipo`: Tipo de cita creada
- Horarios completos en ISO
- Todos los IDs relacionados para trazabilidad

### 3. Cambio de Estado

**Endpoint**: `PATCH /api/agenda/citas/[id]/estado`

**Registro Generado**:
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
    "nota": "Paciente confirmó asistencia por teléfono",
    "timestamp": "2024-01-15T08:00:00.000Z"
  },
  "createdAt": "2024-01-15T08:00:00.000Z"
}
```

**Campos Clave**:
- `estadoPrevio` / `estadoNuevo`: Transición completa de estado
- `nota`: Contexto adicional del cambio

### 4. Reprogramación Exitosa

**Endpoint**: `PUT /api/agenda/citas/[id]/reprogramar`

**Registro Generado**:
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

**Campos Clave**:
- `citaOriginalId`: Link a la cita original cancelada
- Horarios anterior/nuevo: Permite ver el cambio completo
- Tiempos de ejecución: Útiles para optimización

### 5. Reprogramación Fallida (Overlap)

**Endpoint**: `PUT /api/agenda/citas/[id]/reprogramar` (con conflictos)

**Registro Generado**:
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
      },
      {
        "citaId": 46,
        "inicioISO": "2024-01-16T14:15:00.000Z",
        "finISO": "2024-01-16T14:45:00.000Z"
      }
    ],
    "queryTimeMs": "10.12",
    "overlapCheckTimeMs": "4.56",
    "timestamp": "2024-01-15T12:05:00.000Z"
  },
  "createdAt": "2024-01-15T12:05:00.000Z"
}
```

**Campos Clave**:
- `conflictos`: Array de citas que causaron el conflicto
- Útil para análisis de conflictos y optimización de UI

## 🔧 Extensión del Sistema

### Agregar Nueva Acción de Auditoría

**Paso 1**: Agregar acción en `src/lib/audit/actions.ts`

```typescript
export const AuditAction = {
  // ... acciones existentes
  CITA_NUEVA_OPERACION: "CITA_NUEVA_OPERACION",
} as const
```

**Paso 2**: Crear función helper en `src/lib/audit/transaction-audit.ts`

```typescript
export async function auditCitaNuevaOperacion(opts: {
  tx: PrismaClient;
  actorId: number;
  citaId: number;
  campoEspecifico: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await safeTransactionAudit(opts.tx, {
    actorId: opts.actorId,
    action: AuditAction.CITA_NUEVA_OPERACION,
    entity: AuditEntity.Cita,
    entityId: opts.citaId,
    metadata: {
      campoEspecifico: opts.campoEspecifico,
      timestamp: new Date().toISOString(),
      ...(opts.metadata ?? {}),
    },
  });
}
```

**Paso 3**: Usar en el servicio

```typescript
import { auditCitaNuevaOperacion } from "@/lib/audit/transaction-audit";

await prisma.$transaction(async (tx) => {
  // ... operación principal ...
  
  await auditCitaNuevaOperacion({
    tx,
    actorId: userId,
    citaId: cita.idCita,
    campoEspecifico: "valor",
  });
});
```

### Mejores Prácticas

1. **Siempre dentro de transacción**: Usar funciones de `transaction-audit.ts` dentro de `$transaction`
2. **Metadata completa**: Incluir todos los campos relevantes para trazabilidad
3. **No PHI**: No incluir información médica sensible (PHI) en metadata
4. **Timestamps ISO**: Usar formato ISO para todas las fechas
5. **IDs relacionados**: Incluir IDs de entidades relacionadas (paciente, profesional, consultorio)

## ✅ Checklist de Implementación

- [x] Módulo `transaction-audit.ts` creado con funciones helper
- [x] Acciones de auditoría definidas en `actions.ts`
- [x] Auditoría implementada en cancelación con motivo y notas
- [x] Auditoría implementada en creación
- [x] Auditoría implementada en cambio de estado
- [x] Reprogramación refactorizada para usar nuevo módulo
- [x] Manejo seguro de errores (no rompe operación principal)
- [x] Tipado fuerte con TypeScript
- [x] Documentación completa

## 🎯 Resultado Final

El sistema ahora tiene un **trail de auditoría completo y profesional** para todas las operaciones críticas de citas:

- ✅ **Trazabilidad completa**: Quién, qué, cuándo, por qué
- ✅ **Metadata rica**: Información contextual completa
- ✅ **Código modular**: Fácil de mantener y extender
- ✅ **Tipado fuerte**: TypeScript garantiza corrección
- ✅ **Manejo seguro**: Errores no rompen operaciones principales
- ✅ **Listo para producción**: Cumple estándares profesionales

