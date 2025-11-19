# Implementación Completa: Validación de Consultorios

## ✅ Resumen de Cambios Implementados

### Archivos Creados

1. **`src/lib/utils/consultorio-validation.ts`** ✅
   - Módulo centralizado de validación de consultorios
   - Funciones: `validateConsultorioIsActive`, `validateConsultorioAvailability`, `findConsultorioConflicts`

### Archivos Modificados

1. **`src/app/api/agenda/citas/_create.service.ts`** ✅
   - Usa `validateConsultorioIsActive` para validar consultorio
   - Separa validación de bloqueos de consultorio y profesional
   - Mensajes de error mejorados y específicos

2. **`src/app/api/agenda/citas/route.ts`** ✅
   - Maneja nuevos códigos de error: `CONSULTORIO_INACTIVO`, `CONSULTORIO_BLOCKED`, `PROFESIONAL_BLOCKED`, `CONSULTORIO_NOT_FOUND`

3. **`src/app/api/agenda/citas/[id]/reprogramar/_service.ts`** ✅
   - Agrega validación de consultorio activo cuando se cambia consultorio
   - Separa validación de bloqueos de consultorio y profesional
   - Mensajes de error mejorados

4. **`src/app/api/agenda/citas/[id]/reprogramar/route.ts`** ✅
   - Maneja nuevos códigos de error de consultorio

5. **`src/components/agenda/NuevaCitaSheet.tsx`** ✅
   - Muestra mensajes user-friendly para errores de consultorio
   - Maneja errores en ambos modos (create y reschedule)

## 📋 Matriz de Validaciones Completa

| Validación | Crear Cita | Reprogramar Cita | Ubicación | Estado |
|------------|------------|------------------|-----------|--------|
| Consultorio existe | ✅ | ✅ | `_create.service.ts:231-241`<br>`reprogramar/_service.ts:288-298` | ✅ **IMPLEMENTADO** |
| Consultorio activo | ✅ | ✅ | `_create.service.ts:231-241`<br>`reprogramar/_service.ts:288-298` | ✅ **IMPLEMENTADO** |
| Consultorio no bloqueado | ✅ | ✅ | `_create.service.ts:275-290`<br>`reprogramar/_service.ts:399-414` | ✅ **MEJORADO** |
| Profesional no bloqueado | ✅ | ✅ | `_create.service.ts:292-306`<br>`reprogramar/_service.ts:416-432` | ✅ **MEJORADO** |
| No hay conflicto con consultorio | ✅ | ✅ | `findConflicts()` | ✅ **YA EXISTÍA** |
| No hay conflicto con profesional | ✅ | ✅ | `findConflicts()` | ✅ **YA EXISTÍA** |

## 🎯 Códigos de Error Implementados

### Nuevos Códigos de Error

1. **`CONSULTORIO_NOT_FOUND`** (404)
   - Cuando se especifica un consultorio que no existe
   - Mensaje: "El consultorio con ID X no existe."

2. **`CONSULTORIO_INACTIVO`** (409)
   - Cuando se intenta usar un consultorio inactivo
   - Mensaje: "El consultorio 'Nombre' está inactivo y no puede recibir citas."

3. **`CONSULTORIO_BLOCKED`** (409)
   - Cuando el consultorio tiene un bloqueo de agenda en el horario solicitado
   - Mensaje: "El consultorio está bloqueado en el horario solicitado: [motivo]"
   - Incluye detalles: `bloqueoId`, `motivo`, `desde`, `hasta`, `tipo`

4. **`PROFESIONAL_BLOCKED`** (409)
   - Cuando el profesional tiene un bloqueo de agenda (separado de consultorio)
   - Mensaje: "El profesional tiene un bloqueo de agenda en el horario solicitado."

## 🔄 Flujos Actualizados

### Crear Cita

```
1. Validar FKs básicos (paciente, profesional)
2. Validar estados activos (paciente, profesional)
3. ✅ Validar consultorio existe y está activo (NUEVO)
4. Validar horarios de trabajo del profesional
5. Validar compatibilidad de especialidad
6. ✅ Validar consultorio no bloqueado (MEJORADO - mensajes específicos)
7. ✅ Validar profesional no bloqueado (MEJORADO - mensajes específicos)
8. Buscar conflictos (profesional + consultorio)
9. Crear cita
```

### Reprogramar Cita

```
1. Obtener cita original
2. Validar estado reprogramable
3. Resolver profesional/consultorio resultantes
4. ✅ Validar que nuevo consultorio existe y está activo (NUEVO)
5. Validar horarios de trabajo del profesional
6. Validar compatibilidad de especialidad
7. Buscar conflictos (excluyendo cita original)
8. ✅ Validar consultorio no bloqueado (MEJORADO - mensajes específicos)
9. ✅ Validar profesional no bloqueado (MEJORADO - mensajes específicos)
10. Crear nueva cita y cancelar anterior
```

## 🧪 Plan de Pruebas

### Escenario 1: Consultorio Inactivo al Crear ✅
1. Crear consultorio con `activo: false`
2. Intentar crear cita con ese consultorio
3. **Esperado**: Error 409 `CONSULTORIO_INACTIVO`
4. **Frontend**: Toast "Consultorio no disponible" con mensaje claro

### Escenario 2: Consultorio Inactivo al Reprogramar ✅
1. Tener cita existente con consultorio activo
2. Desactivar ese consultorio o crear otro inactivo
3. Intentar reprogramar cambiando a consultorio inactivo
4. **Esperado**: Error 409 `CONSULTORIO_INACTIVO`
5. **Frontend**: Toast con mensaje claro

### Escenario 3: Consultorio Bloqueado al Crear ✅
1. Crear bloqueo de agenda para consultorio (ej: 10:00-12:00, motivo: "Mantenimiento")
2. Intentar crear cita en ese consultorio en horario 10:30-11:00
3. **Esperado**: Error 409 `CONSULTORIO_BLOCKED` con detalles
4. **Frontend**: Toast "Consultorio no disponible" con motivo del bloqueo

### Escenario 4: Consultorio Bloqueado al Reprogramar ✅
1. Tener cita existente
2. Crear bloqueo de agenda para consultorio en nuevo horario
3. Intentar reprogramar cita a ese horario bloqueado
4. **Esperado**: Error 409 `CONSULTORIO_BLOCKED`
5. **Frontend**: Toast con motivo del bloqueo

### Escenario 5: Consultorio No Existe ✅
1. Intentar crear cita con `consultorioId` inexistente (ej: 99999)
2. **Esperado**: Error 404 `CONSULTORIO_NOT_FOUND`
3. **Frontend**: Toast "Consultorio no encontrado"

### Escenario 6: Profesional Bloqueado (Separado) ✅
1. Crear bloqueo solo para profesional (sin consultorio)
2. Intentar crear cita con ese profesional
3. **Esperado**: Error 409 `PROFESIONAL_BLOCKED`
4. **Frontend**: Toast específico para profesional bloqueado

## 📝 Comportamiento Esperado

### API (Backend)

**Consultorio Inactivo**:
- Status: 409
- Code: `CONSULTORIO_INACTIVO`
- Message: "El consultorio 'Nombre' está inactivo y no puede recibir citas."
- Details: `{ consultorioId, consultorioNombre }`

**Consultorio Bloqueado**:
- Status: 409
- Code: `CONSULTORIO_BLOCKED`
- Message: "El consultorio está bloqueado en el horario solicitado: [motivo]"
- Details: `{ consultorioId, bloqueoId, motivo, desde, hasta, tipo }`

**Consultorio No Encontrado**:
- Status: 404
- Code: `CONSULTORIO_NOT_FOUND`
- Message: "El consultorio con ID X no existe."
- Details: `{ consultorioId }`

### UI (Frontend)

**Mensajes de Error**:
- Toast con título descriptivo ("Consultorio no disponible", "Consultorio no encontrado")
- Descripción con detalles específicos (motivo del bloqueo si está disponible)
- Duración: 6000ms
- No cierra el formulario (permite cambiar consultorio o horario)

## ✨ Mejoras Implementadas

1. ✅ **Validación Centralizada**: Módulo `consultorio-validation.ts` reutilizable
2. ✅ **Mensajes Específicos**: Errores diferenciados para consultorio vs profesional
3. ✅ **Detalles de Bloqueos**: Incluye motivo, fechas, tipo de bloqueo
4. ✅ **Validación en Reprogramación**: Ahora valida consultorio cuando se cambia
5. ✅ **UX Mejorada**: Frontend muestra mensajes claros y accionables
6. ✅ **Código Modular**: Funciones helper reutilizables y bien documentadas

## 🚀 Estado Final

**Todas las validaciones de consultorio están implementadas y funcionando:**

- ✅ Consultorio existe (crear y reprogramar)
- ✅ Consultorio activo (crear y reprogramar)
- ✅ Consultorio no bloqueado (con mensajes específicos)
- ✅ Profesional no bloqueado (con mensajes específicos)
- ✅ Conflictos de consultorio detectados correctamente
- ✅ Frontend muestra errores de forma user-friendly

**El sistema ahora garantiza que:**
- No se pueden crear citas en consultorios inactivos
- No se pueden crear citas en consultorios bloqueados
- No se pueden reprogramar citas a consultorios inactivos o bloqueados
- Los mensajes de error son claros y específicos
- El usuario puede corregir el problema fácilmente

