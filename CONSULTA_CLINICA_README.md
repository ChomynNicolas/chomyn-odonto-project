# Consulta Clínica - Workspace Completo

## 📋 Resumen

Sistema completo de Consulta Clínica implementado como workspace exclusivo para roles **ODONT** y **ADMIN**, con acceso de solo lectura para **RECEP**.

## 🏗️ Estructura

### Backend (`/app/api/agenda/citas/[id]/consulta/`)

```
consulta/
├── _rbac.ts              # Control de acceso por roles
├── _schemas.ts            # Validaciones Zod
├── _dto.ts                # Tipos TypeScript para DTOs
├── _service.ts            # Lógica de negocio
├── route.ts               # GET/POST consulta principal
├── estado/route.ts        # PUT estado de consulta
├── anamnesis/
│   ├── route.ts          # GET/POST anamnesis
│   └── [anamnesisId]/route.ts  # PUT/DELETE anamnesis
├── diagnosticos/
│   ├── route.ts          # GET/POST diagnósticos
│   └── [diagnosticoId]/route.ts  # PUT/DELETE diagnósticos
├── procedimientos/
│   ├── route.ts          # GET/POST procedimientos
│   └── [procedimientoId]/route.ts  # PUT/DELETE procedimientos
├── medicaciones/
│   ├── route.ts          # GET/POST medicaciones
│   └── [medicacionId]/route.ts  # PUT/DELETE medicaciones
├── adjuntos/
│   ├── route.ts          # GET/POST adjuntos
│   └── [adjuntoId]/route.ts  # DELETE adjuntos
├── odontograma/route.ts  # GET/POST odontograma
└── periodontograma/route.ts  # GET/POST periodontograma
```

### Frontend (`/components/consulta-clinica/`)

```
consulta-clinica/
├── ConsultaClinicaWorkspace.tsx  # Componente principal
└── modules/
    ├── AnamnesisModule.tsx
    ├── DiagnosticosModule.tsx
    ├── ProcedimientosModule.tsx
    ├── MedicacionesModule.tsx
    ├── AdjuntosModule.tsx
    ├── OdontogramaModule.tsx
    └── PeriodontogramaModule.tsx
```

### Página (`/app/(dashboard)/agenda/citas/[id]/consulta/page.tsx`)

Página principal que renderiza el workspace completo con RBAC.

## 🔐 RBAC (Role-Based Access Control)

### ODONT y ADMIN
- ✅ Acceso completo a todos los módulos
- ✅ Crear, editar y eliminar datos clínicos
- ✅ Subir y eliminar adjuntos
- ✅ Crear y editar odontograma/periodontograma
- ✅ Finalizar consulta

### RECEP
- ✅ Solo lectura de datos administrativos mínimos
- ❌ No puede ver datos clínicos completos
- ❌ No puede editar ningún dato

## 📝 Módulos Implementados

### 1. Anamnesis / Notas Clínicas
- Crear notas clínicas con título opcional
- Editar y eliminar anamnesis
- Historial completo con auditoría

### 2. Diagnósticos
- Crear diagnósticos (con código opcional)
- Estados: Activo, Resuelto, Descartado
- Actualizar estado y notas
- Eliminar (solo ADMIN)

### 3. Procedimientos
- Registrar procedimientos realizados
- Cantidad y notas de resultado
- Vinculación con catálogo de procedimientos (opcional)

### 4. Medicaciones / Indicaciones
- Crear indicaciones médicas
- Dosis, frecuencia, vía de administración
- Desactivar indicaciones (soft delete)

### 5. Adjuntos (RX/Fotos)
- Subir imágenes y documentos
- Visualización de adjuntos
- Eliminación con soft delete

### 6. Odontograma
- Crear snapshots de odontograma
- Entradas por diente y superficie
- Estados dentales (Caries, Obturado, etc.)

### 7. Periodontograma
- Crear snapshots de periodontograma
- Medidas periodontales por sitio
- Profundidad de sondaje, sangrado, placa, movilidad, furcación

## 🔄 Flujo de Uso

### 1. Acceder a la Consulta
```
GET /api/agenda/citas/[id]/consulta
```

**Response (ODONT/ADMIN):**
```json
{
  "ok": true,
  "data": {
    "citaId": 123,
    "status": "DRAFT",
    "anamnesis": [...],
    "diagnosticos": [...],
    "procedimientos": [...],
    "medicaciones": [...],
    "adjuntos": [...],
    "odontograma": {...},
    "periodontograma": {...}
  }
}
```

**Response (RECEP):**
```json
{
  "ok": true,
  "data": {
    "citaId": 123,
    "fecha": "2024-01-15T10:00:00Z",
    "profesional": {
      "id": 5,
      "nombre": "Dr. Juan Pérez"
    },
    "motivo": "Consulta de rutina",
    "estado": "DRAFT"
  }
}
```

### 2. Crear Anamnesis
```typescript
POST /api/agenda/citas/[id]/consulta/anamnesis
Body: {
  "title": "Motivo de consulta",
  "notes": "Paciente refiere dolor..."
}
```

### 3. Crear Diagnóstico
```typescript
POST /api/agenda/citas/[id]/consulta/diagnosticos
Body: {
  "label": "Caries dental",
  "code": "K02",
  "status": "ACTIVE",
  "notes": "Caries en diente 16"
}
```

### 4. Finalizar Consulta
```typescript
PUT /api/agenda/citas/[id]/consulta/estado
Body: {
  "status": "FINAL",
  "finishedAt": "2024-01-15T11:00:00Z"
}
```

## ✅ Validaciones

### Zod Schemas
- Todos los endpoints validan entrada con Zod
- Mensajes de error claros y específicos
- Validación de tipos y rangos

### Integridad
- Verificación de que la consulta pertenece a la cita
- Verificación de que los recursos pertenecen a la consulta
- Validación de estados y transiciones

## 🔍 Auditoría

Todos los cambios incluyen:
- Usuario que creó/modificó
- Fecha y hora del cambio
- Historial de estados (para diagnósticos)

## 📱 UI/UX

- Interfaz modular con tabs
- Formularios con validación en tiempo real
- Feedback visual con toasts
- Estados de carga y skeleton screens
- Responsive design

## 🚀 Próximos Pasos

1. **Integración de Upload**: Conectar módulo de adjuntos con sistema de upload existente
2. **Odontograma Visual**: Implementar componente visual interactivo
3. **Periodontograma Visual**: Implementar componente visual interactivo
4. **Exportación PDF**: Generar reporte completo de consulta
5. **Plantillas**: Plantillas predefinidas para anamnesis comunes

## 📚 Ejemplos de Request/Response

### Crear Procedimiento
```typescript
POST /api/agenda/citas/123/consulta/procedimientos
Headers: { "Content-Type": "application/json" }
Body: {
  "serviceType": "Obturación",
  "toothNumber": 16,
  "toothSurface": "O",
  "quantity": 1,
  "resultNotes": "Obturación completada exitosamente"
}

Response: {
  "ok": true,
  "data": {
    "id": 456,
    "serviceType": "Obturación",
    "toothNumber": 16,
    "toothSurface": "O",
    "quantity": 1,
    "resultNotes": "Obturación completada exitosamente",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Crear Odontograma
```typescript
POST /api/agenda/citas/123/consulta/odontograma
Body: {
  "notes": "Odontograma inicial",
  "entries": [
    {
      "toothNumber": 16,
      "surface": "O",
      "condition": "CARIES",
      "notes": "Caries moderada"
    },
    {
      "toothNumber": 17,
      "condition": "INTACT"
    }
  ]
}
```

## 🛡️ Seguridad

- RBAC estricto en cada endpoint
- Validación de sesión en todas las rutas
- Verificación de pertenencia de recursos
- Soft delete para datos críticos
- Auditoría completa de cambios

