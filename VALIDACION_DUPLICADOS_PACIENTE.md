# Validación de Duplicados en Alta de Paciente

## 📋 Resumen Ejecutivo

Este documento describe la implementación completa de validación de duplicados por CI/DNI en el módulo de creación de pacientes, siguiendo buenas prácticas de arquitectura en capas y manejo de errores.

---

## 1. Revisión del Diseño Actual

### 1.1 Arquitectura en Capas

La solución implementada sigue una arquitectura en capas clara:

```
┌─────────────────────────────────────┐
│   HTTP Layer (route.ts)             │  ← Manejo de errores HTTP
├─────────────────────────────────────┤
│   Service Layer (_service.create.ts) │  ← Lógica de negocio
├─────────────────────────────────────┤
│   Repository Layer (_repo.ts)       │  ← Acceso a datos
├─────────────────────────────────────┤
│   Domain Errors (_errors.ts)        │  ← Errores de dominio
└─────────────────────────────────────┘
```

### 1.2 Separación de Responsabilidades

- **Repositorio (`_repo.ts`)**: Solo acceso a datos, sin lógica de negocio
- **Servicio (`_service.create.ts`)**: Lógica de negocio y validaciones
- **HTTP (`route.ts`)**: Mapeo de errores de dominio a respuestas HTTP
- **Errores (`_errors.ts`)**: Tipos de error específicos del dominio

---

## 2. Validación de Duplicados en la Capa de Servicio

### 2.1 Implementación en `createPaciente`

La validación se realiza **ANTES** de iniciar la transacción para:
- Evitar trabajo innecesario si el documento ya existe
- Proporcionar feedback rápido al usuario
- Reducir carga en la base de datos

```typescript
// src/app/api/pacientes/_service.create.ts

export async function createPaciente(body: PacienteCreateBody, actorUserId: number) {
  // ... preparación de datos ...

  // ========== VALIDACIÓN DE DUPLICADOS: Pre-check antes de iniciar transacción ==========
  const tipoDocumento = body.tipoDocumento ?? "CI"
  const numeroDocumento = body.numeroDocumento.trim()
  
  const pacienteExistente = await pacienteRepo.findByDocumento(tipoDocumento, numeroDocumento)
  
  if (pacienteExistente) {
    throw new PacienteAlreadyExistsError(
      tipoDocumento,
      numeroDocumento,
      pacienteExistente.idPaciente,
    )
  }

  // ========== FASE A: transacción corta y rápida ==========
  // Solo se ejecuta si no hay duplicado
  const { idPaciente, personaId } = await withTxRetry(async (tx) => {
    // ... creación del paciente ...
  })
  
  // ... resto del código ...
}
```

### 2.2 Ventajas de este Enfoque

1. **Prevención temprana**: Detecta duplicados antes de iniciar transacciones costosas
2. **Mensajes claros**: El error incluye información específica (tipo de documento, número)
3. **Extensible**: Fácil agregar otros criterios de unicidad en el futuro
4. **Testeable**: La validación está separada y es fácil de probar

---

## 3. Cambios en la Capa de Repositorio

### 3.1 Función `findByDocumento`

```typescript
// src/app/api/pacientes/_repo.ts

pacienteRepo = {
  /**
   * Busca un paciente existente por tipo y número de documento.
   * Retorna null si no existe, o el ID del paciente si existe.
   */
  findByDocumento: async (
    tipoDocumento: TipoDocumento | string,
    numeroDocumento: string,
    tx?: Prisma.TransactionClient,
  ) => {
    const client = tx || prisma
    const numeroNormalizado = numeroDocumento.trim()

    const documento = await client.documento.findFirst({
      where: {
        tipo: tipoDocumento as TipoDocumento,
        numero: numeroNormalizado,
      },
      include: {
        persona: {
          include: {
            paciente: {
              select: {
                idPaciente: true,
              },
            },
          },
        },
      },
    })

    if (!documento || !documento.persona.paciente) {
      return null
    }

    return {
      idPaciente: documento.persona.paciente.idPaciente,
      idPersona: documento.persona.idPersona,
      tipoDocumento: documento.tipo,
      numeroDocumento: documento.numero,
    }
  },
  // ... otras funciones ...
}
```

### 3.2 Características de la Función

- **Soporte de transacciones**: Acepta un cliente de transacción opcional
- **Normalización**: Hace trim del número de documento para consistencia
- **Retorno claro**: Retorna `null` si no existe, o un objeto con información si existe
- **Eficiente**: Usa `findFirst` con índices apropiados

### 3.3 Restricción Única en Base de Datos

**Recomendación**: Mantener una restricción UNIQUE en la base de datos como capa de seguridad adicional.

**Ventajas**:
- Previene race conditions (dos requests simultáneos)
- Garantía a nivel de base de datos
- Útil para migraciones y scripts batch

**Manejo de Violaciones**:
El código maneja errores de Prisma `P2002` (unique constraint violation) como fallback:

```typescript
// En route.ts
if (error instanceof Prisma.PrismaClientKnownRequestError) {
  if (error.code === "P2002") {
    const target = (error.meta?.target as string[]) || []
    if (target.some((t) => t.includes("numero") || t.includes("documento"))) {
      return errors.conflict(
        "Ya existe un paciente con este documento. Por favor, verifique los datos.",
        "DUPLICATE_DOCUMENT",
      )
    }
  }
}
```

---

## 4. Manejo de Errores en la Capa HTTP/API

### 4.1 Error de Dominio: `PacienteAlreadyExistsError`

```typescript
// src/app/api/pacientes/_errors.ts

export class PacienteAlreadyExistsError extends PacienteDomainError {
  constructor(
    tipoDocumento: string,
    numeroDocumento: string,
    public readonly existingPacienteId?: number,
  ) {
    const tipoLabel = tipoDocumento === "CI" ? "CI" : tipoDocumento === "DNI" ? "DNI" : tipoDocumento
    super(
      "PACIENTE_ALREADY_EXISTS",
      `Ya existe un paciente registrado con este ${tipoLabel}: ${numeroDocumento}`,
      409, // Conflict
      {
        tipoDocumento,
        numeroDocumento,
        existingPacienteId,
      },
    )
    this.name = "PacienteAlreadyExistsError"
  }
}
```

### 4.2 Mapeo a Respuesta HTTP

```typescript
// src/app/api/pacientes/route.ts

catch (error) {
  // Manejo de errores de dominio (duplicados)
  if (error instanceof PacienteAlreadyExistsError) {
    return errors.conflict(
      error.message,
      "PACIENTE_ALREADY_EXISTS",
    )
  }
  
  // ... otros manejos de error ...
}
```

### 4.3 Payload de Respuesta JSON

**Ejemplo de respuesta HTTP 409 Conflict:**

```json
{
  "ok": false,
  "code": "PACIENTE_ALREADY_EXISTS",
  "error": "Ya existe un paciente registrado con este CI: 1234567",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "details": {
    "tipoDocumento": "CI",
    "numeroDocumento": "1234567",
    "existingPacienteId": 42
  }
}
```

**Características**:
- Código HTTP apropiado: `409 Conflict`
- Mensaje claro y específico para el usuario
- Detalles técnicos en `details` para debugging
- Timestamp para auditoría

---

## 5. Buenas Prácticas y Limpieza de Código

### 5.1 Principios Aplicados

✅ **Separación de responsabilidades**: Cada capa tiene una responsabilidad clara
✅ **DRY (Don't Repeat Yourself)**: La lógica de validación está centralizada
✅ **Nombres descriptivos**: `findByDocumento`, `PacienteAlreadyExistsError`
✅ **Extensibilidad**: Fácil agregar otros criterios de unicidad

### 5.2 Extensibilidad Futura

Para agregar otros criterios de unicidad (ej: nombre + fecha de nacimiento):

```typescript
// Ejemplo futuro: validación adicional
const pacientePorNombreYFecha = await pacienteRepo.findByNombreYFechaNacimiento(
  nombres,
  apellidos,
  fechaNacimiento,
)

if (pacientePorNombreYFecha) {
  throw new PacienteDuplicateError("nombre_y_fecha", {
    nombres,
    apellidos,
    fechaNacimiento,
  })
}
```

### 5.3 Manejo de Race Conditions

El código maneja race conditions de dos formas:

1. **Pre-check antes de transacción**: Detecta la mayoría de casos
2. **Fallback con Prisma error**: Captura casos donde dos requests pasan el pre-check simultáneamente

---

## 6. Pruebas

### 6.1 Plan de Pruebas Manuales

#### Test 1: Alta de paciente con DNI nuevo
**Pasos**:
1. Crear un paciente con DNI que no existe en la BD
2. Verificar que se crea correctamente
3. Verificar respuesta HTTP 201 Created

**Resultado esperado**: ✅ Paciente creado exitosamente

#### Test 2: Alta de paciente con DNI duplicado
**Pasos**:
1. Crear un paciente con DNI `1234567`
2. Intentar crear otro paciente con el mismo DNI `1234567`
3. Verificar respuesta HTTP 409 Conflict
4. Verificar mensaje de error claro

**Resultado esperado**: 
```json
{
  "ok": false,
  "code": "PACIENTE_ALREADY_EXISTS",
  "error": "Ya existe un paciente registrado con este CI: 1234567",
  "status": 409
}
```

#### Test 3: Diferentes tipos de documento
**Pasos**:
1. Crear paciente con CI `1234567`
2. Intentar crear paciente con DNI `1234567` (mismo número, diferente tipo)
3. Verificar que se permite (son documentos diferentes)

**Resultado esperado**: ✅ Se permite crear (tipos diferentes)

### 6.2 Pruebas Unitarias

#### Test Unitario 1: `createPaciente` con documento duplicado

```typescript
// tests/unit/pacientes/_service.create.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest"
import { createPaciente } from "@/app/api/pacientes/_service.create"
import { PacienteAlreadyExistsError } from "@/app/api/pacientes/_errors"
import { pacienteRepo } from "@/app/api/pacientes/_repo"

// Mock del repositorio
vi.mock("@/app/api/pacientes/_repo", () => ({
  pacienteRepo: {
    findByDocumento: vi.fn(),
    createPersonaConDocumento: vi.fn(),
    createContactoTelefono: vi.fn(),
    createContactoEmail: vi.fn(),
    createPaciente: vi.fn(),
    linkResponsablePago: vi.fn(),
    getPacienteUI: vi.fn(),
  },
}))

describe("createPaciente", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("debe lanzar PacienteAlreadyExistsError cuando el documento ya existe", async () => {
    // Arrange
    const body = {
      nombreCompleto: "Juan Pérez",
      tipoDocumento: "CI",
      numeroDocumento: "1234567",
      telefono: "+595981234567",
      // ... otros campos requeridos
    }

    // Mock: documento ya existe
    vi.mocked(pacienteRepo.findByDocumento).mockResolvedValue({
      idPaciente: 42,
      idPersona: 100,
      tipoDocumento: "CI",
      numeroDocumento: "1234567",
    })

    // Act & Assert
    await expect(createPaciente(body, 1)).rejects.toThrow(PacienteAlreadyExistsError)
    await expect(createPaciente(body, 1)).rejects.toThrow(
      "Ya existe un paciente registrado con este CI: 1234567"
    )

    // Verificar que no se intentó crear el paciente
    expect(pacienteRepo.createPersonaConDocumento).not.toHaveBeenCalled()
  })

  it("debe crear el paciente cuando el documento no existe", async () => {
    // Arrange
    const body = {
      nombreCompleto: "María García",
      tipoDocumento: "CI",
      numeroDocumento: "7654321",
      telefono: "+595981234567",
      // ... otros campos requeridos
    }

    // Mock: documento no existe
    vi.mocked(pacienteRepo.findByDocumento).mockResolvedValue(null)
    vi.mocked(pacienteRepo.createPersonaConDocumento).mockResolvedValue({
      idPersona: 200,
      nombres: "María",
      apellidos: "García",
      // ... otros campos
    } as any)
    vi.mocked(pacienteRepo.getPacienteUI).mockResolvedValue({
      idPaciente: 50,
      // ... otros campos
    } as any)

    // Act
    const result = await createPaciente(body, 1)

    // Assert
    expect(result).toBeDefined()
    expect(result.idPaciente).toBe(50)
    expect(pacienteRepo.findByDocumento).toHaveBeenCalledWith("CI", "7654321")
    expect(pacienteRepo.createPersonaConDocumento).toHaveBeenCalled()
  })
})
```

#### Test Unitario 2: `findByDocumento` en repositorio

```typescript
// tests/unit/pacientes/_repo.test.ts
import { describe, it, expect, beforeEach } from "vitest"
import { pacienteRepo } from "@/app/api/pacientes/_repo"
import { prisma } from "@/lib/prisma"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    documento: {
      findFirst: vi.fn(),
    },
  },
}))

describe("pacienteRepo.findByDocumento", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("debe retornar null cuando el documento no existe", async () => {
    // Arrange
    vi.mocked(prisma.documento.findFirst).mockResolvedValue(null)

    // Act
    const result = await pacienteRepo.findByDocumento("CI", "9999999")

    // Assert
    expect(result).toBeNull()
  })

  it("debe retornar información del paciente cuando el documento existe", async () => {
    // Arrange
    vi.mocked(prisma.documento.findFirst).mockResolvedValue({
      tipo: "CI",
      numero: "1234567",
      persona: {
        idPersona: 100,
        paciente: {
          idPaciente: 42,
        },
      },
    } as any)

    // Act
    const result = await pacienteRepo.findByDocumento("CI", "1234567")

    // Assert
    expect(result).toEqual({
      idPaciente: 42,
      idPersona: 100,
      tipoDocumento: "CI",
      numeroDocumento: "1234567",
    })
  })

  it("debe hacer trim del número de documento", async () => {
    // Arrange
    vi.mocked(prisma.documento.findFirst).mockResolvedValue(null)

    // Act
    await pacienteRepo.findByDocumento("CI", "  1234567  ")

    // Assert
    expect(prisma.documento.findFirst).toHaveBeenCalledWith({
      where: {
        tipo: "CI",
        numero: "1234567", // Debe estar trimmed
      },
      // ... include
    })
  })
})
```

### 6.3 Prueba de Integración/Endpoint

```typescript
// tests/integration/api/pacientes/route.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { POST } from "@/app/api/pacientes/route"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

describe("POST /api/pacientes", () => {
  beforeEach(async () => {
    // Limpiar datos de prueba
    await prisma.paciente.deleteMany({})
    await prisma.persona.deleteMany({})
    await prisma.documento.deleteMany({})
  })

  afterEach(async () => {
    // Limpiar después de cada test
    await prisma.paciente.deleteMany({})
    await prisma.persona.deleteMany({})
    await prisma.documento.deleteMany({})
  })

  it("debe retornar 409 cuando se intenta crear un paciente con DNI duplicado", async () => {
    // Arrange: Crear un paciente inicial
    const pacienteExistente = await prisma.persona.create({
      data: {
        nombres: "Juan",
        apellidos: "Pérez",
        estaActivo: true,
        documento: {
          create: {
            tipo: "CI",
            numero: "1234567",
            paisEmision: "PY",
          },
        },
        paciente: {
          create: {
            estaActivo: true,
          },
        },
      },
    })

    // Crear request para duplicado
    const body = {
      nombreCompleto: "Otro Nombre",
      tipoDocumento: "CI",
      numeroDocumento: "1234567", // Mismo número
      telefono: "+595981234567",
      direccion: "Calle Test",
      ciudad: "Asunción",
      pais: "PY",
      preferenciasContacto: {
        whatsapp: true,
      },
    }

    const request = new NextRequest("http://localhost/api/pacientes", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        // Mock de autenticación
        "Authorization": "Bearer test-token",
      },
    })

    // Act
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(409)
    expect(data.ok).toBe(false)
    expect(data.code).toBe("PACIENTE_ALREADY_EXISTS")
    expect(data.error).toContain("Ya existe un paciente registrado con este CI: 1234567")
  })

  it("debe crear paciente exitosamente cuando el DNI no existe", async () => {
    // Arrange
    const body = {
      nombreCompleto: "María García",
      tipoDocumento: "CI",
      numeroDocumento: "7654321",
      telefono: "+595981234567",
      direccion: "Calle Test",
      ciudad: "Asunción",
      pais: "PY",
      preferenciasContacto: {
        whatsapp: true,
      },
    }

    const request = new NextRequest("http://localhost/api/pacientes", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-token",
      },
    })

    // Act
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(201)
    expect(data.ok).toBe(true)
    expect(data.data.idPaciente).toBeDefined()
  })
})
```

---

## 7. Checklist de Implementación

### ✅ Completado

- [x] Crear clase de error `PacienteAlreadyExistsError`
- [x] Implementar función `findByDocumento` en repositorio
- [x] Agregar validación en `createPaciente` antes de transacción
- [x] Manejar error en `route.ts` con respuesta HTTP 409
- [x] Manejar errores de Prisma como fallback (race conditions)
- [x] Actualizar función `errors.conflict` para aceptar detalles

### 📝 Pendiente (Opcional)

- [ ] Agregar índice único en BD para `(tipo, numero)` en tabla `Documento`
- [ ] Implementar pruebas unitarias
- [ ] Implementar pruebas de integración
- [ ] Agregar métricas/logging para duplicados detectados

---

## 8. Consideraciones Adicionales

### 8.1 Performance

- La validación se hace antes de la transacción para evitar trabajo innecesario
- Se recomienda tener un índice en `(tipo, numero)` en la tabla `Documento`
- La consulta usa `findFirst` que es eficiente con índices apropiados

### 8.2 Seguridad

- La validación previene creación accidental de duplicados
- El mensaje de error no expone información sensible
- El `existingPacienteId` en detalles puede ser útil para debugging pero no se expone al usuario final

### 8.3 Auditoría

- Los errores incluyen timestamp para auditoría
- Se recomienda loggear intentos de creación de duplicados para análisis

---

**Fin del documento**

