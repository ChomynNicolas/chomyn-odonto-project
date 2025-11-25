# Resumen del Proyecto - Sistema Chomyn Odontología

## 📋 Descripción General

**Chomyn Odontología** es un sistema web clínico completo para la gestión de consultorios odontológicos. Incluye gestión de pacientes, agenda de citas, historial clínico, odontogramas, procedimientos, diagnósticos, anamnesis y sistema de auditoría completo.

**Versión:** 1.0.1  
**Tipo:** Sistema Web Clínico (SaaS)

---

## 🏗️ Arquitectura de Programación

### Stack Principal
- **Framework:** Next.js 15.5.4 (App Router)
- **Lenguaje:** TypeScript 5.x
- **Runtime:** Node.js 18+
- **Paradigma:** Full-stack React con Server Components y Client Components

### Patrón Arquitectónico
- **Arquitectura:** Monolítica modular con separación de responsabilidades
- **Rendering:** Híbrido (SSR + CSR)
  - Server Components para datos iniciales
  - Client Components para interactividad
- **API:** RESTful API Routes (Next.js API Routes)
- **Base de Datos:** ORM con Prisma (PostgreSQL)

### Estructura de Carpetas
```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Rutas protegidas del dashboard
│   ├── (admin)/            # Rutas de administración
│   ├── (public)/           # Rutas públicas
│   └── api/                # API Routes (REST)
├── components/             # Componentes React reutilizables
│   ├── ui/                 # Componentes base (shadcn/ui)
│   ├── pacientes/          # Componentes específicos de pacientes
│   ├── agenda/             # Componentes de agenda
│   └── ...
├── lib/                    # Utilidades y servicios
│   ├── api/                # Clientes API
│   ├── services/           # Lógica de negocio
│   ├── validation/         # Validaciones
│   └── utils/              # Utilidades generales
├── hooks/                  # Custom React Hooks
├── context/                # React Context Providers
├── types/                  # TypeScript type definitions
└── utils/                  # Utilidades adicionales
```

---

## 🛠️ Tecnologías y Bibliotecas Principales

### Frontend Core
- **React 19.0.0** - Biblioteca UI
- **Next.js 15.5.4** - Framework React con App Router
- **TypeScript 5.x** - Tipado estático

### UI y Estilos
- **Tailwind CSS 4.0.0** - Framework CSS utility-first
- **shadcn/ui** - Componentes UI basados en Radix UI
- **Radix UI** - Componentes primitivos accesibles
  - `@radix-ui/react-dialog`
  - `@radix-ui/react-dropdown-menu`
  - `@radix-ui/react-select`
  - `@radix-ui/react-tabs`
  - Y muchos más...
- **Lucide React** - Iconos
- **React Icons** - Iconos adicionales
- **class-variance-authority** - Variantes de componentes
- **clsx** + **tailwind-merge** - Utilidades para clases CSS

### Gestión de Estado y Datos
- **@tanstack/react-query 5.90.5** - Gestión de estado del servidor (caché, sincronización)
- **SWR 2.3.6** - Data fetching con caché (usado en paralelo con React Query)
- **Zustand 5.0.8** - Estado global ligero (cuando se necesita)
- **React Context API** - Estado compartido (Theme, Sidebar, PatientData)

### Formularios y Validación
- **React Hook Form 7.65.0** - Gestión de formularios
- **Zod 4.1.12** - Validación de esquemas TypeScript-first
- **@hookform/resolvers** - Integración Zod + React Hook Form

### Calendario y Fechas
- **@fullcalendar/react 6.1.15** - Calendario completo
  - `@fullcalendar/daygrid`
  - `@fullcalendar/timegrid`
  - `@fullcalendar/interaction`
  - `@fullcalendar/list`
- **date-fns 4.1.0** - Manipulación de fechas
- **date-fns-tz 3.2.0** - Zonas horarias
- **flatpickr 4.6.13** - Selector de fechas

### Gráficos y Visualización
- **ApexCharts 4.3.0** - Gráficos interactivos
- **react-apexcharts 1.7.0** - Wrapper React para ApexCharts
- **@react-jvectormap** - Mapas vectoriales

### Base de Datos y ORM
- **Prisma 6.18.0** - ORM TypeScript
- **@prisma/client 6.18.0** - Cliente Prisma
- **PostgreSQL** - Base de datos relacional

### Autenticación
- **NextAuth.js 5.0.0-beta.29** - Autenticación completa
- **bcryptjs 3.0.2** - Hashing de contraseñas

### Uploads y Archivos
- **Cloudinary 2.8.0** - Gestión de imágenes y archivos
- **react-dropzone 14.3.5** - Drag & drop de archivos

### Notificaciones
- **Sonner 2.0.7** - Toast notifications

### Utilidades
- **cmdk 1.1.1** - Command palette
- **next-themes 0.4.6** - Tema claro/oscuro
- **react-dnd** - Drag and drop
- **swiper 11.2.0** - Carousels y sliders
- **@tanstack/react-virtual** - Virtualización de listas

### Desarrollo
- **ESLint 9** - Linter
- **Prettier** - Formateador de código
- **@faker-js/faker** - Datos de prueba
- **tsx** - Ejecutor TypeScript

---

## 🎨 Sistema de Estilos

### Framework CSS
- **Tailwind CSS 4.0.0** (última versión)
- **PostCSS** con `@tailwindcss/postcss`
- **Configuración:** Sin archivo `tailwind.config.ts` (usa CSS nativo de Tailwind v4)

### Paleta de Colores
El sistema usa un sistema de diseño completo con variables CSS personalizadas:

#### Colores Principales
- **Brand (Azul):** `brand-50` a `brand-950` (color principal: `#465fff`)
- **Gray:** `gray-25` a `gray-950` (escala completa)
- **Success (Verde):** `success-50` a `success-950`
- **Error (Rojo):** `error-50` a `error-950`
- **Warning (Amarillo):** `warning-50` a `warning-950`
- **Orange:** `orange-50` a `orange-950`
- **Blue Light:** `blue-light-50` a `blue-light-950`

#### Tema Claro/Oscuro
- Soporte completo para modo oscuro
- Variables CSS con `oklch()` para mejor consistencia de color
- Clase `.dark` para activar modo oscuro

### Tipografía
- **Fuente Principal:** Outfit (Google Fonts)
- **Tamaños de Texto Personalizados:**
  - `text-title-2xl` (72px)
  - `text-title-xl` (60px)
  - `text-title-lg` (48px)
  - `text-title-md` (36px)
  - `text-title-sm` (30px)
  - `text-theme-xl` (20px)
  - `text-theme-sm` (14px)
  - `text-theme-xs` (12px)

### Breakpoints Responsive
```css
--breakpoint-2xsm: 375px
--breakpoint-xsm: 425px
--breakpoint-sm: 640px
--breakpoint-md: 768px
--breakpoint-lg: 1024px
--breakpoint-xl: 1280px
--breakpoint-2xl: 1536px
--breakpoint-3xl: 2000px
```

### Sombras (Shadows)
- `shadow-theme-xs` - Sombra extra pequeña
- `shadow-theme-sm` - Sombra pequeña
- `shadow-theme-md` - Sombra media
- `shadow-theme-lg` - Sombra grande
- `shadow-theme-xl` - Sombra extra grande

### Utilidades CSS Personalizadas
- `menu-item` - Estilos para items de menú
- `menu-item-active` / `menu-item-inactive` - Estados de menú
- `no-scrollbar` - Oculta scrollbars
- `custom-scrollbar` - Scrollbar personalizado
- `section-general`, `section-medical`, etc. - Fondos para secciones

### Estilos de Componentes de Terceros
- **FullCalendar:** Estilos personalizados en `globals.css`
- **Flatpickr:** Tema personalizado integrado
- **ApexCharts:** Estilos adaptados al tema claro/oscuro
- **Swiper:** Navegación y paginación personalizadas

### Convenciones de Estilos
1. **Utility-First:** Usar clases de Tailwind en lugar de CSS custom
2. **Variables CSS:** Usar variables del tema para colores
3. **Dark Mode:** Siempre considerar modo oscuro con `dark:` prefix
4. **Responsive:** Mobile-first approach
5. **Consistencia:** Usar utilidades del sistema de diseño

---

## 🗄️ Base de Datos

### ORM
- **Prisma** - ORM TypeScript con type-safety completo

### Base de Datos
- **PostgreSQL** - Base de datos relacional

### Modelos Principales
- **Usuario** - Usuarios del sistema con roles
- **Rol** - Roles (ADMIN, ODONT, RECEP)
- **Persona** - Datos personales base
- **Paciente** - Pacientes del consultorio
- **Profesional** - Profesionales de la salud
- **Cita** - Citas/agenda
- **Consulta** - Consultas clínicas
- **OdontogramSnapshot** - Versiones de odontogramas
- **PeriodontogramSnapshot** - Versiones de periodontogramas
- **PatientAnamnesis** - Anamnesis de pacientes
- **PatientDiagnosis** - Diagnósticos
- **PatientAllergy** - Alergias
- **PatientMedication** - Medicaciones
- **TreatmentPlan** - Planes de tratamiento
- **Procedimiento** - Procedimientos realizados
- **AuditLog** - Logs de auditoría
- Y muchos más...

### Migraciones
- Sistema de migraciones de Prisma
- Historial completo en `prisma/migrations/`

---

## 🔐 Autenticación y Autorización

### Autenticación
- **NextAuth.js v5** (beta)
- **Estrategia:** JWT (JSON Web Tokens)
- **Provider:** Credentials (usuario/contraseña)
- **Hashing:** bcryptjs para contraseñas

### Roles del Sistema
- **ADMIN** - Administrador completo
- **ODONT** - Odontólogo
- **RECEP** - Recepcionista

### Middleware
- Protección de rutas en `src/middleware.ts`
- Redirección automática a `/signin` si no hay sesión
- Rutas públicas: `/signin`, `/api/auth/*`

### RBAC (Role-Based Access Control)
- Sistema de permisos basado en roles
- Implementado en `src/lib/rbac/`

---

## 📊 Gestión de Estado

### Estrategia Híbrida
El proyecto usa múltiples estrategias según el caso:

1. **React Query (@tanstack/react-query)**
   - Para datos del servidor
   - Caché automático
   - Sincronización en background
   - Configuración: `staleTime: 30s`, `gcTime: 5min`

2. **SWR**
   - Usado en paralelo con React Query
   - Para datos que requieren revalidación frecuente
   - Configuración: `dedupingInterval: 60s`

3. **React Context**
   - `ThemeContext` - Tema claro/oscuro
   - `SidebarContext` - Estado del sidebar
   - `PatientDataContext` - Datos del paciente actual

4. **Zustand**
   - Para estado global ligero cuando se necesita
   - No es el método principal

5. **URL State**
   - Para filtros y búsquedas (query params)
   - Ejemplo: `usePacientesFilters`

### Hooks Personalizados
- `usePacientesQuery` - Listado de pacientes
- `usePacienteDetailQuery` - Detalle de paciente
- `useCitasCalendarSource` - Datos del calendario
- `useAnamnesisConfig` - Configuración de anamnesis
- Y muchos más en `src/hooks/`

---

## 🔌 API y Endpoints

### Estructura de API
- **Rutas:** `/api/*` (Next.js API Routes)
- **Métodos:** RESTful (GET, POST, PUT, PATCH, DELETE)
- **Formato:** JSON

### Endpoints Principales

#### Pacientes
- `GET /api/pacientes` - Listado con filtros
- `GET /api/pacientes/[id]` - Detalle completo
- `POST /api/pacientes` - Crear paciente
- `PATCH /api/pacientes/[id]` - Actualizar
- `GET /api/pacientes/[id]/historia` - Historia clínica
- `GET /api/pacientes/[id]/odontograma` - Odontograma actual

#### Agenda
- `GET /api/agenda/citas` - Listado de citas
- `POST /api/agenda/citas` - Crear cita
- `PATCH /api/agenda/citas/[id]/estado` - Cambiar estado
- `PUT /api/agenda/citas/[id]/reprogramar` - Reprogramar
- `GET /api/agenda/disponibilidad` - Slots disponibles

#### Anamnesis
- `GET /api/anamnesis/[pacienteId]` - Obtener anamnesis
- `POST /api/anamnesis` - Crear/actualizar
- `GET /api/anamnesis-config` - Configuración

#### Procedimientos
- `POST /api/agenda/citas/[id]/procedimientos` - Registrar procedimiento
- `GET /api/procedimientos/[id]` - Detalle
- `PATCH /api/procedimientos/[id]` - Actualizar

#### Adjuntos
- `POST /api/adjuntos` - Subir archivo
- `GET /api/adjuntos/[id]` - Obtener
- `DELETE /api/adjuntos/[id]` - Eliminar

#### Auditoría
- `GET /api/audit` - Logs de auditoría

---

## 📁 Convenciones y Patrones

### Nomenclatura
- **Componentes:** PascalCase (`PatientHeader.tsx`)
- **Hooks:** camelCase con prefijo `use` (`usePacienteDetailQuery.ts`)
- **Utilidades:** camelCase (`format.ts`, `date-utils.ts`)
- **Tipos:** PascalCase (`PatientRecord`, `CitaEstado`)
- **Constantes:** UPPER_SNAKE_CASE

### Estructura de Componentes
```tsx
// 1. Imports
import { ... } from "..."

// 2. Types/Interfaces
interface ComponentProps { ... }

// 3. Component
export function Component({ ... }: ComponentProps) {
  // Hooks
  // State
  // Effects
  // Handlers
  // Render
  return (...)
}
```

### API Routes
- Separación de lógica en `_service.ts` o `_lib/`
- Validación con Zod
- Manejo de errores consistente
- Respuestas tipadas

### Validación
- **Zod** para esquemas de validación
- Validación en cliente (React Hook Form + Zod)
- Validación en servidor (API routes)

### Manejo de Errores
- Try-catch en funciones async
- Respuestas de error tipadas
- Logging de errores

### TypeScript
- **Strict mode** activado
- Tipos explícitos (evitar `any`)
- Interfaces para props y datos
- Tipos compartidos en `src/types/`

---

## 🚀 Scripts y Comandos

```bash
# Desarrollo
pnpm dev              # Servidor de desarrollo

# Producción
pnpm build            # Build de producción
pnpm start            # Servidor de producción

# Base de Datos
pnpm prisma generate  # Generar cliente Prisma
pnpm prisma migrate   # Ejecutar migraciones
pnpm db:seed         # Poblar base de datos

# Linting
pnpm lint             # Ejecutar ESLint
```

---

## 🔧 Configuración

### Variables de Entorno
- `DATABASE_URL` - URL de PostgreSQL
- `NEXTAUTH_SECRET` - Secret para NextAuth
- `NEXTAUTH_URL` - URL base de la aplicación
- `CLOUDINARY_*` - Configuración de Cloudinary

### Archivos de Configuración
- `next.config.ts` - Configuración de Next.js
- `tsconfig.json` - Configuración de TypeScript
- `postcss.config.js` - Configuración de PostCSS
- `components.json` - Configuración de shadcn/ui
- `prisma/schema.prisma` - Schema de base de datos

---

## 📝 Características Principales

### Módulos del Sistema
1. **Gestión de Pacientes**
   - CRUD completo
   - Búsqueda y filtros
   - Historial clínico
   - Documentos y adjuntos

2. **Agenda y Citas**
   - Calendario interactivo (FullCalendar)
   - Creación, edición, cancelación
   - Reprogramación
   - Estados de citas
   - Disponibilidad y bloqueos

3. **Historia Clínica**
   - Anamnesis completa
   - Diagnósticos
   - Alergias y medicaciones
   - Odontogramas versionados
   - Periodontogramas

4. **Procedimientos**
   - Registro de procedimientos
   - Asociación a citas
   - Adjuntos multimedia
   - Catálogos de procedimientos

5. **Auditoría**
   - Logs completos de cambios
   - Trazabilidad de acciones
   - Historial de versiones

6. **Administración**
   - Gestión de usuarios
   - Configuración del sistema
   - Catálogos (procedimientos, diagnósticos, etc.)

---

## 🎯 Principios de Desarrollo

1. **Type Safety:** TypeScript estricto en todo el proyecto
2. **Component Reusability:** Componentes reutilizables y modulares
3. **Server-First:** Priorizar Server Components cuando sea posible
4. **Performance:** Optimización de renders y carga de datos
5. **Accessibility:** Componentes accesibles (Radix UI)
6. **Maintainability:** Código limpio y bien organizado
7. **Security:** Validación en cliente y servidor
8. **Audit Trail:** Trazabilidad completa de cambios

---

## 📚 Recursos Adicionales

- **Documentación Next.js:** https://nextjs.org/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **shadcn/ui:** https://ui.shadcn.com
- **React Query:** https://tanstack.com/query
- **Zod:** https://zod.dev

---

**Última actualización:** Diciembre 2024  
**Versión del documento:** 1.0

