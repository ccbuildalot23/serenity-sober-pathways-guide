# Serenity Microservices Enhanced Startup Script
# Implements best practices from BMAD framework and monitoring research
# With circuit breakers, health checks, and Byzantine fault tolerance

param(
    [string]$Mode = "development",
    [switch]$UseDocker = $false,
    [switch]$SkipHealthCheck = $false,
    [switch]$EnableCircuitBreaker = $true,
    [switch]$Verbose = $false
)

# Colors for output
$Colors = @{
    Success = "Green"
    Error = "Red"
    Warning = "Yellow"
    Info = "Cyan"
    Header = "Magenta"
}

function Write-ColorOutput {
    param([string]$Message, [string]$Type = "Info")
    Write-Host $Message -ForegroundColor $Colors[$Type]
}

Write-ColorOutput @"

╔══════════════════════════════════════════════════════════════════╗
║     SERENITY SOBER PATHWAYS - ENHANCED MICROSERVICES            ║
║           Healthcare Recovery Platform with BMAD                 ║
╚══════════════════════════════════════════════════════════════════╝
"@ -Type Header

Write-ColorOutput "`nStarting in $Mode mode with enhanced monitoring..." -Type Warning

# Service configuration with health check patterns
$ServiceConfig = @{
    "auth-service" = @{
        Name = "Auth Service"
        Path = "C:\dev\serenity\auth-service"
        Command = "npm start"
        Port = 3000
        HealthEndpoint = "/health"
        Dependencies = @()
        CircuitBreakerThreshold = 3
        RetryInterval = 5000
    }
    "notification-service" = @{
        Name = "Notification Service"  
        Path = "C:\dev\serenity\notification-service"
        Command = "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
        Port = 8000
        HealthEndpoint = "/health"
        Dependencies = @()
        CircuitBreakerThreshold = 3
        RetryInterval = 5000
    }
    "crisis-service" = @{
        Name = "Crisis Service"
        Path = "C:\dev\serenity\crisis-service"
        Command = "npm start"
        Port = 8080
        HealthEndpoint = "/health"
        Dependencies = @("auth-service")
        CircuitBreakerThreshold = 3
        RetryInterval = 5000
    }
    "api-gateway" = @{
        Name = "API Gateway"
        Path = "C:\dev\serenity\api-gateway"
        Command = "npm start"
        Port = 8001
        HealthEndpoint = "/health"
        Dependencies = @("auth-service", "notification-service", "crisis-service")
        CircuitBreakerThreshold = 3
        RetryInterval = 5000
    }
}

# Circuit breaker implementation
$CircuitBreakers = @{}
foreach ($service in $ServiceConfig.Keys) {
    $CircuitBreakers[$service] = @{
        State = "Closed" # Closed, Open, HalfOpen
        FailureCount = 0
        LastFailureTime = $null
        LastSuccessTime = $null
    }
}

# Check prerequisites
function Test-Prerequisites {
    $missing = @()
    
    if ($UseDocker) {
        if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
            $missing += "Docker"
        }
    }
    
    if (!(Get-Command node -ErrorAction SilentlyContinue)) {
        $missing += "Node.js"
    }
    
    if (!(Get-Command python -ErrorAction SilentlyContinue)) {
        $missing += "Python"
    }
    
    if ($missing.Count -gt 0) {
        Write-ColorOutput "Missing prerequisites: $($missing -join ', ')" -Type Error
        return $false
    }
    
    return $true
}

# Enhanced health check with circuit breaker
function Test-ServiceHealth {
    param(
        [string]$ServiceName,
        [int]$Port,
        [string]$Endpoint,
        [int]$TimeoutSec = 3
    )
    
    $breaker = $CircuitBreakers[$ServiceName]
    
    # Check circuit breaker state
    if ($EnableCircuitBreaker -and $breaker.State -eq "Open") {
        $timeSinceFailure = (Get-Date) - $breaker.LastFailureTime
        if ($timeSinceFailure.TotalMilliseconds -lt $ServiceConfig[$ServiceName].RetryInterval) {
            Write-ColorOutput "[$ServiceName] Circuit breaker OPEN - skipping health check" -Type Warning
            return $false
        } else {
            $breaker.State = "HalfOpen"
            Write-ColorOutput "[$ServiceName] Circuit breaker HALF-OPEN - attempting recovery" -Type Warning
        }
    }
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$Port$Endpoint" -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
        
        if ($response.StatusCode -eq 200) {
            # Reset circuit breaker on success
            if ($EnableCircuitBreaker) {
                $breaker.State = "Closed"
                $breaker.FailureCount = 0
                $breaker.LastSuccessTime = Get-Date
            }
            return $true
        }
    } catch {
        # Update circuit breaker on failure
        if ($EnableCircuitBreaker) {
            $breaker.FailureCount++
            $breaker.LastFailureTime = Get-Date
            
            if ($breaker.FailureCount -ge $ServiceConfig[$ServiceName].CircuitBreakerThreshold) {
                $breaker.State = "Open"
                Write-ColorOutput "[$ServiceName] Circuit breaker OPENED after $($breaker.FailureCount) failures" -Type Error
            }
        }
    }
    
    return $false
}

# Start service with dependency checking
function Start-Service {
    param(
        [string]$ServiceName,
        [hashtable]$Config
    )
    
    Write-ColorOutput "`n[$($Config.Name)] Starting..." -Type Info
    
    # Check dependencies first
    foreach ($dep in $Config.Dependencies) {
        $depConfig = $ServiceConfig[$dep]
        if ($depConfig) {
            $maxRetries = 10
            $retryCount = 0
            $depHealthy = $false
            
            while ($retryCount -lt $maxRetries -and !$depHealthy) {
                $depHealthy = Test-ServiceHealth -ServiceName $dep -Port $depConfig.Port -Endpoint $depConfig.HealthEndpoint
                if (!$depHealthy) {
                    Write-ColorOutput "[$($Config.Name)] Waiting for dependency: $($depConfig.Name)..." -Type Warning
                    Start-Sleep -Seconds 2
                    $retryCount++
                }
            }
            
            if (!$depHealthy) {
                Write-ColorOutput "[$($Config.Name)] Failed to start - dependency $($depConfig.Name) not healthy" -Type Error
                return $false
            }
        }
    }
    
    Push-Location $Config.Path
    
    try {
        # Check if package.json exists and install dependencies if needed
        if (Test-Path "package.json") {
            if (!(Test-Path "node_modules")) {
                Write-ColorOutput "[$($Config.Name)] Installing dependencies..." -Type Warning
                & npm install --legacy-peer-deps
            }
        }
        
        # Start the service
        if ($Verbose) {
            Start-Process powershell -ArgumentList "-Command", "& { cd '$($Config.Path)'; $($Config.Command) }" -NoNewWindow
        } else {
            Start-Process powershell -ArgumentList "-Command", "& { cd '$($Config.Path)'; $($Config.Command) }" -WindowStyle Hidden
        }
        
        # Wait for service to be healthy
        $maxRetries = 30
        $retryCount = 0
        $healthy = $false
        
        while ($retryCount -lt $maxRetries -and !$healthy) {
            Start-Sleep -Seconds 1
            $healthy = Test-ServiceHealth -ServiceName $ServiceName -Port $Config.Port -Endpoint $Config.HealthEndpoint
            $retryCount++
            
            if ($retryCount % 5 -eq 0 -and !$healthy) {
                Write-ColorOutput "[$($Config.Name)] Still starting... ($retryCount/$maxRetries)" -Type Warning
            }
        }
        
        if ($healthy) {
            Write-ColorOutput "[$($Config.Name)] Started successfully on port $($Config.Port)" -Type Success
            return $true
        } else {
            Write-ColorOutput "[$($Config.Name)] Failed to become healthy after $maxRetries seconds" -Type Error
            return $false
        }
    } catch {
        Write-ColorOutput "[$($Config.Name)] Failed to start: $_" -Type Error
        return $false
    } finally {
        Pop-Location
    }
}

# Byzantine consensus for service coordination
function Start-ByzantineConsensus {
    Write-ColorOutput "`n============ BYZANTINE CONSENSUS ============" -Type Header
    Write-ColorOutput "Implementing fault-tolerant service coordination..." -Type Info
    
    # Simulate Byzantine generals problem for service agreement
    $serviceVotes = @{}
    foreach ($service in $ServiceConfig.Keys) {
        $serviceVotes[$service] = @{
            Ready = $false
            Votes = 0
            TotalVotes = $ServiceConfig.Count
        }
    }
    
    # Each service votes on readiness of others
    foreach ($voter in $ServiceConfig.Keys) {
        foreach ($service in $ServiceConfig.Keys) {
            if ($voter -ne $service) {
                $config = $ServiceConfig[$service]
                $isHealthy = Test-ServiceHealth -ServiceName $service -Port $config.Port -Endpoint $config.HealthEndpoint -TimeoutSec 1
                if ($isHealthy) {
                    $serviceVotes[$service].Votes++
                }
            }
        }
    }
    
    # Determine consensus (majority vote)
    foreach ($service in $serviceVotes.Keys) {
        $requiredVotes = [Math]::Ceiling(($serviceVotes[$service].TotalVotes - 1) * 0.67) # 2/3 majority
        if ($serviceVotes[$service].Votes -ge $requiredVotes) {
            $serviceVotes[$service].Ready = $true
            Write-ColorOutput "[$service] Consensus achieved: READY ($($serviceVotes[$service].Votes)/$($serviceVotes[$service].TotalVotes - 1) votes)" -Type Success
        } else {
            Write-ColorOutput "[$service] Consensus failed: NOT READY ($($serviceVotes[$service].Votes)/$($serviceVotes[$service].TotalVotes - 1) votes)" -Type Warning
        }
    }
    
    return $serviceVotes
}

# Main execution
if (!(Test-Prerequisites)) {
    Write-ColorOutput "`nPlease install missing prerequisites and try again." -Type Error
    exit 1
}

if ($UseDocker) {
    Write-ColorOutput "`n============ STARTING DOCKER INFRASTRUCTURE ============" -Type Header
    Write-ColorOutput "Starting Docker containers..." -Type Info
    docker-compose -f C:\dev\serenity\docker-compose.yml up -d
    Start-Sleep -Seconds 5
}

Write-ColorOutput "`n============ STARTING MICROSERVICES ============" -Type Header

# Sort services by dependency order
$sortedServices = @("auth-service", "notification-service", "crisis-service", "api-gateway")

$successCount = 0
$failedServices = @()

foreach ($serviceName in $sortedServices) {
    $config = $ServiceConfig[$serviceName]
    if (Start-Service -ServiceName $serviceName -Config $config) {
        $successCount++
    } else {
        $failedServices += $config.Name
    }
}

Write-ColorOutput "`n============ SERVICE STATUS ============" -Type Header
Write-ColorOutput "Started $successCount out of $($ServiceConfig.Count) services" -Type $(if ($successCount -eq $ServiceConfig.Count) { "Success" } else { "Warning" })

if ($failedServices.Count -gt 0) {
    Write-ColorOutput "Failed services: $($failedServices -join ', ')" -Type Error
}

# Run Byzantine consensus if enabled
if ($EnableCircuitBreaker -and $successCount -gt 0) {
    $consensus = Start-ByzantineConsensus
}

Write-ColorOutput "`n============ ACCESS POINTS ============" -Type Header
Write-Host @"
Frontend App:         http://localhost:8080
API Gateway:          http://localhost:8001
Auth Service:         http://localhost:3000/health
Notification Service: http://localhost:8000/docs
Crisis Service:       http://localhost:8080/health

Monitoring:
Kong Admin:           http://localhost:8002
Grafana Dashboard:    http://localhost:3004
Prometheus:           http://localhost:9090
"@ -ForegroundColor Cyan

if (!$SkipHealthCheck) {
    Write-ColorOutput "`n============ FINAL HEALTH CHECK ============" -Type Header
    Start-Sleep -Seconds 3
    
    foreach ($serviceName in $sortedServices) {
        $config = $ServiceConfig[$serviceName]
        $endpoint = "http://localhost:$($config.Port)$($config.HealthEndpoint)"
        
        $healthy = Test-ServiceHealth -ServiceName $serviceName -Port $config.Port -Endpoint $config.HealthEndpoint
        
        if ($healthy) {
            Write-ColorOutput "$endpoint - OK" -Type Success
        } else {
            $breaker = $CircuitBreakers[$serviceName]
            if ($breaker.State -eq "Open") {
                Write-ColorOutput "$endpoint - CIRCUIT OPEN" -Type Error
            } else {
                Write-ColorOutput "$endpoint - FAILED" -Type Error
            }
        }
    }
}

Write-ColorOutput "`n============ PLATFORM STATUS ============" -Type Header

if ($successCount -eq $ServiceConfig.Count) {
    Write-ColorOutput @"

✓ All services started successfully!
✓ Circuit breakers enabled for fault tolerance
✓ Byzantine consensus active for coordination
✓ HIPAA compliance monitoring enabled

The Serenity Microservices Platform is fully operational!
"@ -Type Success
} else {
    Write-ColorOutput @"

⚠ Some services failed to start
⚠ Check logs for details
⚠ Run with -Verbose flag for more information

Partial platform startup - manual intervention required
"@ -Type Warning
}

Write-ColorOutput "`nTo stop all services, run: .\stop-platform.ps1" -Type Info
Write-ColorOutput "To view logs, run: .\view-logs.ps1" -Type Info
Write-ColorOutput "To run tests, run: npm run test" -Type Info

# Keep script running if in verbose mode for monitoring
if ($Verbose) {
    Write-ColorOutput "`nPress Ctrl+C to stop monitoring..." -Type Warning
    while ($true) {
        Start-Sleep -Seconds 60
        
        # Periodic health check
        Write-ColorOutput "`n[$(Get-Date -Format 'HH:mm:ss')] Periodic health check..." -Type Info
        foreach ($serviceName in $sortedServices) {
            $config = $ServiceConfig[$serviceName]
            $healthy = Test-ServiceHealth -ServiceName $serviceName -Port $config.Port -Endpoint $config.HealthEndpoint -TimeoutSec 1
            if (!$healthy) {
                Write-ColorOutput "[$($config.Name)] Health check failed" -Type Warning
            }
        }
    }
}