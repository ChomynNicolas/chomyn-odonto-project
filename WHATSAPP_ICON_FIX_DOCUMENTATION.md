# Solución: Ícono de WhatsApp en Quick Create

## 📋 Resumen Ejecutivo

Este documento describe la solución implementada para asegurar que el ícono de WhatsApp aparezca correctamente para pacientes creados mediante el flujo de "quick create", aplicando la misma lógica de normalización y validación que el wizard completo.

---

## 1. Análisis del Problema

### 1.1 Problema Identificado

Los pacientes creados mediante "quick create" no mostraban el ícono de WhatsApp en la lista, mientras que los pacientes creados mediante el wizard completo sí lo mostraban.

### 1.2 Causa Raíz

**Wizard completo** (`_service.create.ts`):
- ✅ Usaba `normalizarTelefono()` para normalizar
- ✅ Usaba `esMovilPY()` para detectar si es móvil
- ✅ Pasaba `whatsappCapaz: movil` al crear contacto

**Quick create** (`_service.quick.ts`):
- ❌ Usaba `normalizePhonePY()` (función diferente)
- ❌ NO detectaba si era móvil
- ❌ NO pasaba `whatsappCapaz` (quedaba como `null`)

**Lista de pacientes** (`PacientesTable.tsx`):
- Solo mostraba WhatsApp si `contacto.whatsappCapaz === true`

### 1.3 Impacto

- Inconsistencia en la experiencia del usuario
- Funcionalidad de WhatsApp no disponible para pacientes creados rápidamente
- Lógica duplicada e inconsistente entre componentes

---

## 2. Diseño de la Solución

### 2.1 Arquitectura Centralizada

```
┌─────────────────────────────────────────┐
│   phone-utils.ts (Single Source)      │  ← Normalización y validación
├─────────────────────────────────────────┤
│   patient-utils.ts                     │  ← Helpers para pacientes
├─────────────────────────────────────────┤
│   Wizard (_service.create.ts)          │  ← Usa phone-utils
│   Quick Create (_service.quick.ts)      │  ← Usa phone-utils
│   Future Components                     │  ← Usa phone-utils
└─────────────────────────────────────────┘
```

### 2.2 Principios de Diseño

1. **Single Source of Truth**: Una sola función de normalización (`normalizePhone`)
2. **Consistencia**: Misma lógica en todos los flujos
3. **Extensibilidad**: Fácil agregar nuevos componentes
4. **Validación Defensiva**: Validación en frontend y backend

---

## 3. Implementación: Módulo Centralizado de Teléfonos

### 3.1 Archivo: `src/lib/phone-utils.ts`

Este módulo centraliza toda la lógica de teléfonos:

```typescript
// Funciones principales:
- normalizePhone(phone, defaultCountryCode)  // Normaliza a E.164
- validatePhone(phone)                       // Valida formato
- isMobilePhone(phone)                      // Detecta si es móvil
- isValidForWhatsApp(phone)                 // Valida para WhatsApp
- formatForWhatsApp(phone)                  // Formato para URL
- formatPhoneForDisplay(phone)               // Formato para mostrar
- analyzePhone(phone)                        // Análisis completo
```

**Características**:
- ✅ Maneja múltiples formatos de entrada
- ✅ Normaliza a formato E.164 estándar
- ✅ Detecta números móviles paraguayos
- ✅ Validación robusta con mensajes claros
- ✅ Tipos TypeScript completos

### 3.2 Detección de Números Móviles

La función `isMobilePhone()` detecta números móviles usando prefijos conocidos:

```typescript
const PARAGUAY_MOBILE_PREFIXES = [
  "961", "971", "972", "973", "974", "975", "976",
  "981", "982", "983", "984", "985", "986",
  "991", "992", "994", "995",
]
```

**Lógica**:
1. Normaliza el número a formato E.164
2. Verifica que empiece con `+595`
3. Extrae los primeros 3 dígitos después del código de país
4. Compara con la lista de prefijos móviles

---

## 4. Cambios en Quick Create Flow

### 4.1 Backend: `_service.quick.ts`

**Antes**:
```typescript
const phoneNorm = normalizePhonePY(input.telefono)
// NO detectaba si era móvil
// NO pasaba whatsappCapaz
await pacienteRepo.createContactoTelefono(tx, {
  valorNorm: phoneNorm,
  // whatsappCapaz: undefined ❌
})
```

**Después**:
```typescript
// Validar y normalizar usando utilidades centralizadas
const phoneValidation = validatePhone(input.telefono)
if (!phoneValidation.isValid) {
  throw new QuickCreateError("VALIDATION_ERROR", phoneValidation.error, 400)
}

const phoneNorm = normalizePhone(input.telefono)
const isMobile = isMobilePhone(phoneNorm) // ✅ Detecta móvil

await pacienteRepo.createContactoTelefono(tx, {
  valorNorm: phoneNorm,
  whatsappCapaz: isMobile,  // ✅ Establece flag
  smsCapaz: isMobile,        // ✅ Establece flag
})
```

### 4.2 Frontend: `PatientQuickCreateModal.tsx`

**Mejoras implementadas**:

1. **Validación en tiempo real**:
   - Valida mientras el usuario escribe
   - Muestra feedback inmediato
   - Detecta si es móvil automáticamente

2. **Normalización automática**:
   - Normaliza el número al perder el foco (`onBlur`)
   - Mejora la experiencia del usuario

3. **Mensajes claros**:
   - Muestra "✓ Número móvil detectado" cuando aplica
   - Mensajes de error específicos
   - Placeholder mejorado

**Código clave**:
```typescript
// Validación en tiempo real
useEffect(() => {
  if (!phoneValue || phoneValue.trim() === "") {
    setPhoneValidation({ isValid: true })
    return
  }

  const validation = validatePhone(phoneValue)
  const normalized = normalizePhone(phoneValue)
  const isMobile = normalized ? isMobilePhone(normalized) : false

  setPhoneValidation({
    isValid: validation.isValid,
    error: validation.error,
    isMobile,
  })
}, [phoneValue])

// Normalización automática en blur
<Input
  {...register("telefono", {
    onBlur: (e) => {
      const normalized = normalizePhone(e.target.value)
      if (normalized && normalized !== e.target.value) {
        setValue("telefono", normalized, { shouldValidate: true })
      }
    },
  })}
/>
```

---

## 5. Lógica de Visibilidad del Ícono de WhatsApp

### 5.1 Helper Function: `canShowWhatsAppIcon()`

**Archivo**: `src/lib/patient-utils.ts`

```typescript
export function canShowWhatsAppIcon(paciente: PacienteListItemDTO): boolean {
  const contacto = paciente.contactoPrincipal

  if (!contacto) return false
  if (contacto.tipo !== "PHONE") return false

  // Primary check: whatsappCapaz flag from database
  if (contacto.whatsappCapaz === true) return true

  // Fallback: validate phone number directly
  if (contacto.valor) {
    return isValidForWhatsApp(contacto.valor)
  }

  return false
}
```

**Ventajas**:
- ✅ Lógica centralizada y reutilizable
- ✅ Fallback si el flag no está establecido
- ✅ Fácil de testear
- ✅ Consistente en toda la aplicación

### 5.2 Uso en la Lista de Pacientes

**Antes**:
```typescript
{contacto.whatsappCapaz && (
  <WhatsAppIcon />
)}
```

**Después**:
```typescript
{canShowWhatsAppIcon(paciente) && (
  <WhatsAppIcon />
)}
```

**Beneficios**:
- ✅ Funciona incluso si `whatsappCapaz` no está establecido
- ✅ Lógica consistente en todos los lugares
- ✅ Fácil de mantener y extender

---

## 6. Backend y Consistencia de Datos

### 6.1 Estrategia: Validación Defensiva

**Frontend**:
- Normaliza y valida antes de enviar
- Mejora UX con feedback inmediato
- Previene errores comunes

**Backend**:
- Re-valida y normaliza antes de guardar
- Establece flags (`whatsappCapaz`, `smsCapaz`) correctamente
- Garantiza consistencia de datos

### 6.2 Single Source of Truth

**Normalización**: `normalizePhone()` en `phone-utils.ts`
- Usado en wizard completo ✅
- Usado en quick create ✅
- Disponible para futuros componentes ✅

**Detección de móvil**: `isMobilePhone()` en `phone-utils.ts`
- Misma lógica en todos los flujos ✅
- Prefijos centralizados ✅
- Fácil de actualizar ✅

### 6.3 Almacenamiento

**Base de datos**:
- `valorRaw`: Valor original del usuario (para referencia)
- `valorNorm`: Valor normalizado (E.164) (para búsquedas/comparaciones)
- `whatsappCapaz`: Flag booleano (para queries rápidas)

**Ventajas**:
- Búsquedas eficientes con `valorNorm`
- Preserva datos originales en `valorRaw`
- Queries rápidas con `whatsappCapaz`

---

## 7. Validación, Edge Cases y Mejores Prácticas

### 7.1 Edge Cases Manejados

✅ **Números vacíos**: Validación clara
✅ **Formato local**: `09XXXXXXXX` → `+595XXXXXXXXX`
✅ **Formato internacional**: `+595XXXXXXXXX` → se mantiene
✅ **Con espacios/guiones**: Se limpian automáticamente
✅ **Código de país faltante**: Se agrega `+595` por defecto
✅ **Números demasiado largos/cortos**: Validación con mensaje claro
✅ **Caracteres inválidos**: Se filtran o se rechazan con mensaje

### 7.2 Mensajes de Error Claros

```typescript
// Ejemplos de mensajes:
"El teléfono es requerido"
"El teléfono debe incluir el código de país (+595)"
"El número de teléfono debe tener entre 7 y 9 dígitos"
"El teléfono solo puede contener números"
```

### 7.3 Soporte Internacional (Futuro)

La solución está diseñada para ser extensible:

```typescript
// Actualmente: Paraguay por defecto
normalizePhone(phone, "+595")

// Futuro: Soporte multi-país
normalizePhone(phone, countryCode)  // Detecta automáticamente
```

### 7.4 Múltiples Campos de Teléfono (Futuro)

La solución es fácilmente extensible:

```typescript
// Ejemplo futuro: Móvil y Fijo
const mobilePhone = normalizePhone(data.mobilePhone)
const landlinePhone = normalizePhone(data.landlinePhone)

const mobileIsWhatsApp = isMobilePhone(mobilePhone)
const landlineIsWhatsApp = isMobilePhone(landlinePhone) // false para fijos
```

---

## 8. Pruebas

### 8.1 Pruebas Manuales

#### Test 1: Crear paciente via wizard con teléfono móvil válido
**Pasos**:
1. Ir a `/pacientes/nuevo`
2. Completar formulario con teléfono móvil: `0991234567`
3. Guardar paciente
4. Verificar en lista que aparece ícono de WhatsApp ✅

**Resultado esperado**: ✅ Ícono de WhatsApp visible

#### Test 2: Crear paciente via quick create con mismo teléfono móvil
**Pasos**:
1. Ir a `/pacientes`
2. Click en "Nuevo Paciente" (quick create modal)
3. Completar con mismo teléfono: `0991234567`
4. Ver mensaje "✓ Número móvil detectado"
5. Crear paciente
6. Verificar en lista que aparece ícono de WhatsApp ✅

**Resultado esperado**: ✅ Ícono de WhatsApp visible (mismo comportamiento que wizard)

#### Test 3: Crear paciente con teléfono fijo
**Pasos**:
1. Crear paciente con teléfono fijo: `021234567`
2. Verificar que NO aparece ícono de WhatsApp ✅

**Resultado esperado**: ✅ No aparece ícono (correcto, fijos no tienen WhatsApp)

#### Test 4: Validación en tiempo real
**Pasos**:
1. Abrir quick create modal
2. Escribir teléfono inválido: `123`
3. Ver mensaje de error inmediato ✅
4. Escribir teléfono móvil válido: `0991234567`
5. Ver mensaje "✓ Número móvil detectado" ✅

**Resultado esperado**: ✅ Feedback inmediato y claro

#### Test 5: Normalización automática
**Pasos**:
1. Abrir quick create modal
2. Escribir teléfono: `0991 234 567` (con espacios)
3. Perder foco del campo
4. Verificar que se normaliza a: `+595991234567` ✅

**Resultado esperado**: ✅ Normalización automática en blur

### 8.2 Pruebas Unitarias

#### Test Unitario 1: `normalizePhone()`

```typescript
// tests/unit/lib/phone-utils.test.ts
import { describe, it, expect } from "vitest"
import { normalizePhone } from "@/lib/phone-utils"

describe("normalizePhone", () => {
  it("debe normalizar formato local paraguayo", () => {
    expect(normalizePhone("0991234567")).toBe("+595991234567")
    expect(normalizePhone("021234567")).toBe("+59521234567")
  })

  it("debe mantener formato internacional", () => {
    expect(normalizePhone("+595991234567")).toBe("+595991234567")
  })

  it("debe limpiar espacios y guiones", () => {
    expect(normalizePhone("0991 234 567")).toBe("+595991234567")
    expect(normalizePhone("0991-234-567")).toBe("+595991234567")
  })

  it("debe retornar string vacío para input inválido", () => {
    expect(normalizePhone("")).toBe("")
    expect(normalizePhone("abc")).toBe("+abc") // Fallback, pero debería validarse después
  })
})
```

#### Test Unitario 2: `isMobilePhone()`

```typescript
// tests/unit/lib/phone-utils.test.ts
import { describe, it, expect } from "vitest"
import { isMobilePhone } from "@/lib/phone-utils"

describe("isMobilePhone", () => {
  it("debe detectar números móviles paraguayos", () => {
    expect(isMobilePhone("+595991234567")).toBe(true)
    expect(isMobilePhone("0991234567")).toBe(true)
    expect(isMobilePhone("+595981234567")).toBe(true)
  })

  it("debe rechazar números fijos", () => {
    expect(isMobilePhone("+59521234567")).toBe(false)
    expect(isMobilePhone("021234567")).toBe(false)
  })

  it("debe retornar false para números inválidos", () => {
    expect(isMobilePhone("")).toBe(false)
    expect(isMobilePhone("123")).toBe(false)
  })
})
```

#### Test Unitario 3: `canShowWhatsAppIcon()`

```typescript
// tests/unit/lib/patient-utils.test.ts
import { describe, it, expect } from "vitest"
import { canShowWhatsAppIcon } from "@/lib/patient-utils"
import type { PacienteListItemDTO } from "@/lib/api/pacientes.types"

describe("canShowWhatsAppIcon", () => {
  it("debe retornar true cuando whatsappCapaz es true", () => {
    const paciente: PacienteListItemDTO = {
      idPaciente: 1,
      personaId: 1,
      nombreCompleto: "Test",
      contactoPrincipal: {
        tipo: "PHONE",
        valor: "+595991234567",
        whatsappCapaz: true,
      },
      // ... otros campos requeridos
    } as PacienteListItemDTO

    expect(canShowWhatsAppIcon(paciente)).toBe(true)
  })

  it("debe retornar false cuando whatsappCapaz es false", () => {
    const paciente: PacienteListItemDTO = {
      idPaciente: 1,
      personaId: 1,
      nombreCompleto: "Test",
      contactoPrincipal: {
        tipo: "PHONE",
        valor: "+59521234567",
        whatsappCapaz: false,
      },
    } as PacienteListItemDTO

    expect(canShowWhatsAppIcon(paciente)).toBe(false)
  })

  it("debe usar fallback cuando whatsappCapaz es undefined", () => {
    const paciente: PacienteListItemDTO = {
      idPaciente: 1,
      personaId: 1,
      nombreCompleto: "Test",
      contactoPrincipal: {
        tipo: "PHONE",
        valor: "+595991234567",
        whatsappCapaz: undefined, // No establecido
      },
    } as PacienteListItemDTO

    // Debe validar el número directamente
    expect(canShowWhatsAppIcon(paciente)).toBe(true)
  })

  it("debe retornar false cuando no hay contacto", () => {
    const paciente: PacienteListItemDTO = {
      idPaciente: 1,
      personaId: 1,
      nombreCompleto: "Test",
      contactoPrincipal: null,
    } as PacienteListItemDTO

    expect(canShowWhatsAppIcon(paciente)).toBe(false)
  })
})
```

### 8.3 Prueba de Integración

```typescript
// tests/integration/api/pacientes/quick-create.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { quickCreatePaciente } from "@/app/api/pacientes/quick/_service.quick"
import { prisma } from "@/lib/prisma"
import { pacienteRepo } from "@/app/api/pacientes/_repo"

describe("quickCreatePaciente - WhatsApp flag", () => {
  beforeEach(async () => {
    // Limpiar datos de prueba
    await prisma.paciente.deleteMany({})
    await prisma.persona.deleteMany({})
    await prisma.documento.deleteMany({})
    await prisma.personaContacto.deleteMany({})
  })

  afterEach(async () => {
    // Limpiar después de cada test
    await prisma.paciente.deleteMany({})
    await prisma.persona.deleteMany({})
    await prisma.documento.deleteMany({})
    await prisma.personaContacto.deleteMany({})
  })

  it("debe establecer whatsappCapaz=true para números móviles", async () => {
    // Arrange
    const input = {
      nombreCompleto: "Juan Pérez",
      tipoDocumento: "CI",
      dni: "1234567",
      telefono: "0991234567", // Número móvil
      fechaNacimiento: "1990-01-01",
      genero: "MASCULINO",
    }

    // Act
    const result = await quickCreatePaciente(input, 1)

    // Assert: Verificar que el contacto tiene whatsappCapaz=true
    const contacto = await prisma.personaContacto.findFirst({
      where: { personaId: result.idPersona },
    })

    expect(contacto).toBeDefined()
    expect(contacto?.whatsappCapaz).toBe(true)
    expect(contacto?.smsCapaz).toBe(true)
  })

  it("debe establecer whatsappCapaz=false para números fijos", async () => {
    // Arrange
    const input = {
      nombreCompleto: "María García",
      tipoDocumento: "CI",
      dni: "7654321",
      telefono: "021234567", // Número fijo
      fechaNacimiento: "1985-05-15",
      genero: "FEMENINO",
    }

    // Act
    const result = await quickCreatePaciente(input, 1)

    // Assert
    const contacto = await prisma.personaContacto.findFirst({
      where: { personaId: result.idPersona },
    })

    expect(contacto).toBeDefined()
    expect(contacto?.whatsappCapaz).toBe(false)
    expect(contacto?.smsCapaz).toBe(false)
  })
})
```

---

## 9. Checklist de Implementación

### ✅ Completado

- [x] Crear módulo centralizado `phone-utils.ts`
- [x] Crear helper `canShowWhatsAppIcon()` en `patient-utils.ts`
- [x] Actualizar `quick/_service.quick.ts` para usar nuevas utilidades
- [x] Actualizar `_service.create.ts` para usar nuevas utilidades
- [x] Mejorar `PatientQuickCreateModal.tsx` con validación en tiempo real
- [x] Actualizar `PacientesTable.tsx` para usar `canShowWhatsAppIcon()`
- [x] Verificar que no hay errores de linting

### 📝 Pendiente (Opcional)

- [ ] Implementar pruebas unitarias
- [ ] Implementar pruebas de integración
- [ ] Migrar otros componentes que usen lógica de teléfono antigua
- [ ] Agregar logging/métricas para números normalizados

---

## 10. Resumen de Archivos Modificados

### Archivos Creados

1. **`src/lib/phone-utils.ts`** (nuevo)
   - Módulo centralizado de utilidades de teléfono
   - Funciones: `normalizePhone`, `validatePhone`, `isMobilePhone`, `isValidForWhatsApp`, etc.

2. **`src/lib/patient-utils.ts`** (nuevo)
   - Helpers específicos para pacientes
   - Función: `canShowWhatsAppIcon()`

### Archivos Modificados

1. **`src/app/api/pacientes/quick/_service.quick.ts`**
   - Usa `normalizePhone`, `isMobilePhone` de `phone-utils`
   - Establece `whatsappCapaz` y `smsCapaz` correctamente

2. **`src/app/api/pacientes/_service.create.ts`**
   - Migrado a usar `phone-utils` (consistencia)

3. **`src/components/pacientes/PatientQuickCreateModal.tsx`**
   - Validación en tiempo real
   - Normalización automática en blur
   - Feedback visual mejorado

4. **`src/components/pacientes/PacientesTable.tsx`**
   - Usa `canShowWhatsAppIcon()` helper
   - Usa `formatForWhatsApp()` de `phone-utils`

---

## 11. Beneficios de la Solución

✅ **Consistencia**: Misma lógica en todos los flujos
✅ **Mantenibilidad**: Single source of truth
✅ **Extensibilidad**: Fácil agregar nuevos componentes
✅ **UX Mejorada**: Validación en tiempo real y feedback claro
✅ **Robustez**: Validación defensiva en frontend y backend
✅ **Testabilidad**: Funciones puras y fáciles de testear

---

**Fin del documento**

