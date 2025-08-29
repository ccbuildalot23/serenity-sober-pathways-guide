# Serenity Healthcare Platform - Production Readiness Checker
# Automated checklist validation for production deployment readiness
# Author: Production Validation Agent
# Version: 1.0.0

param(
    [Parameter(Mandatory=$false)]
    [string]$ConfigFile = "deployment\config\production.json",
    
    [Parameter(Mandatory=$false)]
    [switch]$GenerateReport,
    
    [Parameter(Mandatory=$false)]
    [switch]$AutoFix,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("brief", "detailed", "json")]
    [string]$OutputFormat = "detailed"
)

# Script configuration
$ErrorActionPreference = "Continue"
$VerbosePreference = "Continue"

# Global variables
$script:CheckResults = @{}
$script:TotalChecks = 0
$script:PassedChecks = 0
$script:FailedChecks = 0
$script:WarningChecks = 0
$script:AutoFixedItems = @()

# Ensure logs directory exists
if (!(Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" -Force
}

$script:LogFile = "logs\production-readiness-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

function Write-ReadinessLog {
    param(
        [string]$Message,
        [ValidateSet("INFO", "PASS", "FAIL", "WARN", "FIX")]
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    $color = switch ($Level) {
        "INFO" { "White" }
        "PASS" { "Green" }
        "FAIL" { "Red" }
        "WARN" { "Yellow" }
        "FIX" { "Magenta" }
        default { "White" }
    }
    
    if ($OutputFormat -eq "detailed" -or $Level -eq "FAIL") {
        Write-Host $logEntry -ForegroundColor $color
    }
    
    Add-Content -Path $script:LogFile -Value $logEntry
}

function Test-ReadinessCheck {
    param(
        [string]$CheckName,
        [scriptblock]$CheckScript,
        [ValidateSet("Critical", "Important", "Recommended")]
        [string]$Priority = "Important",
        [scriptblock]$AutoFixScript = $null
    )
    
    $script:TotalChecks++
    Write-ReadinessLog "Checking: $CheckName" -Level "INFO"
    
    try {
        $result = & $CheckScript
        
        $script:CheckResults[$CheckName] = @{
            Status = $result.Status
            Message = $result.Message
            Priority = $Priority
            Details = $result.Details
            AutoFixAvailable = ($AutoFixScript -ne $null)
        }
        
        switch ($result.Status) {
            "PASS" {
                Write-ReadinessLog "✓ $CheckName" -Level "PASS"
                $script:PassedChecks++
            }
            "FAIL" {
                Write-ReadinessLog "✗ $CheckName - $($result.Message)" -Level "FAIL"
                $script:FailedChecks++
                
                # Attempt auto-fix if available and enabled
                if ($AutoFix -and $AutoFixScript) {
                    Write-ReadinessLog "Attempting auto-fix for: $CheckName" -Level "FIX"
                    try {
                        $fixResult = & $AutoFixScript
                        if ($fixResult.Success) {
                            Write-ReadinessLog "Auto-fix successful for: $CheckName" -Level "FIX"
                            $script:AutoFixedItems += $CheckName
                            
                            # Re-run the check
                            $retestResult = & $CheckScript
                            if ($retestResult.Status -eq "PASS") {
                                $script:CheckResults[$CheckName].Status = "PASS"
                                $script:CheckResults[$CheckName].Message = "Auto-fixed: $($retestResult.Message)"
                                $script:FailedChecks--
                                $script:PassedChecks++
                                Write-ReadinessLog "✓ $CheckName (auto-fixed)" -Level "PASS"
                            }
                        }
                    }
                    catch {
                        Write-ReadinessLog "Auto-fix failed for: $CheckName - $($_.Exception.Message)" -Level "WARN"
                    }
                }
            }
            "WARN" {
                Write-ReadinessLog "⚠ $CheckName - $($result.Message)" -Level "WARN"
                $script:WarningChecks++
            }
        }
        
        return $result
    }
    catch {
        Write-ReadinessLog "✗ $CheckName - Exception: $($_.Exception.Message)" -Level "FAIL"
        $script:FailedChecks++
        $script:CheckResults[$CheckName] = @{
            Status = "FAIL"
            Message = "Check failed with exception: $($_.Exception.Message)"
            Priority = $Priority
            AutoFixAvailable = $false
        }
        return @{ Status = "FAIL"; Message = $_.Exception.Message }
    }
}

# Environment Variables Check
function Check-EnvironmentVariables {
    $requiredVars = @(
        "VITE_SUPABASE_URL",
        "VITE_SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "DATABASE_URL",
        "REDIS_URL",
        "SMTP_HOST",
        "SMTP_PORT",
        "SMTP_USER",
        "SMTP_PASSWORD",
        "JWT_SECRET",
        "ENCRYPTION_KEY"
    )
    
    $missingVars = @()
    
    foreach ($var in $requiredVars) {
        if (-not [Environment]::GetEnvironmentVariable($var)) {
            $missingVars += $var
        }
    }
    
    if ($missingVars.Count -eq 0) {
        return @{ Status = "PASS"; Message = "All required environment variables are set" }
    } else {
        return @{ 
            Status = "FAIL"
            Message = "Missing environment variables: $($missingVars -join ', ')"
            Details = $missingVars
        }
    }
}

# Security Configuration Check
function Check-SecurityConfiguration {
    $securityIssues = @()
    
    # Check for hardcoded secrets in code
    $secretPatterns = @(
        "password\s*=\s*['\"].*['\"]",
        "secret\s*=\s*['\"].*['\"]",
        "key\s*=\s*['\"].*['\"]",
        "token\s*=\s*['\"].*['\"]"
    )
    
    $sourceFiles = Get-ChildItem -Path "src", "backend", "services" -Recurse -Include "*.js", "*.ts", "*.jsx", "*.tsx", "*.py", "*.go" -ErrorAction SilentlyContinue
    
    foreach ($file in $sourceFiles) {
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        if ($content) {
            foreach ($pattern in $secretPatterns) {
                if ($content -match $pattern) {
                    $securityIssues += "Potential hardcoded secret in $($file.FullName)"
                }
            }
        }
    }
    
    # Check for .env files in production
    $envFiles = Get-ChildItem -Path "." -Recurse -Include ".env*" -ErrorAction SilentlyContinue
    foreach ($envFile in $envFiles) {
        if ($envFile.Name -match "\.env$") {
            $securityIssues += "Production .env file found: $($envFile.FullName)"
        }
    }
    
    # Check SSL/TLS configuration
    if (Test-Path "nginx.conf") {
        $nginxContent = Get-Content "nginx.conf" -Raw
        if ($nginxContent -notmatch "ssl_protocols TLSv1\.2 TLSv1\.3") {
            $securityIssues += "Weak SSL/TLS protocols configured in nginx"
        }
        if ($nginxContent -notmatch "add_header Strict-Transport-Security") {
            $securityIssues += "HSTS header not configured"
        }
    }
    
    if ($securityIssues.Count -eq 0) {
        return @{ Status = "PASS"; Message = "Security configuration checks passed" }
    } else {
        return @{
            Status = "FAIL"
            Message = "Security configuration issues found"
            Details = $securityIssues
        }
    }
}

# Database Configuration Check
function Check-DatabaseConfiguration {
    $dbIssues = @()
    
    try {
        # Check database URL format
        $dbUrl = [Environment]::GetEnvironmentVariable("DATABASE_URL")
        if ($dbUrl) {
            if ($dbUrl -notmatch "^postgres://.*") {
                $dbIssues += "Invalid database URL format"
            }
            if ($dbUrl -match "localhost|127\.0\.0\.1") {
                $dbIssues += "Database URL points to localhost - not suitable for production"
            }
        }
        
        # Check for migration files
        if (-not (Test-Path "database/migrations")) {
            $dbIssues += "Database migrations directory not found"
        } else {
            $migrationFiles = Get-ChildItem -Path "database/migrations" -Filter "*.sql"
            if ($migrationFiles.Count -eq 0) {
                $dbIssues += "No database migration files found"
            }
        }
        
        # Check backup configuration
        if (-not (Test-Path "scripts/backup-database.ps1") -and -not (Test-Path "scripts/backup-database.sh")) {
            $dbIssues += "Database backup script not found"
        }
        
        if ($dbIssues.Count -eq 0) {
            return @{ Status = "PASS"; Message = "Database configuration is valid" }
        } else {
            return @{
                Status = "FAIL"
                Message = "Database configuration issues found"
                Details = $dbIssues
            }
        }
    }
    catch {
        return @{ Status = "FAIL"; Message = "Error checking database configuration: $($_.Exception.Message)" }
    }
}

# HIPAA Compliance Check
function Check-HIPAACompliance {
    $complianceIssues = @()
    
    # Check for audit logging implementation
    $auditFiles = Get-ChildItem -Path "." -Recurse -Include "*audit*", "*log*" -ErrorAction SilentlyContinue
    if ($auditFiles.Count -eq 0) {
        $complianceIssues += "No audit logging implementation found"
    }
    
    # Check for encryption implementation
    $encryptionFiles = Get-ChildItem -Path "." -Recurse -Include "*encrypt*", "*crypto*" -ErrorAction SilentlyContinue
    if ($encryptionFiles.Count -eq 0) {
        $complianceIssues += "No encryption implementation found"
    }
    
    # Check for access control implementation
    $authFiles = Get-ChildItem -Path "." -Recurse -Include "*auth*", "*rbac*", "*permission*" -ErrorAction SilentlyContinue
    if ($authFiles.Count -eq 0) {
        $complianceIssues += "No access control implementation found"
    }
    
    # Check for backup retention policy
    if (-not (Test-Path "docs/HIPAA_COMPLIANCE_CHECKLIST.md")) {
        $complianceIssues += "HIPAA compliance documentation missing"
    }
    
    if ($complianceIssues.Count -eq 0) {
        return @{ Status = "PASS"; Message = "HIPAA compliance checks passed" }
    } else {
        return @{
            Status = "WARN"
            Message = "HIPAA compliance issues found - review required"
            Details = $complianceIssues
        }
    }
}

# Performance Configuration Check
function Check-PerformanceConfiguration {
    $perfIssues = @()
    
    # Check package.json for production optimizations
    if (Test-Path "package.json") {
        $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
        
        if (-not $packageJson.scripts.build) {
            $perfIssues += "No build script defined in package.json"
        }
        
        if (-not $packageJson.scripts."start:prod" -and -not $packageJson.scripts.start) {
            $perfIssues += "No production start script defined"
        }
        
        # Check for unnecessary dev dependencies in production
        if ($packageJson.dependencies) {
            $devDeps = @("nodemon", "concurrently", "@types/", "typescript")
            foreach ($dep in $packageJson.dependencies.PSObject.Properties) {
                if ($devDeps | Where-Object { $dep.Name -like "*$_*" }) {
                    $perfIssues += "Development dependency in production: $($dep.Name)"
                }
            }
        }
    }
    
    # Check for caching configuration
    if (Test-Path "nginx.conf") {
        $nginxContent = Get-Content "nginx.conf" -Raw
        if ($nginxContent -notmatch "expires|Cache-Control") {
            $perfIssues += "No caching configuration found in nginx"
        }
    }
    
    # Check for compression configuration
    if (Test-Path "nginx.conf") {
        $nginxContent = Get-Content "nginx.conf" -Raw
        if ($nginxContent -notmatch "gzip on") {
            $perfIssues += "Compression not enabled in nginx"
        }
    }
    
    if ($perfIssues.Count -eq 0) {
        return @{ Status = "PASS"; Message = "Performance configuration is optimized" }
    } else {
        return @{
            Status = "WARN"
            Message = "Performance configuration could be improved"
            Details = $perfIssues
        }
    }
}

# Monitoring Configuration Check
function Check-MonitoringConfiguration {
    $monitoringIssues = @()
    
    # Check for monitoring stack
    if (-not (Test-Path "monitoring/docker-compose.monitoring.yml")) {
        $monitoringIssues += "Monitoring stack configuration not found"
    }
    
    # Check for Prometheus configuration
    if (-not (Test-Path "monitoring/prometheus/prometheus.yml")) {
        $monitoringIssues += "Prometheus configuration not found"
    }
    
    # Check for Grafana dashboards
    if (-not (Test-Path "monitoring/grafana/dashboards")) {
        $monitoringIssues += "Grafana dashboards not found"
    }
    
    # Check for AlertManager configuration
    if (-not (Test-Path "monitoring/alertmanager/alertmanager.yml")) {
        $monitoringIssues += "AlertManager configuration not found"
    }
    
    # Check for health check endpoints
    $healthCheckFiles = Get-ChildItem -Path "." -Recurse -Include "*health*" -ErrorAction SilentlyContinue
    if ($healthCheckFiles.Count -eq 0) {
        $monitoringIssues += "Health check endpoints not implemented"
    }
    
    if ($monitoringIssues.Count -eq 0) {
        return @{ Status = "PASS"; Message = "Monitoring configuration is complete" }
    } else {
        return @{
            Status = "FAIL"
            Message = "Monitoring configuration issues found"
            Details = $monitoringIssues
        }
    }
}

# Backup and Recovery Check
function Check-BackupRecovery {
    $backupIssues = @()
    
    # Check for backup scripts
    $backupScripts = Get-ChildItem -Path "scripts" -Include "*backup*", "*restore*" -ErrorAction SilentlyContinue
    if ($backupScripts.Count -eq 0) {
        $backupIssues += "Backup/restore scripts not found"
    }
    
    # Check for disaster recovery documentation
    if (-not (Test-Path "docs/DISASTER_RECOVERY_PLAN.md")) {
        $backupIssues += "Disaster recovery plan not found"
    }
    
    # Check for backup retention policy
    if (-not (Test-Path "docs/BACKUP_RETENTION_POLICY.md")) {
        $backupIssues += "Backup retention policy not documented"
    }
    
    if ($backupIssues.Count -eq 0) {
        return @{ Status = "PASS"; Message = "Backup and recovery configuration is complete" }
    } else {
        return @{
            Status = "WARN"
            Message = "Backup and recovery improvements needed"
            Details = $backupIssues
        }
    }
}

# Documentation Check
function Check-Documentation {
    $docIssues = @()
    
    $requiredDocs = @(
        "README.md",
        "DEPLOYMENT_GUIDE.md",
        "API_DOCUMENTATION.md",
        "SECURITY_POLICIES.md",
        "INCIDENT_RESPONSE_PLAN.md"
    )
    
    foreach ($doc in $requiredDocs) {
        if (-not (Test-Path $doc) -and -not (Test-Path "docs/$doc")) {
            $docIssues += "Missing documentation: $doc"
        }
    }
    
    # Check for deployment runbooks
    if (-not (Test-Path "deployment/runbooks")) {
        $docIssues += "Deployment runbooks not found"
    }
    
    if ($docIssues.Count -eq 0) {
        return @{ Status = "PASS"; Message = "Documentation is complete" }
    } else {
        return @{
            Status = "WARN"
            Message = "Documentation could be improved"
            Details = $docIssues
        }
    }
}

# SSL Certificate Check
function Check-SSLCertificates {
    $sslIssues = @()
    
    # Check for certificate files
    $certDirs = @("certs", "ssl", "certificates", "config/ssl")
    $certsFound = $false
    
    foreach ($dir in $certDirs) {
        if (Test-Path $dir) {
            $certFiles = Get-ChildItem -Path $dir -Include "*.crt", "*.pem", "*.cert" -ErrorAction SilentlyContinue
            if ($certFiles.Count -gt 0) {
                $certsFound = $true
                
                # Check certificate expiration (basic check)
                foreach ($certFile in $certFiles) {
                    # This is a simplified check - in production, use proper certificate validation
                    $fileAge = (Get-Date) - $certFile.LastWriteTime
                    if ($fileAge.Days -gt 365) {
                        $sslIssues += "Certificate file may be outdated: $($certFile.Name)"
                    }
                }
                break
            }
        }
    }
    
    if (-not $certsFound) {
        $sslIssues += "SSL certificate files not found"
    }
    
    if ($sslIssues.Count -eq 0) {
        return @{ Status = "PASS"; Message = "SSL certificates are configured" }
    } else {
        return @{
            Status = "WARN"
            Message = "SSL certificate configuration needs attention"
            Details = $sslIssues
        }
    }
}

# Auto-fix functions
function Fix-EnvironmentVariables {
    # This would create a template .env file with placeholder values
    $envTemplate = @"
# Serenity Healthcare Platform - Production Environment Variables
# Copy this file to .env and fill in the actual values

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database

# Redis Configuration  
REDIS_URL=redis://username:password@host:port

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password

# Security
JWT_SECRET=generate-a-secure-random-string
ENCRYPTION_KEY=generate-a-secure-encryption-key

# Monitoring
GRAFANA_ADMIN_PASSWORD=secure-password-here
"@
    
    try {
        Set-Content -Path ".env.production.template" -Value $envTemplate
        return @{ Success = $true; Message = "Environment variables template created" }
    }
    catch {
        return @{ Success = $false; Message = $_.Exception.Message }
    }
}

function Fix-MonitoringConfiguration {
    try {
        # Create basic monitoring directory structure
        New-Item -ItemType Directory -Path "monitoring" -Force -ErrorAction SilentlyContinue
        New-Item -ItemType Directory -Path "monitoring/prometheus" -Force -ErrorAction SilentlyContinue
        New-Item -ItemType Directory -Path "monitoring/grafana/dashboards" -Force -ErrorAction SilentlyContinue
        New-Item -ItemType Directory -Path "monitoring/alertmanager" -Force -ErrorAction SilentlyContinue
        
        return @{ Success = $true; Message = "Monitoring directory structure created" }
    }
    catch {
        return @{ Success = $false; Message = $_.Exception.Message }
    }
}

# Generate readiness report
function Generate-ReadinessReport {
    $endTime = Get-Date
    
    $report = @{
        GeneratedAt = $endTime
        Summary = @{
            TotalChecks = $script:TotalChecks
            PassedChecks = $script:PassedChecks
            FailedChecks = $script:FailedChecks
            WarningChecks = $script:WarningChecks
            ReadinessScore = if ($script:TotalChecks -gt 0) { [math]::Round(($script:PassedChecks / $script:TotalChecks) * 100, 2) } else { 0 }
        }
        CheckResults = $script:CheckResults
        AutoFixedItems = $script:AutoFixedItems
        Recommendations = @()
        DeploymentReadiness = "UNKNOWN"
    }
    
    # Determine deployment readiness
    $criticalFailures = ($script:CheckResults.GetEnumerator() | Where-Object { $_.Value.Priority -eq "Critical" -and $_.Value.Status -eq "FAIL" }).Count
    $importantFailures = ($script:CheckResults.GetEnumerator() | Where-Object { $_.Value.Priority -eq "Important" -and $_.Value.Status -eq "FAIL" }).Count
    
    if ($criticalFailures -gt 0) {
        $report.DeploymentReadiness = "NOT READY"
        $report.Recommendations += "Critical failures must be resolved before production deployment"
    } elseif ($importantFailures -gt 0) {
        $report.DeploymentReadiness = "CONDITIONAL"
        $report.Recommendations += "Important issues should be resolved for optimal deployment"
    } else {
        $report.DeploymentReadiness = "READY"
        $report.Recommendations += "System appears ready for production deployment"
    }
    
    if ($script:WarningChecks -gt 0) {
        $report.Recommendations += "Review warning items to improve production readiness"
    }
    
    if ($script:AutoFixedItems.Count -gt 0) {
        $report.Recommendations += "Review auto-fixed items to ensure they meet your requirements"
    }
    
    return $report
}

# Main execution
try {
    Write-ReadinessLog "Starting Production Readiness Check for Serenity Healthcare Platform" -Level "INFO"
    
    if ($AutoFix) {
        Write-ReadinessLog "Auto-fix mode enabled - will attempt to resolve issues automatically" -Level "INFO"
    }
    
    Write-ReadinessLog "" -Level "INFO"
    Write-ReadinessLog "Running readiness checks..." -Level "INFO"
    
    # Run all checks
    Test-ReadinessCheck -CheckName "Environment Variables" -CheckScript { Check-EnvironmentVariables } -Priority "Critical" -AutoFixScript { Fix-EnvironmentVariables }
    Test-ReadinessCheck -CheckName "Security Configuration" -CheckScript { Check-SecurityConfiguration } -Priority "Critical"
    Test-ReadinessCheck -CheckName "Database Configuration" -CheckScript { Check-DatabaseConfiguration } -Priority "Critical"
    Test-ReadinessCheck -CheckName "HIPAA Compliance" -CheckScript { Check-HIPAACompliance } -Priority "Critical"
    Test-ReadinessCheck -CheckName "Performance Configuration" -CheckScript { Check-PerformanceConfiguration } -Priority "Important"
    Test-ReadinessCheck -CheckName "Monitoring Configuration" -CheckScript { Check-MonitoringConfiguration } -Priority "Important" -AutoFixScript { Fix-MonitoringConfiguration }
    Test-ReadinessCheck -CheckName "Backup and Recovery" -CheckScript { Check-BackupRecovery } -Priority "Important"
    Test-ReadinessCheck -CheckName "Documentation" -CheckScript { Check-Documentation } -Priority "Recommended"
    Test-ReadinessCheck -CheckName "SSL Certificates" -CheckScript { Check-SSLCertificates } -Priority "Important"
    
    # Generate report
    $report = Generate-ReadinessReport
    
    # Display results based on output format
    Write-ReadinessLog "" -Level "INFO"
    Write-ReadinessLog "=== PRODUCTION READINESS RESULTS ===" -Level "INFO"
    
    if ($OutputFormat -eq "json") {
        Write-Output ($report | ConvertTo-Json -Depth 10)
    } else {
        Write-ReadinessLog "Total Checks: $($report.Summary.TotalChecks)" -Level "INFO"
        Write-ReadinessLog "Passed: $($report.Summary.PassedChecks)" -Level "PASS"
        Write-ReadinessLog "Failed: $($report.Summary.FailedChecks)" -Level $(if ($report.Summary.FailedChecks -gt 0) { "FAIL" } else { "INFO" })
        Write-ReadinessLog "Warnings: $($report.Summary.WarningChecks)" -Level $(if ($report.Summary.WarningChecks -gt 0) { "WARN" } else { "INFO" })
        Write-ReadinessLog "Readiness Score: $($report.Summary.ReadinessScore)%" -Level $(if ($report.Summary.ReadinessScore -ge 90) { "PASS" } elseif ($report.Summary.ReadinessScore -ge 70) { "WARN" } else { "FAIL" })
        Write-ReadinessLog "Deployment Status: $($report.DeploymentReadiness)" -Level $(if ($report.DeploymentReadiness -eq "READY") { "PASS" } elseif ($report.DeploymentReadiness -eq "CONDITIONAL") { "WARN" } else { "FAIL" })
        
        if ($script:AutoFixedItems.Count -gt 0) {
            Write-ReadinessLog "Auto-fixed items: $($script:AutoFixedItems -join ', ')" -Level "FIX"
        }
        
        Write-ReadinessLog "" -Level "INFO"
        Write-ReadinessLog "Recommendations:" -Level "INFO"
        foreach ($recommendation in $report.Recommendations) {
            Write-ReadinessLog "- $recommendation" -Level "INFO"
        }
    }
    
    # Generate detailed report if requested
    if ($GenerateReport) {
        $reportFile = "reports\production-readiness-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
        New-Item -ItemType Directory -Path "reports" -Force -ErrorAction SilentlyContinue
        Set-Content -Path $reportFile -Value ($report | ConvertTo-Json -Depth 10)
        Write-ReadinessLog "Detailed report saved to: $reportFile" -Level "INFO"
    }
    
    # Exit with appropriate code
    switch ($report.DeploymentReadiness) {
        "READY" { exit 0 }
        "CONDITIONAL" { exit 1 }
        "NOT READY" { exit 2 }
        default { exit 3 }
    }
}
catch {
    Write-ReadinessLog "Production readiness check failed: $($_.Exception.Message)" -Level "FAIL"
    Write-ReadinessLog "Stack trace: $($_.ScriptStackTrace)" -Level "FAIL"
    exit 4
}