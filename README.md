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

