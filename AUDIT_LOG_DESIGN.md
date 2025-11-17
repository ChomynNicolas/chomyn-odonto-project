# Diseño de Página de Audit Log

## Estructura de la Página

### Layout Principal
```
┌─────────────────────────────────────────────────────────────┐
│  Header: "Registro de Auditoría"                            │
│  [Filtros] [Exportar] [Refrescar]                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Panel de Filtros (Colapsable)                      │   │
│  │ - Rango de fechas                                  │   │
│  │ - Usuario                                          │   │
│  │ - Tipo de acción                                   │   │
│  │ - Entidad/Recurso                                  │   │
│  │ - Búsqueda de texto                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Tabla de Eventos                                    │   │
│  │ [Fecha] [Usuario] [Acción] [Recurso] [Detalle]     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Paginación                                          │   │
│  │ [< Anterior] [1] [2] [3] [Siguiente >]              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Panel de Detalle (Modal/Drawer)
```
┌─────────────────────────────────────────────────────────────┐
│  Detalle del Evento de Auditoría                           │
├─────────────────────────────────────────────────────────────┤
│  Información General:                                       │
│  - Fecha y hora                                             │
│  - Usuario                                                  │
│  - Acción                                                   │
│  - Recurso                                                  │
│  - IP / Origen                                              │
│                                                             │
│  Cambios Realizados:                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Campo        │ Antes        │ Después              │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ nombre       │ Juan         │ Juan Carlos          │   │
│  │ estado       │ Activo       │ Inactivo             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Metadata Completa:                                         │
│  [JSON expandible]                                          │
└─────────────────────────────────────────────────────────────┘
```

## Componentes Principales

1. **AuditLogPage** - Página principal
2. **AuditLogFilters** - Panel de filtros avanzados
3. **AuditLogTable** - Tabla de eventos
4. **AuditLogDetail** - Panel de detalle
5. **AuditDiffViewer** - Visualizador de cambios
6. **AuditExportButton** - Botón de exportación

## Flujos Principales

### 1. Carga Inicial
- Cargar últimos 20 eventos
- Mostrar indicador de carga
- Si no hay eventos, mostrar mensaje

### 2. Aplicar Filtros
- Usuario selecciona filtros
- Debounce de 300ms para búsqueda de texto
- Actualizar URL con query params
- Recargar datos

### 3. Ver Detalle
- Click en fila de tabla
- Abrir modal/drawer con información completa
- Mostrar diff si está disponible
- Permitir copiar información

### 4. Exportar
- Click en botón exportar
- Aplicar filtros actuales
- Generar CSV/Excel
- Descargar archivo

## Buenas Prácticas Implementadas

1. **Rendimiento**
   - Paginación eficiente (20-50 items por página)
   - Índices en BD para búsquedas rápidas
   - Debounce en búsqueda de texto
   - Lazy loading de detalles

2. **UX**
   - Filtros colapsables para ahorrar espacio
   - Indicadores visuales de acciones (colores)
   - Tooltips informativos
   - Mensajes claros de error/empty state

3. **Seguridad**
   - Solo ADMIN puede acceder
   - Validación de permisos en backend
   - No exponer información sensible en logs

4. **Trazabilidad**
   - Metadata completa en cada evento
   - IP y user-agent capturados
   - Timestamps precisos
   - Diferencias claras entre antes/después

