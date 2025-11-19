# Análisis y Plan de Implementación: Validación de Consultorios

## 1. Análisis del Estado Actual

### 1.1. Resumen del Sistema Actual

El sistema actual de creación y reprogramación de citas tiene las siguientes características:

#### **Creación de Citas (`_create.service.ts`)**

**Validaciones existentes**:
- ✅ Verifica que consultorio existe (línea 220-225)
- ✅ Verifica que consultorio está activo (línea 233)
- ✅ Busca conflictos con consultorio en `findConflicts` (líneas 88-132)
- ✅ Verifica bloqueos de agenda para consultorio en `hasBlocking` (líneas 140-162)

**Flujo actual**:
```
1. Validar FKs (paciente, profesional, consultorio)
2. Verificar estado activo (paciente, profesional, consultorio)
3. Validar horarios de trabajo del profesional
4. Validar compatibilidad de especialidad
5. Verificar bloqueos de agenda (profesional + consultorio)
6. Buscar conflictos (profesional + consultorio)
7. Crear cita
```

#### **Reprogramación de Citas (`reprogramar/_service.ts`)**

**Validaciones existentes**:
- ✅ Busca conflictos con consultorio en `findConflicts` (líneas 132-177)
- ✅ Verifica bloqueos de agenda para consultorio en `hasBlocking` (líneas 182-204)
- ❌ **FALTA**: No valida que el nuevo consultorio esté activo cuando se cambia

**Flujo actual**:
```
1. Obtener cita original
2. Validar estado reprogramable
3. Resolver profesional/consultorio (puede cambiar)
4. Validar horarios de trabajo del profesional
5. Validar compatibilidad de especialidad
6. Buscar conflictos (excluyendo cita original)
7. Verificar bloqueos de agenda
8. Crear nueva cita y cancelar anterior
```

### 1.2. Identificación de Gaps

#### **Gap 1: Validación de Consultorio Activo en Reprogramación**
- **Ubicación**: `reprogramar/_service.ts` línea 282
- **Problema**: Cuando `body.consultorioId` se proporciona y es diferente al original, no se valida que el nuevo consultorio exista y esté activo
- **Impacto**: Puede permitir reprogramar a un consultorio inactivo o inexistente

#### **Gap 2: Mensajes de Error Mejorados**
- **Ubicación**: `_create.service.ts` línea 274, `reprogramar/_service.ts` línea 395
- **Problema**: Error genérico "BLOCKED_SLOT" / "BLOCKED_BY_SCHEDULE" no especifica si es por profesional o consultorio
- **Impacto**: Usuario no sabe qué recurso está bloqueado

#### **Gap 3: Validación Temprana de Consultorio**
- **Ubicación**: Ambos servicios
- **Problema**: La validación de consultorio activo ocurre después de otras validaciones costosas
- **Impacto**: Podría optimizarse validando primero

### 1.3. Modelo de Bloqueos de Agenda

Según el schema Prisma (líneas 414-437):

```prisma
model BloqueoAgenda {
  idBloqueoAgenda Int
  profesionalId   Int?  // Opcional
  consultorioId   Int?  // Opcional
  desde           DateTime
  hasta           DateTime
  tipo            TipoBloqueoAgenda
  motivo          String?
  recurrencia     Json?  // RRule u otro
  activo          Boolean @default(true)
}
```

**Características**:
- Un bloqueo puede ser para profesional, consultorio, o ambos
- Campo `activo` permite desactivar bloqueos sin eliminarlos
- Soporta recurrencia mediante JSON (RRule)
- El campo `tipo` permite categorizar bloqueos

**Lógica actual en `hasBlocking`**:
- Busca bloqueos activos que se solapen con el rango de tiempo solicitado
- Usa `OR` para buscar bloqueos de profesional O consultorio
- Retorna `true` si encuentra cualquier bloqueo

## 2. Lógica de Validación Propuesta (Conceptual)

### 2.1. Funciones Helper Propuestas

```typescript
// Validar que consultorio existe y está activo
async function validateConsultorioIsActive(
  consultorioId: number | null | undefined,
  tx: PrismaClient
): Promise<{ ok: true } | { ok: false; error: string; code: string; status: number }>

// Validar que consultorio no está bloqueado en el rango solicitado
async function validateConsultorioAvailability(
  consultorioId: number | null | undefined,
  inicio: Date,
  fin: Date,
  tx: PrismaClient
): Promise<{ ok: true } | { ok: false; error: string; code: string; status: number; details?: { bloqueoId?: number; motivo?: string } }>

// Validar conflictos específicos de consultorio (separado de profesional)
async function findConsultorioConflicts(
  consultorioId: number,
  inicio: Date,
  fin: Date,
  excludeCitaId?: number,
  tx?: PrismaClient
): Promise<ConflictInfo[]>
```

### 2.2. Flujo de Validación Mejorado

**Para Crear Cita**:
```
1. Validar FKs básicos (paciente, profesional, consultorio)
2. Validar estados activos (paciente, profesional, consultorio) ← Mejorar mensajes
3. Validar horarios de trabajo del profesional
4. Validar compatibilidad de especialidad
5. Validar disponibilidad de consultorio (no bloqueado) ← Nueva función específica
6. Buscar conflictos (profesional + consultorio)
7. Crear cita
```

**Para Reprogramar Cita**:
```
1. Obtener cita original
2. Validar estado reprogramable
3. Resolver profesional/consultorio resultantes
4. Validar que nuevo consultorio existe y está activo ← AGREGAR
5. Validar horarios de trabajo del profesional
6. Validar compatibilidad de especialidad
7. Validar disponibilidad de consultorio (no bloqueado) ← Nueva función específica
8. Buscar conflictos (excluyendo cita original)
9. Crear nueva cita y cancelar anterior
```

## 3. Cambios de Código Concretos

### 3.1. Crear Módulo de Validación de Consultorio

**Archivo**: `src/lib/utils/consultorio-validation.ts` (NUEVO)

```typescript
// ============================================================================
// CONSULTORIO VALIDATION UTILITY
// ============================================================================
// Shared module for validating consultorio availability and status
// Used by both createCita and reprogramarCita services

import { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export interface ConsultorioValidationResult {
  isValid: boolean;
  error?: {
    code: "CONSULTORIO_NOT_FOUND" | "CONSULTORIO_INACTIVO" | "CONSULTORIO_BLOCKED";
    message: string;
    status: number;
    details?: {
      consultorioId?: number;
      bloqueoId?: number;
      motivo?: string;
      desde?: string;
      hasta?: string;
    };
  };
}

/**
 * Valida que un consultorio existe y está activo
 */
export async function validateConsultorioIsActive(
  consultorioId: number | null | undefined,
  prisma: PrismaClient
): Promise<ConsultorioValidationResult> {
  // Si no se especifica consultorio, es válido (opcional)
  if (!consultorioId) {
    return { isValid: true };
  }

  const consultorio = await prisma.consultorio.findUnique({
    where: { idConsultorio: consultorioId },
    select: { idConsultorio: true, activo: true, nombre: true },
  });

  if (!consultorio) {
    return {
      isValid: false,
      error: {
        code: "CONSULTORIO_NOT_FOUND",
        message: `El consultorio con ID ${consultorioId} no existe.`,
        status: 404,
        details: { consultorioId },
      },
    };
  }

  if (!consultorio.activo) {
    return {
      isValid: false,
      error: {
        code: "CONSULTORIO_INACTIVO",
        message: `El consultorio "${consultorio.nombre}" está inactivo y no puede recibir citas.`,
        status: 409,
        details: { consultorioId, consultorioNombre: consultorio.nombre },
      },
    };
  }

  return { isValid: true };
}

/**
 * Valida que un consultorio no está bloqueado en el rango de tiempo solicitado
 */
export async function validateConsultorioAvailability(
  consultorioId: number | null | undefined,
  inicio: Date,
  fin: Date,
  prisma: PrismaClient
): Promise<ConsultorioValidationResult> {
  // Si no se especifica consultorio, no hay nada que validar
  if (!consultorioId) {
    return { isValid: true };
  }

  const bloqueo = await prisma.bloqueoAgenda.findFirst({
    where: {
      consultorioId,
      activo: true,
      desde: { lt: fin },
      hasta: { gt: inicio },
    },
    select: {
      idBloqueoAgenda: true,
      motivo: true,
      desde: true,
      hasta: true,
      tipo: true,
    },
    orderBy: { desde: "asc" },
  });

  if (bloqueo) {
    return {
      isValid: false,
      error: {
        code: "CONSULTORIO_BLOCKED",
        message: `El consultorio está bloqueado en el horario solicitado${bloqueo.motivo ? `: ${bloqueo.motivo}` : ""}.`,
        status: 409,
        details: {
          consultorioId,
          bloqueoId: bloqueo.idBloqueoAgenda,
          motivo: bloqueo.motivo ?? undefined,
          desde: bloqueo.desde.toISOString(),
          hasta: bloqueo.hasta.toISOString(),
          tipo: bloqueo.tipo,
        },
      },
    };
  }

  return { isValid: true };
}

/**
 * Busca conflictos específicos de consultorio (citas que se solapan)
 */
export async function findConsultorioConflicts(
  consultorioId: number,
  inicio: Date,
  fin: Date,
  excludeCitaId?: number,
  prisma?: PrismaClient
): Promise<Array<{
  citaId: number;
  inicioISO: string;
  finISO: string;
  profesional: { id: number; nombre: string };
  consultorio: { id: number; nombre: string };
}>> {
  const client = prisma || new PrismaClient();
  const ACTIVE_STATES = ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"];

  const conflicts = await client.cita.findMany({
    where: {
      consultorioId,
      estado: { in: ACTIVE_STATES },
      inicio: { lt: fin },
      fin: { gt: inicio },
      ...(excludeCitaId ? { idCita: { not: excludeCitaId } } : {}),
    },
    select: {
      idCita: true,
      inicio: true,
      fin: true,
      profesional: {
        select: {
          idProfesional: true,
          persona: { select: { nombres: true, apellidos: true } },
        },
      },
      consultorio: {
        select: {
          idConsultorio: true,
          nombre: true,
        },
      },
    },
  });

  return conflicts.map((c) => ({
    citaId: c.idCita,
    inicioISO: c.inicio.toISOString(),
    finISO: c.fin.toISOString(),
    profesional: {
      id: c.profesional.idProfesional,
      nombre: `${c.profesional.persona.nombres} ${c.profesional.persona.apellidos}`.trim(),
    },
    consultorio: {
      id: c.consultorio!.idConsultorio,
      nombre: c.consultorio!.nombre,
    },
  }));
}
```

### 3.2. Actualizar `_create.service.ts`

**Cambios en `createCita`**:

```typescript
// Agregar imports
import {
  validateConsultorioIsActive,
  validateConsultorioAvailability,
} from "@/lib/utils/consultorio-validation";

// Reemplazar validación de consultorio (líneas 220-233)
// ANTES:
const cons = body.consultorioId
  ? await prisma.consultorio.findUnique({
      where: { idConsultorio: body.consultorioId },
      select: { idConsultorio: true, activo: true },
    })
  : Promise.resolve(null);

if (body.consultorioId && !cons) return { ok: false, error: "CONSULTORIO_NOT_FOUND", status: 404 };
if (cons && cons.activo === false) return { ok: false, error: "CONSULTORIO_INACTIVO", status: 409 };

// DESPUÉS:
const consultorioValidation = await validateConsultorioIsActive(body.consultorioId, prisma);
if (!consultorioValidation.isValid) {
  return {
    ok: false,
    error: consultorioValidation.error!.message,
    code: consultorioValidation.error!.code,
    status: consultorioValidation.error!.status,
    details: consultorioValidation.error!.details,
  };
}

// Reemplazar verificación de bloqueos (líneas 266-275)
// ANTES:
const hasBlock = await hasBlocking({
  profesionalId: body.profesionalId,
  consultorioId: body.consultorioId ?? null,
  inicio,
  fin,
});
if (hasBlock) {
  return { ok: false, error: "BLOCKED_SLOT", code: "BLOCKED_SLOT", status: 409 };
}

// DESPUÉS:
// Validar bloqueos de consultorio específicamente
const consultorioAvailability = await validateConsultorioAvailability(
  body.consultorioId ?? null,
  inicio,
  fin,
  prisma
);
if (!consultorioAvailability.isValid) {
  return {
    ok: false,
    error: consultorioAvailability.error!.message,
    code: consultorioAvailability.error!.code,
    status: consultorioAvailability.error!.status,
    details: consultorioAvailability.error!.details,
  };
}

// Validar bloqueos de profesional (mantener lógica existente)
const hasProfBlock = await hasBlocking({
  profesionalId: body.profesionalId,
  consultorioId: null, // Solo profesional
  inicio,
  fin,
});
if (hasProfBlock) {
  return { 
    ok: false, 
    error: "El profesional tiene un bloqueo de agenda en el horario solicitado.", 
    code: "PROFESIONAL_BLOCKED", 
    status: 409 
  };
}
```

### 3.3. Actualizar `reprogramar/_service.ts`

**Cambios en `reprogramarCita`**:

```typescript
// Agregar imports
import {
  validateConsultorioIsActive,
  validateConsultorioAvailability,
} from "@/lib/utils/consultorio-validation";

// Agregar después de resolver consultorioId (línea 282)
// 2.7) Validar que el nuevo consultorio existe y está activo
const consultorioValidation = await validateConsultorioIsActive(consultorioId, tx as unknown as PrismaClient);
if (!consultorioValidation.isValid) {
  return {
    ok: false as const,
    status: consultorioValidation.error!.status,
    error: consultorioValidation.error!.message,
    code: consultorioValidation.error!.code,
    details: consultorioValidation.error!.details,
  };
}

// Reemplazar verificación de bloqueos (líneas 380-397)
// ANTES:
const hasBlock = await hasBlocking(tx as unknown as PrismaClient, {
  profesionalId,
  consultorioId,
  inicio: nuevoInicio,
  fin: nuevoFin,
});
if (hasBlock) {
  return {
    ok: false as const,
    status: 409,
    error: "BLOCKED_BY_SCHEDULE",
    code: "BLOCKED_BY_SCHEDULE",
  };
}

// DESPUÉS:
// Validar bloqueos de consultorio específicamente
const consultorioAvailability = await validateConsultorioAvailability(
  consultorioId,
  nuevoInicio,
  nuevoFin,
  tx as unknown as PrismaClient
);
if (!consultorioAvailability.isValid) {
  return {
    ok: false as const,
    status: consultorioAvailability.error!.status,
    error: consultorioAvailability.error!.message,
    code: consultorioAvailability.error!.code,
    details: consultorioAvailability.error!.details,
  };
}

// Validar bloqueos de profesional (mantener lógica existente)
const hasProfBlock = await hasBlocking(tx as unknown as PrismaClient, {
  profesionalId,
  consultorioId: null, // Solo profesional
  inicio: nuevoInicio,
  fin: nuevoFin,
});
if (hasProfBlock) {
  return {
    ok: false as const,
    status: 409,
    error: "El profesional tiene un bloqueo de agenda en el horario solicitado.",
    code: "PROFESIONAL_BLOCKED",
  };
}
```

### 3.4. Actualizar Rutas para Manejar Nuevos Códigos de Error

**Archivo**: `src/app/api/agenda/citas/route.ts`

```typescript
// Agregar manejo de nuevos códigos de error en POST handler
if (!result.ok) {
  // ... (manejo existente de OVERLAP, OUTSIDE_WORKING_HOURS, etc.)
  
  // Manejar errores de consultorio
  if (result.status === 409 && (
    result.code === "CONSULTORIO_INACTIVO" || 
    result.code === "CONSULTORIO_BLOCKED" ||
    result.code === "PROFESIONAL_BLOCKED"
  )) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        code: result.code,
        details: result.details,
      },
      { status: 409 }
    );
  }
  
  if (result.status === 404 && result.code === "CONSULTORIO_NOT_FOUND") {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        code: result.code,
        details: result.details,
      },
      { status: 404 }
    );
  }
  
  // ... resto del manejo
}
```

**Archivo**: `src/app/api/agenda/citas/[id]/reprogramar/route.ts`

```typescript
// Agregar manejo similar en PUT handler
if (!("ok" in result) || !result.ok) {
  // ... (manejo existente)
  
  // Manejar errores de consultorio
  if (result.status === 409 && (
    result.code === "CONSULTORIO_INACTIVO" || 
    result.code === "CONSULTORIO_BLOCKED" ||
    result.code === "PROFESIONAL_BLOCKED"
  )) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        code: result.code,
        details: result.details,
      },
      { status: 409 }
    );
  }
  
  // ... resto del manejo
}
```

### 3.5. Actualizar Frontend para Mostrar Errores de Consultorio

**Archivo**: `src/components/agenda/NuevaCitaSheet.tsx`

```typescript
// Agregar manejo de errores de consultorio en onSubmit (después de línea 383)
// Manejar errores de consultorio
if (error?.status === 409 && (
  error?.code === "CONSULTORIO_INACTIVO" || 
  error?.code === "CONSULTORIO_BLOCKED" ||
  error?.code === "PROFESIONAL_BLOCKED"
)) {
  const { toast } = await import("sonner")
  const details = error.details as { consultorioId?: number; motivo?: string } | undefined
  const message = error.message || 
    (error.code === "CONSULTORIO_INACTIVO" 
      ? "El consultorio seleccionado está inactivo." 
      : error.code === "CONSULTORIO_BLOCKED"
        ? `El consultorio está bloqueado${details?.motivo ? `: ${details.motivo}` : ""}.`
        : "El profesional tiene un bloqueo de agenda en el horario solicitado.")
  toast.error("Consultorio no disponible", {
    description: message,
    duration: 6000,
  })
  return // No cerrar el formulario, permitir cambiar consultorio o horario
}
```

## 4. Matriz de Validaciones

| Validación | Crear Cita | Reprogramar Cita | Ubicación | Estado |
|------------|------------|------------------|-----------|--------|
| Consultorio existe | ✅ | ❌ → ✅ | `_create.service.ts:220-230`<br>`reprogramar/_service.ts:282` | **FALTA en reprogramar** |
| Consultorio activo | ✅ | ❌ → ✅ | `_create.service.ts:233`<br>`reprogramar/_service.ts:282` | **FALTA en reprogramar** |
| Consultorio no bloqueado | ✅ (genérico) | ✅ (genérico) | `_create.service.ts:266-275`<br>`reprogramar/_service.ts:380-397` | **Mejorar mensajes** |
| Profesional no bloqueado | ✅ (genérico) | ✅ (genérico) | `hasBlocking()` | **Mejorar mensajes** |
| No hay conflicto con consultorio | ✅ | ✅ | `findConflicts()` | ✅ Completo |
| No hay conflicto con profesional | ✅ | ✅ | `findConflicts()` | ✅ Completo |

## 5. Plan de Pruebas y Verificación

### 5.1. Escenarios de Prueba

#### **Escenario 1: Consultorio Inactivo al Crear**
1. Crear consultorio con `activo: false`
2. Intentar crear cita con ese consultorio
3. **Esperado**: Error 409 `CONSULTORIO_INACTIVO` con mensaje claro
4. **Verificar**: Frontend muestra mensaje apropiado

#### **Escenario 2: Consultorio Inactivo al Reprogramar**
1. Tener cita existente con consultorio activo
2. Desactivar ese consultorio o crear otro inactivo
3. Intentar reprogramar cambiando a consultorio inactivo
4. **Esperado**: Error 409 `CONSULTORIO_INACTIVO`
5. **Verificar**: Frontend muestra mensaje apropiado

#### **Escenario 3: Consultorio Bloqueado al Crear**
1. Crear bloqueo de agenda para consultorio específico (ej: 10:00-12:00)
2. Intentar crear cita en ese consultorio en horario 10:30-11:00
3. **Esperado**: Error 409 `CONSULTORIO_BLOCKED` con detalles del bloqueo
4. **Verificar**: Mensaje incluye motivo del bloqueo si existe

#### **Escenario 4: Consultorio Bloqueado al Reprogramar**
1. Tener cita existente
2. Crear bloqueo de agenda para consultorio en nuevo horario
3. Intentar reprogramar cita a ese horario bloqueado
4. **Esperado**: Error 409 `CONSULTORIO_BLOCKED`
5. **Verificar**: Mensaje claro sobre el bloqueo

#### **Escenario 5: Consultorio No Existe**
1. Intentar crear cita con `consultorioId` inexistente (ej: 99999)
2. **Esperado**: Error 404 `CONSULTORIO_NOT_FOUND`
3. **Verificar**: Frontend maneja error apropiadamente

#### **Escenario 6: Profesional Bloqueado (Separado de Consultorio)**
1. Crear bloqueo solo para profesional (sin consultorio)
2. Intentar crear cita con ese profesional
3. **Esperado**: Error 409 `PROFESIONAL_BLOCKED` (no genérico)
4. **Verificar**: Mensaje específico para profesional bloqueado

### 5.2. Plan de Pruebas Manuales

**Fase 1: Preparación**
- [ ] Crear consultorio activo (ID: 1)
- [ ] Crear consultorio inactivo (ID: 2)
- [ ] Crear profesional activo
- [ ] Crear paciente activo

**Fase 2: Pruebas de Creación**
- [ ] Crear cita con consultorio activo → ✅ Debe funcionar
- [ ] Crear cita con consultorio inactivo → ❌ Error `CONSULTORIO_INACTIVO`
- [ ] Crear cita con consultorio inexistente → ❌ Error `CONSULTORIO_NOT_FOUND`
- [ ] Crear bloqueo de consultorio 10:00-12:00
- [ ] Crear cita en consultorio bloqueado 10:30-11:00 → ❌ Error `CONSULTORIO_BLOCKED`
- [ ] Crear cita en consultorio bloqueado 09:00-10:00 → ✅ Debe funcionar (antes del bloqueo)
- [ ] Crear cita en consultorio bloqueado 12:00-13:00 → ✅ Debe funcionar (después del bloqueo)

**Fase 3: Pruebas de Reprogramación**
- [ ] Reprogramar cita cambiando a consultorio activo → ✅ Debe funcionar
- [ ] Reprogramar cita cambiando a consultorio inactivo → ❌ Error `CONSULTORIO_INACTIVO`
- [ ] Reprogramar cita cambiando a consultorio bloqueado → ❌ Error `CONSULTORIO_BLOCKED`
- [ ] Reprogramar cita manteniendo mismo consultorio → ✅ Debe funcionar

**Fase 4: Pruebas de Mensajes**
- [ ] Verificar que mensajes de error son claros y específicos
- [ ] Verificar que frontend muestra mensajes apropiados
- [ ] Verificar que detalles del bloqueo se muestran cuando están disponibles

## 6. Plan de Implementación Modular (Por Fases)

### **Fase 1: Crear Módulo de Validación** (30 min)
**Objetivo**: Centralizar lógica de validación de consultorio

**Archivos**:
- ✅ Crear `src/lib/utils/consultorio-validation.ts`

**Cambios**:
- Implementar `validateConsultorioIsActive`
- Implementar `validateConsultorioAvailability`
- Implementar `findConsultorioConflicts` (opcional, para uso futuro)

**Verificación**:
- Archivo creado sin errores de lint
- Funciones exportadas correctamente

---

### **Fase 2: Mejorar Validación en Crear Cita** (45 min)
**Objetivo**: Usar nuevo módulo y mejorar mensajes de error

**Archivos**:
- Modificar `src/app/api/agenda/citas/_create.service.ts`
- Modificar `src/app/api/agenda/citas/route.ts`

**Cambios**:
- Reemplazar validación manual de consultorio con `validateConsultorioIsActive`
- Separar validación de bloqueos de consultorio y profesional
- Mejorar mensajes de error

**Verificación**:
- Crear cita con consultorio inactivo → Error claro
- Crear cita con consultorio bloqueado → Error con detalles
- Crear cita válida → Funciona correctamente

---

### **Fase 3: Agregar Validación en Reprogramar Cita** (45 min)
**Objetivo**: Validar consultorio cuando se cambia en reprogramación

**Archivos**:
- Modificar `src/app/api/agenda/citas/[id]/reprogramar/_service.ts`
- Modificar `src/app/api/agenda/citas/[id]/reprogramar/route.ts`

**Cambios**:
- Agregar validación de consultorio activo después de resolver `consultorioId`
- Separar validación de bloqueos de consultorio y profesional
- Mejorar mensajes de error

**Verificación**:
- Reprogramar cambiando a consultorio inactivo → Error claro
- Reprogramar cambiando a consultorio bloqueado → Error con detalles
- Reprogramar válida → Funciona correctamente

---

### **Fase 4: Actualizar Frontend** (30 min)
**Objetivo**: Mostrar errores de consultorio de forma user-friendly

**Archivos**:
- Modificar `src/components/agenda/NuevaCitaSheet.tsx`

**Cambios**:
- Agregar manejo de errores `CONSULTORIO_INACTIVO`, `CONSULTORIO_BLOCKED`, `PROFESIONAL_BLOCKED`
- Mostrar mensajes claros con detalles cuando estén disponibles

**Verificación**:
- Error de consultorio inactivo → Toast con mensaje claro
- Error de consultorio bloqueado → Toast con motivo si existe
- Error de profesional bloqueado → Toast específico

---

### **Fase 5: Pruebas y Ajustes** (30 min)
**Objetivo**: Verificar que todo funciona correctamente

**Tareas**:
- Ejecutar plan de pruebas manuales completo
- Verificar que no se rompió funcionalidad existente
- Ajustar mensajes si es necesario

**Verificación**:
- Todos los escenarios de prueba pasan
- No hay regresiones
- Mensajes son claros y útiles

---

## 7. Resumen de Cambios

### Archivos Nuevos
1. `src/lib/utils/consultorio-validation.ts` - Módulo de validación centralizado

### Archivos Modificados
1. `src/app/api/agenda/citas/_create.service.ts` - Usar nuevo módulo, mejorar mensajes
2. `src/app/api/agenda/citas/route.ts` - Manejar nuevos códigos de error
3. `src/app/api/agenda/citas/[id]/reprogramar/_service.ts` - Agregar validación faltante
4. `src/app/api/agenda/citas/[id]/reprogramar/route.ts` - Manejar nuevos códigos de error
5. `src/components/agenda/NuevaCitaSheet.tsx` - Mostrar errores de consultorio

### Validaciones Implementadas
- ✅ Consultorio existe (crear y reprogramar)
- ✅ Consultorio activo (crear y reprogramar)
- ✅ Consultorio no bloqueado (con mensajes específicos)
- ✅ Profesional no bloqueado (con mensajes específicos)
- ✅ Conflictos de consultorio (ya existía, mejorado)

### Mejoras de UX
- Mensajes de error específicos por tipo de problema
- Detalles de bloqueos incluidos en respuestas
- Frontend muestra mensajes claros y accionables

