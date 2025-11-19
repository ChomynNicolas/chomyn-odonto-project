# Análisis del Problema: Disponibilidad en Modo Reschedule

## 🔍 Problema Identificado

Cuando se intenta reprogramar una cita para un día distinto al originalmente programado, la funcionalidad de verificación de disponibilidad y recomendación de horarios deja de funcionar correctamente.

## 📋 Análisis de Dependencias

### 1. Hook `useDisponibilidadValidator`
- **Ubicación**: `src/hooks/useDisponibilidadValidator.ts`
- **Dependencias del useEffect**: `[validate]`
- **Dependencias de `validate`**: `[fecha, horaInicio, duracionMinutos, profesionalId, consultorioId, enabled, excludeCitaId]`
- **Debounce**: 500ms
- **Problema potencial**: El debounce podría estar interfiriendo con cambios rápidos de fecha

### 2. Componente `NuevaCitaSheet`
- **Ubicación**: `src/components/agenda/NuevaCitaSheet.tsx`
- **Línea 138-146**: Configuración del hook con `excludeCitaId`
- **Línea 186-228**: `useEffect` que resetea el formulario cuando se abre o cambia el modo
- **Línea 499-506**: Handler `onChange` para el campo fecha que limpia conflictos
- **Problema potencial**: El reset del formulario podría estar interfiriendo con la validación

### 3. Backend `getDisponibilidad`
- **Ubicación**: `src/app/api/agenda/disponibilidad/_service.ts`
- **Línea 94**: Manejo de `excludeCitaId` con `whereCita.idCita = { not: query.excludeCitaId }`
- **Estado**: ✅ Funciona correctamente

## 🐛 Causas Raíz Identificadas

### Problema 1: Reset del formulario interfiere con validación
Cuando se cambia la fecha en modo reschedule:
1. El `onChange` del campo fecha limpia conflictos y resetea el ref
2. El hook debería revalidar automáticamente porque `fecha` está en las dependencias
3. PERO: Si el formulario se resetea mientras el hook está validando, podría causar inconsistencias

### Problema 2: El hook no se ejecuta inmediatamente al cambiar fecha
El debounce de 500ms podría estar causando que:
- El usuario cambie la fecha
- El hook espere 500ms antes de validar
- Durante ese tiempo, el estado del formulario podría cambiar
- La validación se ejecuta con valores inconsistentes

### Problema 3: El `excludeCitaId` podría no estar actualizándose correctamente
Aunque se pasa correctamente al hook, cuando cambia la fecha:
- El hook debería revalidar con el mismo `excludeCitaId`
- Pero si hay algún problema con las dependencias, podría no revalidar

## 🔧 Solución Propuesta

### Fase 1: Mejorar el hook `useDisponibilidadValidator`
1. Asegurar que el hook reaccione correctamente a cambios de fecha
2. Mejorar el manejo del debounce para evitar validaciones con valores inconsistentes
3. Agregar logging para debugging (solo en desarrollo)

### Fase 2: Mejorar el componente `NuevaCitaSheet`
1. Asegurar que el reset del formulario no interfiera con la validación
2. Mejorar el manejo del estado cuando cambia la fecha
3. Asegurar que `excludeCitaId` se mantenga constante durante la reprogramación

### Fase 3: Validación y pruebas
1. Probar reprogramación en el mismo día
2. Probar reprogramación en día diferente
3. Verificar que las recomendaciones funcionen correctamente en ambos casos

## 📝 Plan de Implementación

1. **Mejorar el hook**: Agregar validación de dependencias y mejor manejo del debounce
2. **Mejorar el componente**: Asegurar que el estado se maneje correctamente al cambiar fecha
3. **Agregar logging**: Para facilitar el debugging en desarrollo
4. **Probar**: Verificar que todo funcione correctamente en ambos escenarios

