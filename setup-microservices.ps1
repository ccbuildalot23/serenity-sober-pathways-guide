# Microservices Architecture Setup Script
# Serenity Sober Pathways - Complete Rebuild

Write-Host "🚀 SERENITY MICROSERVICES ARCHITECTURE SETUP" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$basePath = "C:\dev\serenity"

# Create directory structure
$directories = @(
    "auth-service",
    "auth-service\src",
    "auth-service\tests",
    "auth-service\config",
    "notification-service",
    "notification-service\src",
    "notification-service\tests",
    "notification-service\config",
    "crisis-service",
    "crisis-service\src",
    "crisis-service\tests",
    "crisis-service\config",
    "patient-service",
    "patient-service\src",
    "patient-service\tests",
    "patient-service\config",
    "frontend-app",
    "frontend-app\src",
    "frontend-app\public",
    "api-gateway",
    "api-gateway\config",
    "api-gateway\routes",
    "infrastructure",
    "infrastructure\terraform",
    "infrastructure\kubernetes",
    "infrastructure\docker",
    "infrastructure\aws",
    "shared-libs",
    "shared-libs\encryption",
    "shared-libs\validation",
    "shared-libs\logging",
    "shared-libs\auth",
    "monitoring",
    "monitoring\prometheus",
    "monitoring\grafana",
    "monitoring\elk",
    "monitoring\alerts",
    "scripts",
    "scripts\migration",
    "scripts\deployment",
    "scripts\testing",
    "swarm-configs",
    "bmad-orchestration",
    "bmad-orchestration\agents",
    "bmad-orchestration\swarms",
    "bmad-orchestration\configs"
)

Write-Host "`n📁 Creating directory structure..." -ForegroundColor Yellow

foreach ($dir in $directories) {
    $fullPath = Join-Path $basePath $dir
    if (!(Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "  Created: $dir" -ForegroundColor Green
    }
}

Write-Host "`n✅ Directory structure created successfully!" -ForegroundColor Green
Write-Host "`n📊 Structure Overview:" -ForegroundColor Yellow
Get-ChildItem $basePath -Directory | Format-Table Name, LastWriteTime -AutoSize

Write-Host "`n Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Initialize Git repositories for each service"
Write-Host "  2. Setup Docker Compose for local development"
Write-Host "  3. Configure swarm orchestration"
Write-Host "  4. Begin service extraction"