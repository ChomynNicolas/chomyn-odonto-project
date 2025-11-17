# Checklist de Implementación - Sistema de Auditoría con RBAC

## 📋 Resumen Ejecutivo

Este documento complementa el **AUDIT_LOG_ARCHITECTURE_AND_ACCESS_CONTROL.md** y proporciona un checklist práctico para la implementación del sistema de auditoría con control de acceso basado en roles.

---

## ✅ Estado de Implementación Actual

### Completado ✅

#### FASE 1: Diseño y Preparación
- [x] Documento de arquitectura completo (`AUDIT_LOG_ARCHITECTURE_AND_ACCESS_CONTROL.md`)
- [x] Modelo RBAC implementado (`src/lib/audit/rbac.ts`)
- [x] Helpers de filtrado y ofuscación (`src/lib/audit/filters.ts`)
- [x] Tipos TypeScript completos (`src/lib/types/audit.ts`)

#### FASE 2: Backend - Core de Auditoría
- [x] Endpoint global `/api/audit/logs` con RBAC
- [x] Endpoint de detalle `/api/audit/logs/[id]` con RBAC
- [x] Endpoint de exportación `/api/audit/export` con RBAC
- [x] Endpoint contextual `/api/pacientes/[id]/audit`
- [x] Endpoint contextual `/api/agenda/citas/[id]/audit`

#### FASE 3: Frontend - Página Global ADMIN
- [x] Página `/audit` con verificación de permisos
- [x] Mensaje de acceso denegado para roles no autorizados
- [x] Componentes de filtros, tabla y detalle
- [x] Exportación CSV funcional

---

## 🔄 Pendiente de Implementación

### FASE 4: Frontend - Componentes Contextuales

#### Paso 4.1: Historial en Ficha de Paciente
- [ ] Crear componente `src/components/pacientes/audit/PatientAuditHistory.tsx`
- [ ] Integrar en pestaña "Historial de Cambios" del paciente
- [ ] Mostrar solo información clínica relevante para ODONT
- [ ] Implementar filtros básicos (fecha, tipo de acción)
- [ ] Verificar permisos antes de mostrar

**Archivos a modificar:**
- `src/app/(dashboard)/pacientes/[id]/page.tsx` o layout
- Crear nueva pestaña o sección

#### Paso 4.2: Historial en Consulta Clínica
- [ ] Crear componente `src/components/consulta-clinica/AuditHistory.tsx`
- [ ] Integrar en `ConsultaClinicaWorkspace.tsx`
- [ ] Mostrar cambios en la consulta actual
- [ ] Verificar que ODONT solo vea sus propias consultas
- [ ] Aplicar filtros de visibilidad según rol

**Archivos a modificar:**
- `src/components/consulta-clinica/ConsultaClinicaWorkspace.tsx`
- Agregar nueva pestaña o sección

#### Paso 4.3: Historial en Gestión de Citas
- [ ] Crear componente `src/components/agenda/AuditHistory.tsx`
- [ ] Integrar en detalle de cita
- [ ] Mostrar cambios de estado y reprogramaciones
- [ ] Verificar que RECEP solo vea citas asignadas
- [ ] Aplicar filtros según rol

**Archivos a modificar:**
- `src/app/(dashboard)/agenda/citas/[id]/page.tsx` o similar
- Agregar sección de historial

---

### FASE 5: Seguridad y Protección

#### Paso 5.1: Implementar Inmutabilidad
- [ ] Crear middleware para bloquear UPDATE/DELETE en AuditLog
- [ ] Agregar validación en Prisma schema (si es posible)
- [ ] Crear función de verificación de integridad (hash)
- [ ] Documentar políticas de inmutabilidad

**Archivos a crear/modificar:**
- `src/middleware.ts` o `src/lib/audit/immutability.ts`
- Agregar validación en `prisma/schema.prisma`

#### Paso 5.2: Implementar Rate Limiting
- [ ] Agregar rate limiting a endpoints de auditoría
- [ ] Configurar límites por rol (ADMIN más permisivo)
- [ ] Implementar logging de intentos excesivos
- [ ] Crear alertas para administradores

**Archivos a crear/modificar:**
- `src/lib/rate-limit.ts` o usar middleware
- Actualizar endpoints en `src/app/api/audit/**`

#### Paso 5.3: Verificaciones de Ownership
- [ ] Implementar verificación de ownership para ODONT (solo sus consultas)
- [ ] Implementar verificación de asignación para RECEP (solo citas asignadas)
- [ ] Agregar validaciones en endpoints contextuales
- [ ] Probar casos límite

**Archivos a modificar:**
- `src/app/api/pacientes/[id]/audit/route.ts`
- `src/app/api/agenda/citas/[id]/audit/route.ts`
- `src/lib/audit/filters.ts` (función `shouldShowEntry`)

---

### FASE 6: Mejoras y Optimizaciones

#### Paso 6.1: Búsqueda Mejorada en Metadata
- [ ] Mejorar búsqueda JSON en Prisma para metadata
- [ ] Agregar índices adicionales si es necesario
- [ ] Optimizar queries para grandes volúmenes
- [ ] Implementar búsqueda full-text si es necesario

#### Paso 6.2: Caché y Rendimiento
- [ ] Implementar caché para consultas frecuentes
- [ ] Optimizar queries con select específicos
- [ ] Agregar paginación eficiente
- [ ] Implementar lazy loading en componentes

#### Paso 6.3: Archivo de Logs
- [ ] Crear script de archivo mensual
- [ ] Implementar migración a almacenamiento frío
- [ ] Crear endpoint para consultar logs archivados
- [ ] Documentar proceso de archivo

---

### FASE 7: Pruebas y Validación

#### Paso 7.1: Pruebas de Permisos
- [ ] Probar acceso de ADMIN a página global
- [ ] Verificar bloqueo de ODONT/RECEP a página global
- [ ] Probar acceso contextual de ODONT a paciente
- [ ] Probar acceso contextual de RECEP a citas
- [ ] Verificar ofuscación de datos sensibles

#### Paso 7.2: Pruebas de Funcionalidad
- [ ] Probar filtros avanzados en página global
- [ ] Probar exportación CSV con filtros
- [ ] Probar visualización de diff
- [ ] Probar paginación con grandes volúmenes
- [ ] Probar búsqueda de texto

#### Paso 7.3: Pruebas de Seguridad
- [ ] Intentar modificar logs (debe fallar)
- [ ] Intentar eliminar logs (debe fallar)
- [ ] Probar acceso no autorizado
- [ ] Probar rate limiting
- [ ] Verificar encriptación de datos

---

### FASE 8: Documentación y Monitoreo

#### Paso 8.1: Documentación de Usuario
- [ ] Crear guía para ADMIN sobre uso de `/audit-log`
- [ ] Crear guía para ODONT sobre historial contextual
- [ ] Crear guía para RECEP sobre historial de citas
- [ ] Crear FAQ de preguntas comunes

#### Paso 8.2: Documentación Técnica
- [ ] Documentar arquitectura completa
- [ ] Documentar APIs y endpoints
- [ ] Documentar políticas de seguridad
- [ ] Crear diagramas de flujo

#### Paso 8.3: Monitoreo y Alertas
- [ ] Configurar alertas para accesos no autorizados
- [ ] Configurar alertas para cambios críticos
- [ ] Crear dashboard de métricas de auditoría
- [ ] Documentar procedimientos de respuesta a incidentes

---

## 🎯 Prioridades de Implementación

### Alta Prioridad (Sprint 1)
1. ✅ Sistema RBAC básico
2. ✅ Endpoints con control de acceso
3. ✅ Página global para ADMIN
4. ⏳ Componentes contextuales para ODONT y RECEP

### Media Prioridad (Sprint 2)
1. ⏳ Verificaciones de ownership
2. ⏳ Inmutabilidad de logs
3. ⏳ Rate limiting
4. ⏳ Pruebas de seguridad

### Baja Prioridad (Sprint 3)
1. ⏳ Sistema de archivo
2. ⏳ Optimizaciones de rendimiento
3. ⏳ Documentación completa
4. ⏳ Monitoreo avanzado

---

## 📝 Notas de Implementación

### Consideraciones Importantes

1. **Verificación de Ownership**: Los endpoints contextuales necesitan verificar que:
   - ODONT solo vea consultas donde es el profesional asignado
   - RECEP solo vea citas donde está asignado/a

2. **Búsqueda en Metadata JSON**: Prisma tiene limitaciones para búsquedas complejas en JSON. Considerar:
   - Usar `path` y `string_contains` para búsquedas simples
   - Para búsquedas complejas, considerar índices adicionales o búsqueda full-text

3. **Inmutabilidad**: Implementar a nivel de:
   - Middleware de aplicación
   - Validaciones en Prisma (si es posible)
   - Políticas de base de datos (si es posible)

4. **Rate Limiting**: Configurar límites razonables:
   - ADMIN: 100 requests/minuto
   - ODONT/RECEP: 30 requests/minuto

---

## 🔍 Verificación de Completitud

### Checklist General
- [x] Documentación de arquitectura completa
- [x] Sistema RBAC implementado
- [x] Helpers de filtrado y ofuscación
- [x] Endpoints globales protegidos
- [x] Endpoints contextuales creados
- [ ] Componentes frontend contextuales
- [ ] Verificaciones de ownership
- [ ] Inmutabilidad implementada
- [ ] Rate limiting configurado
- [ ] Pruebas completas
- [ ] Documentación de usuario
- [ ] Monitoreo configurado

---

## 📚 Referencias

- Documento principal: `AUDIT_LOG_ARCHITECTURE_AND_ACCESS_CONTROL.md`
- Resumen de implementación: `AUDIT_LOG_IMPLEMENTATION_SUMMARY.md`
- Diseño UI: `AUDIT_LOG_DESIGN.md`

---

**Última actualización:** 2025-01-XX  
**Estado:** En progreso - Fase 4 pendiente

