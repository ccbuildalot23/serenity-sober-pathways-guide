# Docker Build and Security Scan Script for Serenity
# PowerShell script for Windows/WSL environments

param(
    [string]$Environment = "dev",
    [switch]$SecurityScan = $false,
    [switch]$Push = $false,
    [string]$Registry = "serenity.azurecr.io",
    [string]$Version = "latest"
)

$ErrorActionPreference = "Stop"

# Color functions for output
function Write-ColoredOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Write-Success { param([string]$Message) Write-ColoredOutput $Message "Green" }
function Write-Error { param([string]$Message) Write-ColoredOutput $Message "Red" }
function Write-Info { param([string]$Message) Write-ColoredOutput $Message "Cyan" }
function Write-Warning { param([string]$Message) Write-ColoredOutput $Message "Yellow" }

# Build configuration
$BuildConfig = @{
    "dev" = @{
        "target" = "dev"
        "push" = $false
        "scan" = $false
    }
    "test" = @{
        "target" = "dev"
        "push" = $false
        "scan" = $true
    }
    "prod" = @{
        "target" = "production"
        "push" = $true
        "scan" = $true
    }
}

$Services = @(
    @{ name = "api-gateway"; path = "./api-gateway"; port = 3003 }
    @{ name = "auth-service"; path = "./auth-service"; port = 3000 }
    @{ name = "notification-service"; path = "./notification-service"; port = 8000; type = "python" }
    @{ name = "crisis-service"; path = "./crisis-service"; port = 3002 }
    @{ name = "patient-portal"; path = "./patient-portal"; port = 8081 }
    @{ name = "frontend-app"; path = "./frontend-app"; port = 8080 }
)

Write-Info "🚀 Starting Serenity Docker Build Process"
Write-Info "Environment: $Environment"
Write-Info "Version: $Version"
Write-Info "Security Scan: $($SecurityScan -or $BuildConfig[$Environment].scan)"
Write-Info "Push to Registry: $($Push -or $BuildConfig[$Environment].push)"

# Check prerequisites
Write-Info "📋 Checking prerequisites..."

if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "❌ Docker is not installed or not in PATH"
    exit 1
}

if (!(Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Error "❌ Docker Compose is not installed or not in PATH"
    exit 1
}

# Check if Trivy is available for security scanning
$TrivyAvailable = $false
if (Get-Command trivy -ErrorAction SilentlyContinue) {
    $TrivyAvailable = $true
    Write-Success "✅ Trivy security scanner found"
} else {
    Write-Warning "⚠️  Trivy not found - security scanning will be limited"
}

# Function to build a service
function Build-Service {
    param($Service)
    
    $serviceName = $Service.name
    $servicePath = $Service.path
    $target = $BuildConfig[$Environment].target
    
    Write-Info "🔨 Building $serviceName..."
    
    # Create build context
    Push-Location $servicePath
    
    try {
        # Build the image
        $imageTag = "$Registry/serenity-$serviceName`:$Version"
        
        $buildArgs = @(
            "build",
            "--target", $target,
            "--tag", $imageTag,
            "--tag", "serenity-$serviceName`:latest",
            "--build-arg", "BUILD_DATE=$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')",
            "--build-arg", "VERSION=$Version",
            "--build-arg", "ENVIRONMENT=$Environment"
        )
        
        # Add platform for cross-platform builds
        if ($Environment -eq "prod") {
            $buildArgs += @("--platform", "linux/amd64,linux/arm64")
        }
        
        $buildArgs += "."
        
        Write-Info "Executing: docker $($buildArgs -join ' ')"
        & docker @buildArgs
        
        if ($LASTEXITCODE -ne 0) {
            throw "Docker build failed for $serviceName"
        }
        
        Write-Success "✅ Successfully built $serviceName"
        
        # Security scanning
        if ($SecurityScan -or $BuildConfig[$Environment].scan) {
            Write-Info "🔍 Running security scan for $serviceName..."
            
            if ($TrivyAvailable) {
                # Use Trivy for comprehensive security scanning
                $scanResults = & trivy image --format json --output "security-reports/$serviceName-scan.json" $imageTag
                
                # Check for HIGH and CRITICAL vulnerabilities
                $criticalCount = (& trivy image --severity HIGH,CRITICAL --quiet $imageTag | Measure-Object -Line).Lines
                
                if ($criticalCount -gt 0) {
                    Write-Warning "⚠️  Found $criticalCount HIGH/CRITICAL vulnerabilities in $serviceName"
                    Write-Info "📄 Full report saved to security-reports/$serviceName-scan.json"
                    
                    if ($Environment -eq "prod") {
                        Write-Error "❌ Critical vulnerabilities found in production build - aborting"
                        exit 1
                    }
                } else {
                    Write-Success "✅ No critical vulnerabilities found in $serviceName"
                }
            } else {
                # Basic Docker security check
                Write-Warning "⚠️  Running basic security check (install Trivy for comprehensive scanning)"
                & docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v "$PWD/security-reports:/output" aquasec/trivy image --format json --output "/output/$serviceName-scan.json" $imageTag
            }
        }
        
        # Push to registry if configured
        if ($Push -or $BuildConfig[$Environment].push) {
            Write-Info "📤 Pushing $serviceName to registry..."
            & docker push $imageTag
            
            if ($LASTEXITCODE -ne 0) {
                throw "Failed to push $serviceName to registry"
            }
            
            Write-Success "✅ Successfully pushed $serviceName"
        }
        
        # Image size optimization report
        $imageSize = (& docker images --format "table {{.Size}}" $imageTag | Select-Object -Last 1)
        Write-Info "📦 Image size for $serviceName`: $imageSize"
        
    }
    catch {
        Write-Error "❌ Failed to build $serviceName`: $_"
        return $false
    }
    finally {
        Pop-Location
    }
    
    return $true
}

# Create security reports directory
if (!(Test-Path "security-reports")) {
    New-Item -ItemType Directory -Path "security-reports" | Out-Null
}

# Build all services
$buildResults = @()
$totalServices = $Services.Count
$currentService = 0

foreach ($service in $Services) {
    $currentService++
    Write-Info "[$currentService/$totalServices] Processing $($service.name)..."
    
    $result = Build-Service $service
    $buildResults += @{
        service = $service.name
        success = $result
    }
    
    if (!$result -and $Environment -eq "prod") {
        Write-Error "❌ Build failed for critical service $($service.name) in production environment"
        exit 1
    }
}

# Build summary
Write-Info "`n📊 Build Summary:"
$successCount = 0
$failureCount = 0

foreach ($result in $buildResults) {
    if ($result.success) {
        Write-Success "✅ $($result.service): SUCCESS"
        $successCount++
    } else {
        Write-Error "❌ $($result.service): FAILED"
        $failureCount++
    }
}

Write-Info "`n🎯 Results: $successCount successful, $failureCount failed"

if ($failureCount -gt 0) {
    Write-Warning "⚠️  Some builds failed. Check the output above for details."
    if ($Environment -eq "prod") {
        exit 1
    }
} else {
    Write-Success "🎉 All builds completed successfully!"
}

# Generate build report
$buildReport = @{
    timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
    environment = $Environment
    version = $Version
    services = $buildResults
    securityScanEnabled = $SecurityScan -or $BuildConfig[$Environment].scan
    pushEnabled = $Push -or $BuildConfig[$Environment].push
    registry = $Registry
}

$buildReport | ConvertTo-Json -Depth 3 | Out-File -FilePath "build-reports/build-$Environment-$(Get-Date -Format 'yyyyMMdd-HHmmss').json" -Encoding UTF8

Write-Success "📄 Build report saved to build-reports/"

# Health check validation (for development)
if ($Environment -eq "dev") {
    Write-Info "🏥 Performing health checks on built images..."
    
    foreach ($service in $Services) {
        $serviceName = $service.name
        $containerName = "health-check-$serviceName"
        
        try {
            # Start container for health check
            & docker run --name $containerName --detach "serenity-$serviceName`:latest"
            
            # Wait for container to start
            Start-Sleep -Seconds 5
            
            # Check container status
            $containerStatus = (& docker inspect --format '{{.State.Status}}' $containerName)
            
            if ($containerStatus -eq "running") {
                Write-Success "✅ Health check passed for $serviceName"
            } else {
                Write-Warning "⚠️  Health check failed for $serviceName - container status: $containerStatus"
            }
            
            # Clean up
            & docker stop $containerName | Out-Null
            & docker rm $containerName | Out-Null
        }
        catch {
            Write-Warning "⚠️  Health check error for $serviceName`: $_"
        }
    }
}

Write-Success "`n✨ Docker build process completed!"

if ($Environment -eq "prod") {
    Write-Info "🚀 Ready for production deployment!"
    Write-Info "Use the following command to deploy:"
    Write-Info "docker-compose -f docker-compose.prod.yml up -d"
}