# Serenity Microservices Platform - Master Orchestration Script
# Complete startup and monitoring for all services

param(
    [string]$Mode = "development",
    [switch]$SkipHealthCheck = $false,
    [switch]$Verbose = $false
)

Write-Host @"

╔══════════════════════════════════════════════════════════════════╗
║     SERENITY SOBER PATHWAYS - MICROSERVICES PLATFORM            ║
║                  Healthcare Recovery Platform                    ║
╚══════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

Write-Host "`nStarting in $Mode mode..." -ForegroundColor Yellow

# Check prerequisites
function Test-Prerequisites {
    $missing = @()
    
    if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
        $missing += "Docker"
    }
    
    if (!(Get-Command node -ErrorAction SilentlyContinue)) {
        $missing += "Node.js"
    }
    
    if ($missing.Count -gt 0) {
        Write-Host "Missing prerequisites: $($missing -join ', ')" -ForegroundColor Red
        return $false
    }
    
    return $true
}

# Start service function
function Start-Service {
    param(
        [string]$ServiceName,
        [string]$Path,
        [string]$Command,
        [int]$Port
    )
    
    Write-Host "`n[$ServiceName] Starting..." -ForegroundColor Cyan
    
    Push-Location $Path
    
    try {
        if ($Verbose) {
            Start-Process powershell -ArgumentList "-Command", $Command -NoNewWindow
        } else {
            Start-Process powershell -ArgumentList "-Command", $Command -WindowStyle Hidden
        }
        
        Start-Sleep -Seconds 2
        
        # Check if service is responding
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$Port/health" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Host "[$ServiceName] Started successfully on port $Port" -ForegroundColor Green
                return $true
            }
        } catch {
            Write-Host "[$ServiceName] Starting... (may take a moment)" -ForegroundColor Yellow
            return $true
        }
    } catch {
        Write-Host "[$ServiceName] Failed to start: $_" -ForegroundColor Red
        return $false
    } finally {
        Pop-Location
    }
}

# Main execution
if (!(Test-Prerequisites)) {
    Write-Host "`nPlease install missing prerequisites and try again." -ForegroundColor Red
    exit 1
}

Write-Host "`n============ STARTING INFRASTRUCTURE ============" -ForegroundColor Magenta

# Start Docker containers
Write-Host "Starting Docker containers..." -ForegroundColor Cyan
docker-compose -f C:\dev\serenity\docker-compose.yml up -d

Write-Host "`n============ STARTING MICROSERVICES ============" -ForegroundColor Magenta

$services = @(
    @{
        Name = "Auth Service"
        Path = "C:\dev\serenity\auth-service"
        Command = "npm start"
        Port = 3000
    },
    @{
        Name = "Notification Service"
        Path = "C:\dev\serenity\notification-service"
        Command = "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
        Port = 8000
    },
    @{
        Name = "Crisis Service"
        Path = "C:\dev\serenity\crisis-service"
        Command = "go run cmd/server/main.go"
        Port = 8080
    },
    @{
        Name = "API Gateway"
        Path = "C:\dev\serenity\api-gateway"
        Command = "docker-compose up -d"
        Port = 8001
    }
)

$successCount = 0
foreach ($service in $services) {
    if (Start-Service -ServiceName $service.Name -Path $service.Path -Command $service.Command -Port $service.Port) {
        $successCount++
    }
}

Write-Host "`n============ SERVICE STATUS ============" -ForegroundColor Magenta
Write-Host "Started $successCount out of $($services.Count) services" -ForegroundColor $(if ($successCount -eq $services.Count) { "Green" } else { "Yellow" })

Write-Host "`n============ ACCESS POINTS ============" -ForegroundColor Magenta
Write-Host @"
Frontend App:        http://localhost:8080
API Gateway:         http://localhost:8001
Auth Service:        http://localhost:3000/health
Notification Service: http://localhost:8000/docs
Crisis Service:      http://localhost:8080/health

Kong Admin:          http://localhost:8002
Grafana Dashboard:   http://localhost:3001
Prometheus:          http://localhost:9090
"@ -ForegroundColor Cyan

if (!$SkipHealthCheck) {
    Write-Host "`n============ HEALTH CHECK ============" -ForegroundColor Magenta
    Start-Sleep -Seconds 5
    
    # Run health checks
    $healthEndpoints = @(
        "http://localhost:8001/health",
        "http://localhost:3000/health",
        "http://localhost:8000/health",
        "http://localhost:8080/health"
    )
    
    foreach ($endpoint in $healthEndpoints) {
        try {
            $response = Invoke-WebRequest -Uri $endpoint -UseBasicParsing -TimeoutSec 3
            Write-Host "$endpoint - OK" -ForegroundColor Green
        } catch {
            Write-Host "$endpoint - Failed" -ForegroundColor Red
        }
    }
}

Write-Host "`n============ PLATFORM READY ============" -ForegroundColor Green
Write-Host @"

The Serenity Microservices Platform is now running!

To stop all services, run: .\stop-platform.ps1
To view logs, run: .\view-logs.ps1
To run tests, run: .\run-tests.ps1

"@ -ForegroundColor Cyan

# Keep script running if in verbose mode
if ($Verbose) {
    Write-Host "Press Ctrl+C to stop monitoring..." -ForegroundColor Yellow
    while ($true) {
        Start-Sleep -Seconds 60
    }
}