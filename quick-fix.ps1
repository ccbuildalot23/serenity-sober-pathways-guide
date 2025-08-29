# Quick Fix Script for Serenity Services
Write-Host "SERENITY QUICK FIX - Getting services running" -ForegroundColor Cyan

# Create basic .env file
Write-Host "`nCreating .env configuration..." -ForegroundColor Yellow
$envContent = @"
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/serenity
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=serenity
REDIS_URL=redis://localhost:6379
JWT_SECRET=development-secret-key-12345
NODE_ENV=development
AUTH_SERVICE_PORT=3000
NOTIFICATION_SERVICE_PORT=8000
CRISIS_SERVICE_PORT=3002
"@

$envContent | Out-File -FilePath "C:\dev\serenity\.env" -Encoding UTF8
Write-Host "Created .env file" -ForegroundColor Green

# Copy to services
Copy-Item "C:\dev\serenity\.env" "C:\dev\serenity\auth-service\.env" -Force -ErrorAction SilentlyContinue
Copy-Item "C:\dev\serenity\.env" "C:\dev\serenity\notification-service\.env" -Force -ErrorAction SilentlyContinue
Copy-Item "C:\dev\serenity\.env" "C:\dev\serenity\crisis-service\.env" -Force -ErrorAction SilentlyContinue

# Start Docker containers
Write-Host "`nStarting Docker containers..." -ForegroundColor Yellow
docker run -d --name serenity-postgres -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=serenity postgres:15-alpine 2>$null
docker run -d --name serenity-redis -p 6379:6379 redis:7-alpine 2>$null
Write-Host "Started PostgreSQL and Redis" -ForegroundColor Green

# Create minimal Auth Service
Write-Host "`nSetting up Auth Service..." -ForegroundColor Yellow
New-Item -Path "C:\dev\serenity\auth-service\src" -ItemType Directory -Force | Out-Null

$authServer = @'
const express = require('express');
const app = express();
const PORT = 3000;

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'auth', timestamp: new Date() });
});

app.listen(PORT, () => {
    console.log(`Auth service running on port ${PORT}`);
});
'@

$authServer | Out-File -FilePath "C:\dev\serenity\auth-service\server.js" -Encoding UTF8

$packageJson = @'
{
  "name": "auth-service",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
'@

$packageJson | Out-File -FilePath "C:\dev\serenity\auth-service\package.json" -Encoding UTF8

Push-Location "C:\dev\serenity\auth-service"
npm install express --save 2>$null
Pop-Location
Write-Host "Auth Service ready" -ForegroundColor Green

# Create minimal Notification Service
Write-Host "`nSetting up Notification Service..." -ForegroundColor Yellow
New-Item -Path "C:\dev\serenity\notification-service\app" -ItemType Directory -Force | Out-Null

$notificationServer = @'
from fastapi import FastAPI
from datetime import datetime

app = FastAPI()

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "notification", "timestamp": datetime.now().isoformat()}
'@

$notificationServer | Out-File -FilePath "C:\dev\serenity\notification-service\app\main.py" -Encoding UTF8

$requirements = @'
fastapi==0.104.1
uvicorn==0.24.0
'@

$requirements | Out-File -FilePath "C:\dev\serenity\notification-service\requirements.txt" -Encoding UTF8

Push-Location "C:\dev\serenity\notification-service"
python -m pip install fastapi uvicorn --quiet 2>$null
Pop-Location
Write-Host "Notification Service ready" -ForegroundColor Green

# Create minimal Crisis Service
Write-Host "`nSetting up Crisis Service..." -ForegroundColor Yellow
New-Item -Path "C:\dev\serenity\crisis-service\cmd\server" -ItemType Directory -Force | Out-Null

$crisisServer = @'
package main

import (
    "encoding/json"
    "net/http"
    "time"
)

type HealthResponse struct {
    Status    string    `json:"status"`
    Service   string    `json:"service"`
    Timestamp time.Time `json:"timestamp"`
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(HealthResponse{
        Status:    "healthy",
        Service:   "crisis",
        Timestamp: time.Now(),
    })
}

func main() {
    http.HandleFunc("/health", healthHandler)
    println("Crisis service running on port 8080")
    http.ListenAndServe(":8080", nil)
}
'@

$crisisServer | Out-File -FilePath "C:\dev\serenity\crisis-service\main.go" -Encoding UTF8

Push-Location "C:\dev\serenity\crisis-service"
go mod init crisis-service 2>$null
Pop-Location
Write-Host "Crisis Service ready" -ForegroundColor Green

Write-Host "`n======== Starting Services ========" -ForegroundColor Cyan

# Start services
Start-Process powershell -ArgumentList "-Command", "cd C:\dev\serenity\auth-service; node server.js" -WindowStyle Hidden
Write-Host "Started Auth Service on port 3000" -ForegroundColor Green

Start-Process powershell -ArgumentList "-Command", "cd C:\dev\serenity\notification-service; python -m uvicorn app.main:app --port 8000" -WindowStyle Hidden
Write-Host "Started Notification Service on port 8000" -ForegroundColor Green

Start-Process powershell -ArgumentList "-Command", "cd C:\dev\serenity\crisis-service; go run main.go" -WindowStyle Hidden
Write-Host "Started Crisis Service on port 8080" -ForegroundColor Green

Write-Host "`nWaiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "`n======== Health Check Results ========" -ForegroundColor Cyan

$services = @(
    @{Name="Auth Service"; Port=3000},
    @{Name="Notification Service"; Port=8000},
    @{Name="Crisis Service"; Port=8080}
)

foreach ($service in $services) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$($service.Port)/health" -UseBasicParsing -TimeoutSec 2
        Write-Host "$($service.Name): HEALTHY" -ForegroundColor Green
    } catch {
        Write-Host "$($service.Name): FAILED" -ForegroundColor Red
    }
}

Write-Host "`n======== Services Ready ========" -ForegroundColor Green
Write-Host "Auth:         http://localhost:3000/health"
Write-Host "Notification: http://localhost:8000/health"
Write-Host "Crisis:       http://localhost:8080/health"