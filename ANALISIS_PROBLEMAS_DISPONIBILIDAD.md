# Análisis de Problemas de Disponibilidad

## 🐛 Problemas Identificados

### Problema 1: Verificación de Disponibilidad No Detecta Citas Ocupadas

**Ubicación**: `src/lib/api/agenda/disponibilidad.ts` línea 76-82

**Problema**:
```typescript
const disponible = dispHoy.slots.some((s) => {
  const slotStart = new Date(s.slotStart);
  const slotEnd = new Date(s.slotEnd);
  return slotStart.getTime() === solicitadoStart.getTime() &&
         slotEnd.getTime() === solicitadoEnd.getTime() &&
         !s.motivoBloqueo;
});
```

**Causa**:
- Usa comparación exacta de tiempo (`===`) en lugar de verificar overlap
- Problemas de timezone: `s.slotStart` viene en UTC (ISO string), pero `solicitadoStart` se crea en local
- Si hay una diferencia mínima de milisegundos o timezone, no detecta el slot como ocupado

**Solución**:
- Usar verificación de overlap en lugar de comparación exacta
- Normalizar ambos tiempos a UTC antes de comparar
- Usar la misma lógica de overlap que el backend (`excludeOverlaps`)

### Problema 2: Recomendaciones Incluyen Horarios Ocupados

**Ubicación**: `src/lib/api/agenda/disponibilidad.ts` línea 92-99

**Problema**:
```typescript
const alternativasHoy = dispHoy.slots
  .filter((s) => !s.motivoBloqueo)
  .map((s) => ({
    inicio: s.slotStart,
    fin: s.slotEnd,
    // ...
  }));
```

**Causa**:
- Confía en que `dispHoy.slots` ya está filtrado (sin overlaps)
- Pero puede haber un problema de sincronización o timezone
- No verifica explícitamente que los slots recomendados no tengan overlaps

**Solución**:
- Verificar explícitamente que cada recomendación no tenga overlaps
- Usar la misma lógica de verificación que el backend
- Asegurar que las comparaciones de tiempo sean consistentes

## 🔧 Plan de Solución

### Fase 1: Mejorar Verificación de Disponibilidad
1. Cambiar de comparación exacta a verificación de overlap
2. Normalizar tiempos a UTC antes de comparar
3. Usar función helper para verificar overlap

### Fase 2: Mejorar Generación de Recomendaciones
1. Verificar explícitamente que cada recomendación no tenga overlaps
2. Filtrar recomendaciones que puedan tener conflictos
3. Asegurar consistencia de timezone

### Fase 3: Crear Función Helper de Overlap
1. Extraer lógica de overlap a función reutilizable
2. Usar la misma lógica en frontend y backend
3. Asegurar consistencia

### Fase 4: Validación y Pruebas
1. Probar con citas ocupadas
2. Probar con diferentes timezones
3. Verificar que recomendaciones sean correctas

