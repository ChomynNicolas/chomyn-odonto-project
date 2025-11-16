# Documentación: Gestión de Documentos del Paciente

## Resumen de Ubicaciones de Documentos

### 1. Adjuntos (Tabla `Adjunto`)
Los adjuntos se pueden guardar en tres contextos diferentes:

#### A. Adjuntos Directos al Paciente
- **Campo**: `pacienteId` (no null)
- **Campos**: `consultaId` = null, `procedimientoId` = null
- **Ruta API**: `POST /api/pacientes/[id]/adjuntos`
- **Componente**: `AttachmentUploadDialog`
- **Uso**: Documentos generales del paciente (cédulas, radiografías, etc.)

#### B. Adjuntos a Consultas
- **Campo**: `consultaId` (no null)
- **Relación**: Consulta → Cita → Paciente
- **Ruta API**: Se crean durante la creación de consultas
- **Servicio**: `addAdjuntoAConsulta` (en seed/ensure.ts y seed/clinical.ts)
- **Uso**: Documentos específicos de una consulta (fotos intraorales, radiografías de la consulta)

#### C. Adjuntos a Procedimientos
- **Campo**: `procedimientoId` (no null)
- **Relación**: Procedimiento → Consulta → Cita → Paciente
- **Servicio**: `addAdjuntoAConsulta` con `procedimientoId`
- **Uso**: Documentos específicos de un procedimiento realizado

### 2. Consentimientos (Tabla `Consentimiento`)
- **Tabla separada**: `Consentimiento` (no es un `Adjunto`)
- **Ruta API**: `POST /api/pacientes/[id]/consentimiento`
- **Componente**: `UploadConsentDialog`
- **Campos principales**:
  - `Paciente_idPaciente`: ID del paciente
  - `Persona_idPersona_responsable`: ID del responsable que firma
  - `Cita_idCita`: ID de la cita asociada (opcional)
  - Archivo en Cloudinary (public_id, secure_url, etc.)
- **Uso**: Consentimientos informados firmados

## Estructura de Datos

### Tabla Adjunto
```prisma
model Adjunto {
  idAdjunto Int @id
  pacienteId Int?        // Adjuntos directos al paciente
  consultaId Int?        // Adjuntos de consultas
  procedimientoId Int?   // Adjuntos de procedimientos
  
  tipo AdjuntoTipo       // XRAY, INTRAORAL_PHOTO, etc.
  descripcion String?
  
  // Cloudinary
  publicId String @unique
  secureUrl String
  folder String
  resourceType String
  format String?
  bytes Int
  width Int?
  height Int?
  
  uploadedByUserId Int
  isActive Boolean
}
```

### Tabla Consentimiento
```prisma
model Consentimiento {
  idConsentimiento Int @id
  Paciente_idPaciente Int
  Persona_idPersona_responsable Int
  Cita_idCita Int?
  
  tipo TipoConsentimiento
  firmado_en DateTime
  vigente_hasta DateTime
  
  // Cloudinary (similar a Adjunto)
  public_id String @unique
  secure_url String
  format String?
  bytes Int
  width Int?
  height Int?
  
  activo Boolean
}
```

## Problemas Identificados

1. **Query incompleta**: La query actual solo obtiene adjuntos con `pacienteId` directo
2. **Falta adjuntos de consultas**: No se obtienen adjuntos vinculados a consultas del paciente
3. **Consentimientos separados**: Los consentimientos no se muestran junto con adjuntos
4. **Rutas API antiguas**: Existe `/api/adjuntos` que no está siendo usada

## Solución Propuesta

1. Modificar la query para obtener TODOS los adjuntos del paciente:
   - Adjuntos con `pacienteId` directo
   - Adjuntos de consultas del paciente (a través de `consulta.cita.pacienteId`)
   - Adjuntos de procedimientos de consultas del paciente

2. Incluir consentimientos en la respuesta de adjuntos

3. Unificar la visualización para mostrar ambos tipos de documentos

4. Agregar filtros por tipo de documento (adjuntos vs consentimientos)

