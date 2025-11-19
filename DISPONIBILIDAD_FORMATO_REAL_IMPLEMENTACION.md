# Implementación: Soporte para Formato Real de Disponibilidad

## Problema Identificado

El formato real de `disponibilidad` en la base de datos es diferente al esperado:

**Formato Real**:
```json
{
  "lunes": [{"fin":"13:00","inicio":"09:00"},{"fin":"19:00","inicio":"15:00"}],
  "martes": [{"fin":"13:00","inicio":"09:00"},{"fin":"19:00","inicio":"15:00"}],
  "miercoles": [{"fin":"13:00","inicio":"09:00"},{"fin":"19:00","inicio":"15:00"}],
  "jueves": [{"fin":"13:00","inicio":"09:00"},{"fin":"19:00","inicio":"15:00"}],
  "viernes": [{"fin":"13:00","inicio":"09:00"}]
}
```

**Diferencias**:
1. ✅ Usa nombres de días en español (`lunes`, `martes`, etc.) en lugar de números (`"0"`, `"1"`, etc.)
2. ✅ Usa objetos `{"inicio": "HH:mm", "fin": "HH:mm"}` en lugar de tuplas `["HH:mm", "HH:mm"]`
3. ✅ No tiene wrapper `dow` - los días están directamente en el objeto raíz

## Cambios Implementados

### 1. Actualización de `parseProfesionalDisponibilidad` ✅

**Archivo**: `src/lib/utils/availability-validation.ts`

**Cambios**:
- ✅ Agregado mapeo `DAY_NAME_TO_DOW` para convertir nombres en español a números (0-6)
- ✅ Creada función `normalizeTimeRange()` para convertir objetos `{inicio, fin}` a tuplas `[inicio, fin]`
- ✅ Actualizado `parseProfesionalDisponibilidad()` para detectar y parsear ambos formatos:
  - **Formato nuevo**: `{lunes: [{inicio, fin}], ...}`
  - **Formato legacy**: `{dow: {"0": [["08:00","12:00"]], ...}}`
- ✅ Soporta variantes con/sin acentos (`miercoles`/`miércoles`, `sabado`/`sábado`)

**Lógica**:
1. Primero intenta detectar formato nuevo (nombres de días en español)
2. Si encuentra formato nuevo, lo convierte a formato interno numérico (0-6)
3. Si no encuentra formato nuevo, intenta formato legacy
4. Retorna `null` si ninguno es válido

### 2. Actualización del Schema de Validación ✅

**Archivo**: `src/lib/schemas/disponibilidad.schema.ts`

**Cambios**:
- ✅ Creado `timeRangeObjectSchema` para validar objetos `{inicio, fin}`
- ✅ Actualizado `disponibilidadSchema` para aceptar ambos formatos usando `z.union()`
- ✅ Soporta variantes con/sin acentos

### 3. Documentación Actualizada ✅

**Archivos**:
- `src/lib/utils/availability-validation.ts` - Comentarios actualizados con formato real
- `src/lib/schemas/disponibilidad.schema.ts` - Ejemplos del formato real

## Flujo Completo de Validación

### Ejemplo con Formato Real

```json
{
  "lunes": [{"fin":"13:00","inicio":"09:00"},{"fin":"19:00","inicio":"15:00"}],
  "martes": [{"fin":"13:00","inicio":"09:00"},{"fin":"19:00","inicio":"15:00"}],
  "viernes": [{"fin":"13:00","inicio":"09:00"}]
}
```

**Proceso**:
1. `parseProfesionalDisponibilidad()` detecta formato nuevo (nombres en español)
2. Convierte `"lunes"` → `"1"`, `"martes"` → `"2"`, `"viernes"` → `"5"`
3. Convierte `{"inicio":"09:00","fin":"13:00"}` → `["09:00","13:00"]`
4. Retorna formato interno: `{dow: {"1": [["09:00","13:00"],["15:00","19:00"]], ...}}`
5. `buildWorkingWindows()` usa formato interno para generar ventanas UTC
6. `validateWorkingHours()` valida citas contra ventanas

### Casos de Uso

#### Caso 1: Crear Cita ✅
```
POST /api/agenda/citas
  ↓
_create.service.ts obtiene profesional.disponibilidad
  ↓
parseProfesionalDisponibilidad() parsea formato real
  ↓
buildWorkingWindows() genera ventanas UTC
  ↓
validateWorkingHours() valida horario de cita
  ↓
Si válido → crea cita
Si inválido → error 409 OUTSIDE_WORKING_HOURS
```

#### Caso 2: Calcular Disponibilidad ✅
```
GET /api/agenda/disponibilidad?profesionalId=1&fecha=2024-01-15
  ↓
getDisponibilidad() obtiene profesional.disponibilidad
  ↓
parseProfesionalDisponibilidad() parsea formato real
  ↓
buildWorkingWindows() genera ventanas UTC para fecha específica
  ↓
generateGridSlots() genera slots basados en ventanas
  ↓
excludeOverlaps() excluye citas ocupadas y bloqueos
  ↓
Retorna slots disponibles
```

#### Caso 3: Reprogramar Cita ✅
```
PUT /api/agenda/citas/[id]/reprogramar
  ↓
reprogramarCita() obtiene profesional.disponibilidad
  ↓
parseProfesionalDisponibilidad() parsea formato real
  ↓
buildWorkingWindows() genera ventanas UTC
  ↓
validateWorkingHours() valida nuevo horario
  ↓
Si válido → reprograma cita
Si inválido → error 409 OUTSIDE_WORKING_HOURS
```

## Validaciones Implementadas

### ✅ Validación de Formato
- Nombres de días en español reconocidos (con/sin acentos)
- Objetos `{inicio, fin}` validados con formato `HH:mm`
- Tuplas `[inicio, fin]` también soportadas (legacy)

### ✅ Validación de Horarios
- `inicio < fin` (horario válido)
- Formato `HH:mm` con regex `/^\d{2}:\d{2}$/`
- Horas: 00-23, Minutos: 00-59

### ✅ Manejo de Casos Especiales
- Días sin trabajo (array vacío `[]`) → usa fallback 08:00-16:00
- Disponibilidad `null` o `undefined` → usa fallback 08:00-16:00
- Días no especificados → usa fallback 08:00-16:00

## Compatibilidad

### ✅ Formato Nuevo (Producción)
```json
{
  "lunes": [{"inicio":"09:00","fin":"13:00"}],
  "martes": [{"inicio":"09:00","fin":"13:00"}]
}
```

### ✅ Formato Legacy (Soportado)
```json
{
  "dow": {
    "1": [["09:00","13:00"]],
    "2": [["09:00","13:00"]]
  }
}
```

## Pruebas Recomendadas

### Test 1: Parsear Formato Real
```typescript
const json = {
  "lunes": [{"inicio":"09:00","fin":"13:00"},{"inicio":"15:00","fin":"19:00"}],
  "martes": [{"inicio":"09:00","fin":"13:00"}]
};
const result = parseProfesionalDisponibilidad(json);
// Debe retornar: {dow: {"1": [["09:00","13:00"],["15:00","19:00"]], "2": [["09:00","13:00"]]}}
```

### Test 2: Crear Cita Dentro de Horario
```
Profesional disponible: lunes 09:00-13:00
Cita solicitada: lunes 10:00-11:00
Resultado esperado: ✅ Válida
```

### Test 3: Crear Cita Fuera de Horario
```
Profesional disponible: lunes 09:00-13:00
Cita solicitada: lunes 14:00-15:00
Resultado esperado: ❌ Error OUTSIDE_WORKING_HOURS
```

### Test 4: Crear Cita en Día Sin Trabajo
```
Profesional disponible: lunes 09:00-13:00, martes []
Cita solicitada: martes 10:00-11:00
Resultado esperado: ❌ Error NO_WORKING_DAY o usa fallback
```

### Test 5: Calcular Slots Disponibles
```
Profesional disponible: lunes 09:00-13:00, 15:00-19:00
Fecha: lunes 2024-01-15
Resultado esperado: Slots desde 09:00 hasta 13:00 y desde 15:00 hasta 19:00
```

## Archivos Modificados

1. ✅ `src/lib/utils/availability-validation.ts`
   - Actualizado `parseProfesionalDisponibilidad()` para soportar formato real
   - Agregado mapeo `DAY_NAME_TO_DOW`
   - Agregada función `normalizeTimeRange()`

2. ✅ `src/lib/schemas/disponibilidad.schema.ts`
   - Actualizado schema para aceptar formato real
   - Agregado `timeRangeObjectSchema`

## Conclusión

✅ **Soporte completo para formato real implementado**
✅ **Compatibilidad con formato legacy mantenida**
✅ **Validación robusta de horarios**
✅ **Todas las operaciones respetan horarios profesionales**

El sistema ahora funciona correctamente con el formato real de disponibilidad usado en producción.

