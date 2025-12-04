#!/bin/bash
# Database Setup Script
# Sets up the database for the current environment

set -e

NODE_ENV=${NODE_ENV:-development}

echo "🔧 Setting up database for environment: $NODE_ENV"

case $NODE_ENV in
  development)
    echo "📦 Starting Docker database..."
    docker-compose up -d postgres
    
    echo "⏳ Waiting for database to be ready..."
    sleep 5
    
    echo "🔄 Running migrations..."
    NODE_ENV=development npx prisma migrate deploy
    
    echo "✅ Development database ready!"
    echo "   Connection: postgresql://chomyn_dev:dev_password_seguro@localhost:5432/chomyn_odonto"
    ;;
    
  test)
    echo "📦 Starting Docker database for testing..."
    docker-compose up -d postgres
    
    echo "⏳ Waiting for database to be ready..."
    sleep 5
    
    echo "🔄 Running migrations..."
    NODE_ENV=test npx prisma migrate deploy
    
    echo "✅ Test database ready!"
    ;;
    
  production)
    echo "🌐 Using Neon production database..."
    echo "🔄 Running migrations..."
    NODE_ENV=production npx prisma migrate deploy
    
    echo "✅ Production database migrations applied!"
    ;;
    
  *)
    echo "❌ Unknown NODE_ENV: $NODE_ENV"
    exit 1
    ;;
esac

