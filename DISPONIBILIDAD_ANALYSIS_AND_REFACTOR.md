# Análisis y Refactorización del Sistema de Disponibilidad

## Fase 1: Análisis del Estado Actual

### Problemas Identificados

#### 1. **Duplicación de Código** ❌
- `availability-validation.ts` tiene funciones completas de parsing y validación
- `_service.ts` tiene su propia implementación duplicada (líneas 15-39, 100-175)
- Misma lógica implementada dos veces con posibles inconsistencias

#### 2. **Validación Incompleta en `_service.ts`** ❌
- `parseProfesionalDisponibilidad` en `_service.ts` NO valida formato `HH:mm`
- `availability-validation.ts` SÍ valida formato `HH:mm` con regex
- Riesgo de aceptar horarios inválidos en `getDisponibilidad`

#### 3. **Falta de Schema Validation** ❌
- No hay schema Zod para validar estructura de `disponibilidad` JSON
- No se valida al crear/actualizar profesionales
- Errores solo se detectan en runtime

#### 4. **Inconsistencias en Manejo de Timezone** ⚠️
- Ambas implementaciones usan `CLINIC_TZ` pero están duplicadas
- Constantes duplicadas (`FALLBACK_START_HOUR`, `FALLBACK_END_HOUR`)

### Archivos Analizados

#### `disponibilidad.ts` (API Client)
- **Rol**: Cliente HTTP para frontend
- **Estado**: ✅ Correcto - solo hace fetch, no valida
- **Interacción con disponibilidad**: Ninguna (delega al backend)

#### `route.ts` (HTTP Handler)
- **Rol**: Endpoint HTTP GET `/api/agenda/disponibilidad`
- **Estado**: ✅ Correcto - valida query params, delega a service
- **Interacción con disponibilidad**: Ninguna directa

#### `_service.ts` (Business Logic)
- **Rol**: Lógica de negocio para calcular slots disponibles
- **Estado**: ❌ PROBLEMA - tiene parsing duplicado y menos robusto
- **Interacción con disponibilidad**: 
  - Parsea `profesional.disponibilidad` (línea 230)
  - Construye ventanas de trabajo (línea 231)
  - Genera slots basados en ventanas (línea 270)

#### `_schemas.ts` (Input Validation)
- **Rol**: Validación de query params HTTP
- **Estado**: ✅ Correcto - valida query params
- **Interacción con disponibilidad**: Ninguna (solo valida `profesionalId` como número)

#### `_dto.ts` (Data Transfer Objects)
- **Rol**: Tipos para respuesta de API
- **Estado**: ✅ Correcto - solo define estructura de respuesta
- **Interacción con disponibilidad**: Ninguna

### Modelo de Disponibilidad Actual

**Estructura JSON**:
```typescript
{
  "dow": {
    "0": [["08:00","12:00"],["13:00","16:00"]],  // Domingo (0-6)
    "1": [["08:00","12:00"],["13:00","16:00"]],  // Lunes
    ...
    "6": [["08:00","12:00"]]                      // Sábado
  }
}
```

**Características**:
- Soporta múltiples ventanas por día (ej: mañana y tarde)
- Formato de día: "0"-"6" (domingo-sábado) o "1"-"7" (lunes-domingo)
- Horarios en formato "HH:mm" (24 horas, hora local)
- Fallback: 08:00-16:00 si no hay disponibilidad configurada

## Fase 2: Diseño del Modelo y Validación

### Modelo Formalizado

```typescript
type DisponibilidadSchema = {
  dow: {
    [dayKey: string]: TimeRange[]; // dayKey: "0"-"6" o "1"-"7"
  };
};

type TimeRange = [start: string, end: string]; // ["HH:mm", "HH:mm"]
```

### Reglas de Validación

1. **Estructura**:
   - Debe ser objeto con propiedad `dow`
   - `dow` debe ser objeto (no array)
   - Cada día debe ser array de rangos

2. **Rangos de Tiempo**:
   - Formato `HH:mm` (regex: `/^\d{2}:\d{2}$/`)
   - `start < end` (horario válido)
   - Horas: 00-23, Minutos: 00-59

3. **Días de la Semana**:
   - Claves válidas: "0"-"6" o "1"-"7"
   - Array puede estar vacío (día sin trabajo)

4. **Fallback**:
   - Si no hay disponibilidad → 08:00-16:00 todos los días
   - Si día no tiene entradas → 08:00-16:00 para ese día

## Fase 3: Refactorización - Centralizar Lógica

### Objetivo
Eliminar duplicación y usar `availability-validation.ts` como única fuente de verdad.

### Cambios Propuestos

1. **Refactorizar `_service.ts`**:
   - Eliminar funciones duplicadas
   - Importar desde `availability-validation.ts`
   - Usar funciones compartidas

2. **Crear Schema de Validación**:
   - Schema Zod para validar disponibilidad JSON
   - Usar en endpoints de creación/actualización de profesionales

3. **Mejorar Documentación**:
   - Documentar modelo formalmente
   - Ejemplos de uso

