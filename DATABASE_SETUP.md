# Database Configuration Guide

This guide explains how to configure and use different databases for development, testing, and production environments.

## Overview

The project uses environment-specific database configurations:

- **Development**: Docker PostgreSQL (local, fast)
- **Production**: Neon PostgreSQL (cloud)
- **Testing**: Docker PostgreSQL (local, isolated)

## Environment Files

### `.env.development`
Used when `NODE_ENV=development`. Points to local Docker database.

```env
DATABASE_URL="postgresql://chomyn_dev:dev_password_seguro@localhost:5432/chomyn_odonto?schema=public"
```

### `.env.production`
Used when `NODE_ENV=production`. Points to Neon cloud database.

```env
DATABASE_URL="postgresql://user:password@neon-host/neondb?sslmode=require"
```

### `.env.test`
Used when `NODE_ENV=test`. Points to local Docker test database.

```env
DATABASE_URL="postgresql://chomyn_test:test_password_seguro@localhost:5432/chomyn_odonto_test?schema=public"
```

## Setup Instructions

### 1. Initial Setup

```bash
# Copy environment template
cp .env.example .env.development
cp .env.example .env.production
cp .env.example .env.test

# Edit each file with appropriate values
# .env.development - Docker local config
# .env.production - Neon production config
# .env.test - Docker test config
```

### 2. Development Setup

```bash
# Start Docker database
npm run docker:up

# Wait for database to be ready (about 5 seconds)
# Then apply migrations
npm run db:migrate:dev

# (Optional) Seed with test data
npm run db:seed:dev

# Start development server
npm run dev
```

### 3. Production Setup

```bash
# Ensure .env.production has correct Neon connection string
# Apply migrations to production
npm run db:migrate:prod

# Build and start
npm run build
npm run start
```

### 4. Testing Setup

```bash
# Start test database (uses different port)
docker-compose --profile test up -d postgres-test

# Apply migrations to test database
npm run db:migrate:test

# Run tests
npm run test
```

## How It Works

### Next.js Environment Loading

Next.js automatically loads environment files based on `NODE_ENV`:
- `NODE_ENV=development` → loads `.env.development`
- `NODE_ENV=production` → loads `.env.production`
- `NODE_ENV=test` → loads `.env.test`

### Prisma Commands

Prisma reads `DATABASE_URL` from environment variables. The scripts set `NODE_ENV` which causes the correct `.env.*` file to be loaded.

## Available Scripts

### Development
- `npm run dev` - Start dev server (uses Docker DB)
- `npm run db:migrate:dev` - Run migrations on dev DB
- `npm run db:seed:dev` - Seed dev DB
- `npm run db:studio:dev` - Open Prisma Studio for dev DB

### Production
- `npm run build` - Build for production (uses Neon DB)
- `npm run start` - Start production server
- `npm run db:migrate:prod` - Run migrations on production DB
- `npm run db:seed:prod` - Seed production DB (use carefully!)

### Testing
- `npm run test` - Run tests (uses test DB)
- `npm run db:migrate:test` - Run migrations on test DB

### Docker Management
- `npm run docker:up` - Start Docker containers
- `npm run docker:down` - Stop Docker containers
- `npm run docker:logs` - View PostgreSQL logs
- `npm run docker:reset` - Reset containers and volumes

## Database URLs

### Development (Docker)
```
postgresql://chomyn_dev:dev_password_seguro@localhost:5432/chomyn_odonto?schema=public
```

### Production (Neon)
```
postgresql://user:password@neon-host/neondb?sslmode=require
```

### Test (Docker)
```
postgresql://chomyn_test:test_password_seguro@localhost:5432/chomyn_odonto_test?schema=public
```

## Troubleshooting

### Database Connection Errors

1. **Development/Test**: Ensure Docker is running
   ```bash
   docker ps  # Check if containers are running
   npm run docker:up  # Start if not running
   ```

2. **Production**: Verify Neon connection string
   - Check `.env.production` has correct credentials
   - Ensure Neon database is active
   - Verify SSL settings

### Migration Issues

If migrations fail:
```bash
# Check current migration status
npx prisma migrate status

# Reset database (development only!)
npm run docker:reset
npm run db:migrate:dev
```

### Environment Not Loading

Next.js loads `.env.*` files automatically. If variables aren't loading:
1. Check `NODE_ENV` is set correctly
2. Verify `.env.*` file exists
3. Restart the dev server

## Best Practices

1. **Never commit `.env.*` files** - They're in `.gitignore`
2. **Use `.env.example`** as a template for team members
3. **Separate databases** - Keep dev, test, and prod completely separate
4. **Backup production** - Regularly backup Neon database
5. **Test migrations** - Always test migrations on dev/test before production

## Switching Environments

To manually switch environments:

```bash
# Development
NODE_ENV=development npm run dev

# Production
NODE_ENV=production npm run build

# Test
NODE_ENV=test npm run test
```

The scripts in `package.json` handle this automatically.

