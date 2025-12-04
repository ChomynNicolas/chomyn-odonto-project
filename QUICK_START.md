# Quick Start Guide - Database Configuration

## 🚀 Quick Setup

### For Development (Docker Database)

```bash
# 1. Start Docker database
npm run docker:up

# 2. Apply migrations
npm run db:migrate:dev

# 3. (Optional) Seed with test data
npm run db:seed:dev

# 4. Start development server
npm run dev
```

### For Production (Neon Database)

```bash
# 1. Ensure .env.production has correct Neon connection string

# 2. Apply migrations
npm run db:migrate:prod

# 3. Build and start
npm run build
npm run start
```

### For Testing (Docker Test Database)

```bash
# 1. Start test database
docker-compose --profile test up -d postgres-test

# 2. Apply migrations
npm run db:migrate:test

# 3. Run tests
npm run test
```

## 📋 Environment Files

- `.env.development` → Docker local database (port 5432)
- `.env.production` → Neon cloud database
- `.env.test` → Docker test database (port 5433)

## 🔧 Common Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (uses Docker DB) |
| `npm run docker:up` | Start Docker containers |
| `npm run docker:down` | Stop Docker containers |
| `npm run db:migrate:dev` | Run migrations on dev DB |
| `npm run db:studio:dev` | Open Prisma Studio for dev DB |
| `npm run db:migrate:prod` | Run migrations on production DB |

## ⚠️ Important Notes

1. **Development uses Docker** - Fast local database
2. **Production uses Neon** - Cloud database
3. **Never commit `.env.*` files** - They're in `.gitignore`
4. **Always test migrations** on dev/test before production

## 🐛 Troubleshooting

**Database not connecting?**
```bash
# Check Docker is running
docker ps

# Restart Docker
npm run docker:down
npm run docker:up
```

**Migrations failing?**
```bash
# Check migration status
npx prisma migrate status

# Reset dev database (WARNING: deletes data!)
npm run docker:reset
npm run db:migrate:dev
```

For more details, see [DATABASE_SETUP.md](./DATABASE_SETUP.md)

