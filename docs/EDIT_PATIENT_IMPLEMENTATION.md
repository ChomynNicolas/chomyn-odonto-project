# Sistema de Edición de Pacientes con Auditoría

## Resumen

Este documento describe la implementación completa del sistema de edición de pacientes con detección de cambios críticos, confirmación obligatoria, y registro detallado de auditoría.

## Arquitectura

### Componentes Principales

1. **Tipos y Validaciones** (`src/types/patient-edit.types.ts`, `src/lib/validation/patient-edit.schema.ts`)
   - Definición de tipos TypeScript compartidos entre cliente y servidor
   - Esquemas Zod para validación condicional (base y con cambios críticos)

2. **Utilidades de Detección de Cambios** (`src/lib/audit/diff-utils.ts`)
   - Normalización y comparación de valores
   - Detección automática de cambios críticos
   - Formateo para visualización en UI

3. **Servicio de Auditoría** (`src/lib/audit/patient-audit.service.ts`)
   - Creación de logs de auditoría detallados
   - Consulta de historial de cambios

4. **Componentes de Interfaz**
   - `ConfirmCriticalChangesDialog`: Dialog de confirmación para cambios críticos
   - `EditPatientSheet`: Componente principal de edición mejorado

5. **API Endpoint** (`src/app/api/pacientes/[id]/route.ts`)
   - Endpoint PUT mejorado con validación condicional
   - Integración completa con servicio de auditoría

## Campos Críticos

Los siguientes campos se consideran críticos y requieren confirmación adicional:

- `firstName` (Nombre)
- `lastName` (Apellido)
- `documentNumber` (Número de Documento)
- `dateOfBirth` (Fecha de Nacimiento)

Cuando se modifican estos campos, el sistema:

1. Detecta automáticamente el cambio
2. Muestra un dialog de confirmación
3. Requiere un motivo justificativo de 10-500 caracteres
4. Registra el motivo en el log de auditoría

## Flujo de Edición

### 1. Apertura del Formulario

El usuario hace clic en "Editar Paciente" desde el dropdown en `PatientHeader`:
- Se abre el `EditPatientSheet`
- Se carga el registro completo del paciente
- El formulario se inicializa con los valores actuales

### 2. Detección de Cambios

Al enviar el formulario:

```typescript
// Se comparan los valores originales con los nuevos
const changes = detectChanges(originalData, updatedData)

// Se verifica si hay cambios críticos
if (hasCriticalChanges(changes)) {
  // Muestra dialog de confirmación
  setShowConfirmDialog(true)
}
```

### 3. Confirmación de Cambios Críticos

Si hay cambios críticos:

1. Se muestra `ConfirmCriticalChangesDialog`
2. Se listan todos los cambios críticos detectados
3. El usuario debe proporcionar un motivo (10-500 caracteres)
4. Validación en tiempo real del motivo

### 4. Guardado y Auditoría

Una vez confirmado:

1. Se envía `PatientUpdatePayload` al endpoint PUT:
   ```typescript
   {
     data: PatientEditFormData,
     changes: PatientChangeRecord[],
     motivoCambioCritico?: string
   }
   ```

2. El servidor valida condicionalmente:
   - Si hay cambios críticos: usa `patientEditWithCriticalSchema`
   - Si no: usa `patientEditBaseSchema`

3. Se actualiza el paciente en la base de datos

4. Se crea el log de auditoría con:
   - Diff completo de cambios
   - IP del cliente
   - User-Agent
   - Timestamp
   - Motivo (si aplica)
   - Metadata adicional

## Validaciones

### Cliente (Zod Schemas)

- **Nombre/Apellido**: 2-100 caracteres, solo letras, espacios, acentos y ñ
- **Documento**: 6-20 caracteres, alfanumérico con guiones
- **Fecha de Nacimiento**: Validación de edad 0-120 años
- **Email**: Formato válido de email
- **Teléfono**: Formato internacional
- **Motivo (crítico)**: 10-500 caracteres, obligatorio solo si hay cambios críticos

### Servidor

- Duplicación de documentos (excluyendo paciente actual)
- Control de concurrencia (optimistic locking con ETag)
- Validación condicional según tipo de cambios
- Verificación de permisos por rol

## Estructura de Auditoría

Cada log de auditoría incluye:

```typescript
{
  actorId: number,           // ID del usuario
  action: "PATIENT_UPDATE",  // Acción realizada
  entity: "Paciente",        // Entidad afectada
  entityId: number,          // ID del paciente
  ip: string,                // IP del cliente
  metadata: {
    changes: Array<{         // Array de cambios
      field: string,
      oldValue: unknown,
      newValue: unknown,
      isCritical: boolean
    }>,
    changesCount: number,
    criticalChanges: string[], // Campos críticos modificados
    motivoCambioCritico?: string,
    timestamp: string,
    userAgent: string,
    usuarioEmail: string
  }
}
```

## Uso de Componentes

### EditPatientSheet

```tsx
<EditPatientSheet
  open={editSheetOpen}
  onOpenChange={setEditSheetOpen}
  patient={fullPatientRecord}
  onSuccess={handleEditSuccess}
/>
```

### ConfirmCriticalChangesDialog

```tsx
<ConfirmCriticalChangesDialog
  open={showConfirmDialog}
  onOpenChange={setShowConfirmDialog}
  criticalChanges={getCriticalChanges(pendingChanges)}
  onConfirm={handleConfirmCritical}
  isLoading={isSubmitting}
/>
```

## Extensión del Sistema

### Agregar Nuevos Campos Críticos

1. Agregar el campo a `CRITICAL_FIELDS` en `src/types/patient-edit.types.ts`
2. El sistema automáticamente:
   - Lo detectará como crítico
   - Mostrará el dialog de confirmación
   - Requerirá motivo

### Personalizar Validaciones

Modificar los esquemas en `src/lib/validation/patient-edit.schema.ts`:

```typescript
export const patientEditBaseSchema = patientUpdateBodySchema.extend({
  // Agregar validaciones personalizadas
})
```

### Consultar Historial de Auditoría

```typescript
import { getPatientAuditLogs } from "@/lib/audit/patient-audit.service"

const logs = await getPatientAuditLogs(pacienteId)
```

## Consideraciones de Seguridad

1. **Validación en Cliente y Servidor**: Todas las validaciones se realizan en ambos lados
2. **Control de Concurrencia**: Optimistic locking previene conflictos
3. **Rate Limiting**: Límite de 30 actualizaciones por minuto por usuario
4. **Trazabilidad Completa**: Cada cambio queda registrado con IP, User-Agent, y timestamp
5. **Justificación Obligatoria**: Cambios críticos requieren motivo documentado

## Pruebas Recomendadas

1. **Cambios No Críticos**: Verificar que se guardan sin dialog
2. **Cambios Críticos**: Verificar que se muestra dialog y requiere motivo
3. **Validación de Motivo**: Probar con menos de 10 caracteres y más de 500
4. **Duplicación de Documento**: Intentar usar documento de otro paciente
5. **Concurrencia**: Dos usuarios editando simultáneamente
6. **Auditoría**: Verificar que los logs se crean correctamente con toda la información

## Referencias

- Tipos: `src/types/patient-edit.types.ts`
- Validaciones: `src/lib/validation/patient-edit.schema.ts`
- Utilidades: `src/lib/audit/diff-utils.ts`
- Servicio: `src/lib/audit/patient-audit.service.ts`
- Componentes: `src/components/pacientes/`
- API: `src/app/api/pacientes/[id]/route.ts`
