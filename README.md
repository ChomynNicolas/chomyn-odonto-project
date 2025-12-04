# Chomyn Odontología

Sistema web clínico (Next.js App Router + TypeScript + Tailwind, Prisma + PostgreSQL, NextAuth).

## Requisitos
- Node 18+
- PNPM/Yarn/NPM
- PostgreSQL

## Configuración

### Configuración de Base de Datos por Ambiente

El proyecto está configurado para usar diferentes bases de datos según el ambiente:

- **Development**: Base de datos Docker local (rápida para desarrollo)
- **Production**: Base de datos Neon (en la nube)
- **Test**: Base de datos Docker local (para pruebas)

### Pasos de Configuración

1. **Crear archivos de entorno**:
   ```bash
   # Copiar el template
   cp .env.example .env.development
   cp .env.example .env.production
   cp .env.example .env.test
   ```

2. **Configurar variables de entorno**:
   - `.env.development`: Configurar para Docker local
   - `.env.production`: Configurar con tu conexión Neon
   - `.env.test`: Configurar para pruebas (puede usar Docker)

3. **Instalar dependencias**:
   ```bash
   npm install
   # o
   pnpm install
   ```

4. **Configurar base de datos de desarrollo**:
   ```bash
   # Iniciar Docker
   npm run docker:up
   
   # Aplicar migraciones
   npm run db:migrate:dev
   
   # (Opcional) Poblar con datos de prueba
   npm run db:seed:dev
   ```

5. **Iniciar desarrollo**:
   ```bash
   npm run dev
   ```

### Scripts Disponibles

#### Desarrollo
- `npm run dev` - Inicia servidor de desarrollo (usa Docker DB)
- `npm run db:migrate:dev` - Aplica migraciones a DB de desarrollo
- `npm run db:seed:dev` - Pobla DB de desarrollo con datos
- `npm run db:studio:dev` - Abre Prisma Studio para DB de desarrollo

#### Producción
- `npm run build` - Build para producción (usa Neon DB)
- `npm run start` - Inicia servidor de producción
- `npm run db:migrate:prod` - Aplica migraciones a DB de producción
- `npm run db:seed:prod` - Pobla DB de producción (usar con cuidado)

#### Testing
- `npm run test` - Ejecuta tests (usa Docker DB de test)
- `npm run db:migrate:test` - Aplica migraciones a DB de test

#### Docker
- `npm run docker:up` - Inicia contenedores Docker
- `npm run docker:down` - Detiene contenedores Docker
- `npm run docker:logs` - Muestra logs de PostgreSQL
- `npm run docker:reset` - Reinicia contenedores y volúmenes

### Variables de Entorno Importantes

- `DATABASE_URL`: URL de conexión a PostgreSQL
- `NEXTAUTH_URL`: URL base de la aplicación
- `AUTH_SECRET`: Secreto para NextAuth
- `CLOUDINARY_*`: Credenciales de Cloudinary

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



