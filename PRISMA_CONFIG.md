# Configuración de Prisma por Ambiente

## 📋 Resumen

El schema de Prisma (`prisma/schema.prisma`) está configurado para leer `DATABASE_URL` de las variables de entorno. Los diferentes ambientes (desarrollo, producción, test) usan archivos `.env` separados que se cargan automáticamente según el ambiente.

## 🔧 Configuración del Schema

El schema de Prisma está configurado así:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Cómo funciona:**
- Prisma lee `DATABASE_URL` de las variables de entorno
- Los scripts de `package.json` usan `dotenv-cli` para cargar el archivo `.env` correcto
- El archivo se selecciona automáticamente según `NODE_ENV`

## 📁 Archivos de Configuración

### `.env.development`
```env
DATABASE_URL="postgresql://chomyn_dev:dev_password_seguro@localhost:5432/chomyn_odonto?schema=public"
```
**Uso:** Desarrollo local con Docker

### `.env.production`
```env
DATABASE_URL="postgresql://user:password@neon-host/neondb?sslmode=require"
```
**Uso:** Producción con Neon

### `.env.test`
```env
DATABASE_URL="postgresql://chomyn_test:test_password_seguro@localhost:5432/chomyn_odonto_test?schema=public"
```
**Uso:** Testing con Docker

## 🚀 Comandos de Prisma por Ambiente

### Desarrollo
```bash
# Migraciones
npm run db:migrate:dev

# Seed
npm run db:seed:dev

# Prisma Studio
npm run db:studio:dev

# Estado de migraciones
npm run db:status:dev
```

### Producción
```bash
# Migraciones
npm run db:migrate:prod

# Seed (usar con cuidado)
npm run db:seed:prod

# Prisma Studio
npm run db:studio:prod

# Estado de migraciones
npm run db:status:prod
```

### Testing
```bash
# Migraciones
npm run db:migrate:test

# Prisma Studio
npm run db:studio:test
```

## 🔍 Cómo Funciona Internamente

Cuando ejecutas un comando como `npm run db:migrate:dev`:

1. `cross-env` establece `NODE_ENV=development`
2. `dotenv -e .env.development` carga las variables de `.env.development`
3. `prisma migrate deploy` lee `DATABASE_URL` de las variables de entorno
4. Prisma se conecta a la base de datos correcta

## ✅ Verificación

Para verificar qué base de datos está usando Prisma:

```bash
# Desarrollo
npm run db:status:dev

# Producción
npm run db:status:prod
```

Esto mostrará el estado de las migraciones y confirmará la conexión a la base de datos correcta.

## ⚠️ Notas Importantes

1. **Nunca ejecutes migraciones de producción sin verificar primero**
   ```bash
   # Siempre verifica primero
   npm run db:status:prod
   ```

2. **El schema de Prisma es el mismo para todos los ambientes**
   - Solo cambia la URL de conexión
   - Las migraciones se aplican a la base de datos especificada en `DATABASE_URL`

3. **Prisma Client se genera una vez**
   ```bash
   npm run db:generate
   ```
   - Funciona con cualquier base de datos que tenga el mismo schema

4. **Para desarrollo, asegúrate de que Docker esté corriendo**
   ```bash
   npm run docker:up
   ```

## 🐛 Troubleshooting

### Error: "Can't reach database server"

**Desarrollo/Test:**
```bash
# Verifica que Docker esté corriendo
docker ps

# Inicia Docker si no está corriendo
npm run docker:up

# Espera unos segundos y verifica
npm run db:status:dev
```

**Producción:**
- Verifica que `.env.production` tenga la URL correcta de Neon
- Verifica que la base de datos Neon esté activa
- Verifica las credenciales

### Error: "Environment variable not found: DATABASE_URL"

```bash
# Verifica que el archivo .env existe
ls .env.development
ls .env.production

# Verifica que DATABASE_URL esté definido
cat .env.development | grep DATABASE_URL
```

### Migraciones no se aplican

```bash
# Verifica el estado
npm run db:status:dev

# Si hay problemas, resetea (solo desarrollo!)
npm run docker:reset
npm run db:migrate:dev
```

