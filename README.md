# Chomyn Odontología

Sistema web clínico (Next.js App Router + TypeScript + Tailwind, Prisma + PostgreSQL, NextAuth).

## Requisitos
- Node 18+
- PNPM/Yarn/NPM
- PostgreSQL

## Configuración
1. Copiar `.env.example` a `.env.local` y completar variables.
2. `pnpm install`
3. `pnpm prisma generate`
4. `pnpm dev`

## Scripts
- `dev`: desarrollo
- `build`: build de producción
- `start`: producción
- `prisma:*`: tareas de prisma

## Estructura
- `app/` páginas y rutas
- `components/` UI
- `prisma/` schema y migraciones
- `lib/` utilidades





## Citas

## Gestión de Citas

### 1 `GET /api/agenda/citas`

**Lista citas con filtros y paginación**

**Query Parameters:**

- `fechaInicio`, `fechaFin` - Rango de búsqueda
- `profesionalId`, `pacienteId`, `consultorioId` - Filtros opcionales
- `estado` - Estados: `SCHEDULED`, `CONFIRMED`, etc.
- `page`, `limit` - Paginación
- `sort` - Ordenamiento (default: `inicio ASC`)


**Respuesta:** JSON con citas y metadatos de paginación

---

### 2 `GET /api/agenda/citas/{id}`

**Obtiene detalle completo de una cita**

Incluye: horarios, duración, tipo, motivo, estado, profesional, consultorio, paciente y referencia de reprogramación.

---

### 3 `POST /api/agenda/citas`

**Crea una nueva cita**

```json
{
  "pacienteId": 1,
  "profesionalId": 2,
  "consultorioId": 1,
  "inicio": "2025-10-22T10:00:00Z",
  "duracionMinutos": 45,
  "tipo": "CONSULTA",
  "motivo": "Control general",
  "createdByUserId": 5
}
```

**Validaciones:**

- ✅ Sin solapamiento profesional/consultorio
- ✅ Fuera de bloqueos
- ✅ Estado inicial: `SCHEDULED`


**Respuesta:** `201 Created`

---

### 4 `PUT /api/agenda/citas/{id}/reprogramar`

**Reprograma una cita**

Crea nueva cita y cancela la anterior automáticamente.

**Body:** `inicio`, `duracionMinutos`, `profesionalId` (opcional), `consultorioId` (opcional), `motivo`, `notas`

**Flujo:**

1. Verifica estado reprogramable (`SCHEDULED`/`CONFIRMED`)
2. Crea nueva cita con `reprogramadaDesdeId`
3. Marca anterior como `CANCELLED`
4. Registra cambios en `CitaEstadoHistorial`


---

### 5 `PATCH /api/agenda/citas/{id}/cancelar`

**Cancela una cita (no elimina)**

**Body:** `motivoCancelacion`, `notas`, `cancelledByUserId`

**Resultado:**

- Estado → `CANCELLED`
- Guarda motivo, fecha y usuario
- Mantiene trazabilidad


---

### 6 `PATCH /api/agenda/citas/{id}/estado`

**Cambia estado operativo**

**Estados disponibles:** `CONFIRMED`, `CHECKED_IN`, `IN_PROGRESS`, `COMPLETED`, `NO_SHOW`

**Body:** `nuevoEstado`, `nota`, `changedByUserId`

**Uso:** Check-in, inicio de consulta, finalización, ausencia del paciente

---

### 7 `DELETE /api/agenda/citas/{id}`

**Elimina físicamente (solo ADMIN)**

⚠️ **No recomendado en producción** - Usar cancelación para mantener trazabilidad

---

## Disponibilidad y Bloqueos

### 8 `GET /api/agenda/disponibilidad`

**Consulta intervalos disponibles**

**Query Parameters:**

- `profesionalId`, `consultorioId`
- `fecha`, `duracionMinutos`, `intervalo`


**Respuesta:** Lista de slots disponibles con `slotStart`, `slotEnd`, `motivoBloqueo`

---


## Endpoints Relacionados

| Endpoint | Descripción
|-----|-----
| `GET /api/pacientes/{pacienteId}/citas` | Citas del paciente (próximas y pasadas)
| `GET /api/profesionales/{profesionalId}/citas` | Citas de un profesional

# API - Procedimientos y Tratamientos

## Gestión de Procedimientos

### `POST /api/agenda/citas/{id}/procedimientos`
**Registra un nuevo procedimiento asociado al turno**
### `GET /api/agenda/citas/{id}/procedimientos`
**Lista todos los procedimientos de un turno**
### `GET /api/procedimientos/{id}`
**Obtiene detalle completo de un procedimiento**
Incluye: descripción, diagnóstico, notas clínicas, resultado, duración, materiales utilizados, tags y adjuntos asociados.
### `PATCH /api/procedimientos/{id}`
**Actualiza parcialmente un procedimiento**
**Uso:** Modificaciones específicas sin reescribir todo el registro

# Adjuntos Multimedia

### `POST /api/procedimientos/{id}/adjuntos`
**Sube archivos multimedia al procedimiento**
**Content-Type:** `multipart/form-data`
**Campos:**
- `archivos` - Archivos (imágenes, radiografías, estudios)
- `tipo` - Enum: `FOTO`, `RX`, `LAB`
- `descripcion` - Descripción del adjunto
### `GET /api/procedimientos/{id}/adjuntos`
**Lista adjuntos del procedimiento**
**Query Parameters:**
- `tipo` - Filtrar por tipo: `FOTO`, `RX`, `LAB`
- `limit` - Límite de resultados
- `cursor` - Paginación
**Respuesta:** Array de adjuntos con URLs, tipo, descripción y metadata
### `DELETE /api/procedimientos/{id}/adjuntos/{id}`
**Elimina un adjunto específico**
Eliminación lógica del adjunto (mantén rastro para auditoría).
**Respuesta:** `204 No Content`
### `POST /api/uploads/presign`
**Genera URL pre-firmada para upload directo (S3/Cloudinary)**
**Respuesta:** URL firmada para upload directo
**Flujo:**
1. Cliente solicita URL pre-firmada
2. Cliente sube archivo directamente a storage
3. Cliente registra metadata con `POST /api/procedimientos/{id}/adjuntos`

## Auditoría y Trazabilidad

### `GET /api/auditoria/procedimientos`
**Historial completo de cambios en procedimientos**

## Reportes Operativos

### `GET /api/reportes/procedimientos`
**Genera KPIs y estadísticas de procedimientos**

# 1. Historia clínica ## Lectura (resumen completo del paciente) ### GET /api/pacientes/{id}/historia **Devuelve un resumen consolidado (alergias, medicación, diagnósticos activos, planes vigentes, última presión/estado general, último odontograma).** ## Listado de entradas ## GET /api/pacientes/{id}/historia/entradas?desde=&hasta=&citaId= **Lista entradas versionales (una o más por cita si lo necesitas).** ## Alta de entrada (vinculada a cita) ## `POST /api/pacientes/{id}/historia/entradas **Crea una entrada clínica asociada a citaId.** **Campos mínimos: citaId, motivoConsulta, diagnosticos[], alergias[], medicacionActual[], estadoGeneral, notas.** ## Detalle / edición puntual ## `GET /api/historia/entradas/{id} ## `PATCH /api/historia/entradas/{id} **Actualizaciones parciales (p.ej., corrección de notas o añadir diagnóstico).** ## Versiones por cita (auditables) ## `GET /api/agenda/citas/{citaId}/historia/versiones **Devuelve las versiones creadas en el contexto de esa cita (para comparar antes/después).** # 2. Odontograma ## Estado vigente ## `GET /api/pacientes/{id}/odontograma **Devuelve el mapa actual (odontograma + periodonto).** ## Actualización versionada (por cita) ## `PATCH /api/pacientes/{id}/odontograma **Aplica un diff (lista de cambios por pieza) y registra versión ligada a citaId.** **Body mínimo: citaId, cambios: [{pieza: "26", campos:{caries:"oclusal", restauracion:"resina"}}].** ## Versiones ## `GET /api/pacientes/{pacienteId}/odontograma/versiones?desde=&hasta= **Lista versiones (timestamp, cita, autor) para revertir/inspeccionar.** **Nota: con un único PATCH versionado evitas PUT masivo y reduces riesgos de sobreescritura.** # 3. Adjuntos clínicos ## Adjuntar/consultar a nivel CITA (genérico) ## `POST /api/agenda/citas/{citaId}/adjuntos ## `GET /api/agenda/citas/{citaId}/adjuntos?tipo=&cursor=&limit= ## `DELETE /api/agenda/citas/{citaId}/adjuntos/{adjuntoId} (borrado lógico)



