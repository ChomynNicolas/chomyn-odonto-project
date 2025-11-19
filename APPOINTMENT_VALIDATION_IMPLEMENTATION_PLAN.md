# Plan de Implementación: Validación de Horarios y Especialidad

## Análisis de Estado Actual

### ✅ Lo que ya funciona:
1. **Validación de horarios de trabajo** - Implementada en backend (`_create.service.ts` líneas 218-229)
2. **Slot recommendations** - Ya respetan disponibilidad del profesional via `apiGetDisponibilidad`
3. **Frontend validation** - `useDisponibilidadValidator` valida antes de submit

### ❌ Lo que falta:
1. **Validación de especialidad** - No existe validación que verifique si el profesional tiene la especialidad requerida para el tipo de cita
2. **Mapeo TipoCita → Especialidad** - No hay definición clara de qué especialidades pueden manejar qué tipos de citas
3. **Mensajes de error mejorados** - Errores de especialidad no están estructurados

## Diseño de Reglas de Validación

### Mapeo TipoCita → Especialidad Requerida

```typescript
CONSULTA → "Odontología General" (siempre disponible)
LIMPIEZA → "Odontología General"
ENDODONCIA → "Endodoncia"
EXTRACCION → "Odontología General" (o especialista si es compleja)
URGENCIA → "Odontología General" (cualquier profesional puede atender)
ORTODONCIA → "Ortodoncia"
CONTROL → "Odontología General"
OTRO → Sin restricción (cualquier especialidad)
```

### Reglas de Validación

1. **Horarios de Trabajo**:
   - La cita debe estar completamente dentro de las ventanas de trabajo del profesional
   - Si no hay disponibilidad configurada, usar fallback 08:00-16:00
   - Validar en backend (source of truth) y frontend (UX)

2. **Especialidad**:
   - Verificar que el profesional tenga al menos una especialidad compatible con el tipo de cita
   - Si el profesional tiene múltiples especialidades, cualquiera compatible es suficiente
   - Errores claros indicando qué especialidad se requiere

## Fases de Implementación

### Fase 1: Módulo de Validación de Especialidad
- Crear `src/lib/utils/specialty-validation.ts`
- Definir mapeo TipoCita → Especialidad
- Función para validar compatibilidad

### Fase 2: Backend - Validación de Especialidad
- Actualizar `_create.service.ts` para validar especialidad
- Actualizar `reprogramar/_service.ts` para validar especialidad
- Agregar códigos de error específicos

### Fase 3: Frontend - Mejoras de UX
- Mostrar especialidades del profesional en selector
- Validar especialidad antes de submit
- Mensajes de error claros

### Fase 4: Refactor y Limpieza
- Extraer lógica compartida
- Mejorar tipos TypeScript
- Documentación

