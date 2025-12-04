# Database Setup Script for Windows PowerShell
# Sets up the database for the current environment

param(
    [string]$Environment = $env:NODE_ENV
)

if (-not $Environment) {
    $Environment = "development"
}

Write-Host "🔧 Setting up database for environment: $Environment" -ForegroundColor Cyan

switch ($Environment) {
    "development" {
        Write-Host "📦 Starting Docker database..." -ForegroundColor Yellow
        docker-compose up -d postgres
        
        Write-Host "⏳ Waiting for database to be ready..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        
        Write-Host "🔄 Running migrations..." -ForegroundColor Yellow
        $env:NODE_ENV = "development"
        npx prisma migrate deploy
        
        Write-Host "✅ Development database ready!" -ForegroundColor Green
        Write-Host "   Connection: postgresql://chomyn_dev:dev_password_seguro@localhost:5432/chomyn_odonto" -ForegroundColor Gray
    }
    
    "test" {
        Write-Host "📦 Starting Docker database for testing..." -ForegroundColor Yellow
        docker-compose up -d postgres
        
        Write-Host "⏳ Waiting for database to be ready..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        
        Write-Host "🔄 Running migrations..." -ForegroundColor Yellow
        $env:NODE_ENV = "test"
        npx prisma migrate deploy
        
        Write-Host "✅ Test database ready!" -ForegroundColor Green
    }
    
    "production" {
        Write-Host "🌐 Using Neon production database..." -ForegroundColor Yellow
        Write-Host "🔄 Running migrations..." -ForegroundColor Yellow
        $env:NODE_ENV = "production"
        npx prisma migrate deploy
        
        Write-Host "✅ Production database migrations applied!" -ForegroundColor Green
    }
    
    default {
        Write-Host "❌ Unknown NODE_ENV: $Environment" -ForegroundColor Red
        exit 1
    }
}

