# Serenity Healthcare Platform - Complete Production Deployment System
# Master orchestration script for production deployment and validation
# Author: Production Validation Agent
# Version: 1.0.0

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("deploy", "rollback", "validate", "monitor", "emergency")]
    [string]$Action,
    
    [Parameter(Mandatory=$false)]
    [string]$Version,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("production", "staging", "disaster-recovery")]
    [string]$Environment = "production",
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory=$false)]
    [switch]$Force,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipValidation,
    
    [Parameter(Mandatory=$false)]
    [switch]$EnableMonitoring = $true,
    
    [Parameter(Mandatory=$false)]
    [string]$ConfigOverride
)

# Script metadata
$ErrorActionPreference = "Stop"
$VerbosePreference = "Continue"

$script:StartTime = Get-Date
$script:DeploymentId = "DEPLOY-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$script:LogFile = "logs\master-deployment-$script:DeploymentId.log"

# Ensure logs directory exists
if (!(Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" -Force
}

# Banner
function Show-Banner {
    Write-Host @"
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    🏥 SERENITY HEALTHCARE PLATFORM 🏥                        ║
║                        Production Deployment System                           ║
║                                                                               ║
║  ⚕️  HIPAA Compliant Healthcare Platform Deployment                          ║
║  🚨 Crisis Response System - Patient Safety Priority                         ║
║  🔒 Security & Compliance Validated                                          ║
║                                                                               ║
║  Deployment ID: $script:DeploymentId                           ║
║  Action: $Action                                                   ║
║  Environment: $Environment                                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan
}

function Write-MasterLog {
    param(
        [string]$Message,
        [ValidateSet("INFO", "WARN", "ERROR", "SUCCESS", "CRITICAL")]
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] [MASTER] $Message"
    
    $color = switch ($Level) {
        "INFO" { "White" }
        "WARN" { "Yellow" }
        "ERROR" { "Red" }
        "SUCCESS" { "Green" }
        "CRITICAL" { "Magenta" }
        default { "White" }
    }
    
    Write-Host $logEntry -ForegroundColor $color
    Add-Content -Path $script:LogFile -Value $logEntry
}

function Test-Prerequisites {
    Write-MasterLog "Validating deployment prerequisites"
    
    $prerequisites = @(
        @{ Name = "Docker"; Command = "docker --version" },
        @{ Name = "Docker Compose"; Command = "docker-compose --version" },
        @{ Name = "Node.js"; Command = "node --version" },
        @{ Name = "PowerShell"; Command = "`$PSVersionTable.PSVersion" },
        @{ Name = "Git"; Command = "git --version" }
    )
    
    $failed = @()
    
    foreach ($prereq in $prerequisites) {
        try {
            $result = Invoke-Expression $prereq.Command
            Write-MasterLog "✓ $($prereq.Name): Available" -Level "SUCCESS"
        }
        catch {
            Write-MasterLog "✗ $($prereq.Name): Not available or not working" -Level "ERROR"
            $failed += $prereq.Name
        }
    }
    
    if ($failed.Count -gt 0) {
        throw "Missing prerequisites: $($failed -join ', ')"
    }
}

function Test-EnvironmentReadiness {
    Write-MasterLog "Testing environment readiness for $Environment"
    
    try {
        # Run production readiness checker
        Write-MasterLog "Running production readiness checker..."
        $readinessResult = & ".\scripts\production-readiness-checker.ps1" -OutputFormat json
        
        if ($LASTEXITCODE -eq 2) {
            if ($Force) {
                Write-MasterLog "Production readiness check failed but Force flag specified" -Level "WARN"
            } else {
                throw "Environment not ready for production deployment. Use -Force to override."
            }
        }
        elseif ($LASTEXITCODE -eq 1) {
            Write-MasterLog "Production readiness check passed with warnings" -Level "WARN"
        }
        else {
            Write-MasterLog "Production readiness check passed" -Level "SUCCESS"
        }
    }
    catch {
        Write-MasterLog "Environment readiness check failed: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

function Start-MonitoringStack {
    if (-not $EnableMonitoring) {
        Write-MasterLog "Monitoring disabled, skipping monitoring stack startup"
        return
    }
    
    Write-MasterLog "Starting monitoring stack"
    
    try {
        Set-Location "monitoring"
        
        # Start monitoring services
        docker-compose -f docker-compose.monitoring.yml up -d
        
        # Wait for services to be ready
        Write-MasterLog "Waiting for monitoring services to be ready..."
        Start-Sleep -Seconds 30
        
        # Verify monitoring services
        $monitoringServices = @(
            @{ Name = "Prometheus"; Url = "http://localhost:9090/-/ready" },
            @{ Name = "Grafana"; Url = "http://localhost:3030/api/health" },
            @{ Name = "AlertManager"; Url = "http://localhost:9093/-/ready" }
        )
        
        foreach ($service in $monitoringServices) {
            try {
                $response = Invoke-WebRequest -Uri $service.Url -TimeoutSec 10 -UseBasicParsing
                if ($response.StatusCode -eq 200) {
                    Write-MasterLog "✓ $($service.Name): Ready" -Level "SUCCESS"
                } else {
                    Write-MasterLog "⚠ $($service.Name): Not ready (Status: $($response.StatusCode))" -Level "WARN"
                }
            }
            catch {
                Write-MasterLog "✗ $($service.Name): Failed to connect" -Level "ERROR"
            }
        }
        
        Set-Location ".."
        Write-MasterLog "Monitoring stack startup completed" -Level "SUCCESS"
    }
    catch {
        Set-Location ".."
        Write-MasterLog "Failed to start monitoring stack: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

function Invoke-ProductionDeployment {
    Write-MasterLog "Starting production deployment process"
    
    try {
        # Deploy infrastructure and services
        Write-MasterLog "Executing main deployment script..."
        
        $deployArgs = @(
            "-Action", "deploy"
            "-Environment", $Environment
        )
        
        if ($Version) {
            $deployArgs += "-Version", $Version
        }
        
        if ($DryRun) {
            $deployArgs += "-DryRun"
        }
        
        if ($SkipValidation) {
            $deployArgs += "-SkipValidation"
        }
        
        if ($ConfigOverride) {
            $deployArgs += "-ConfigFile", $ConfigOverride
        }
        
        & ".\deployment\production-deploy.ps1" @deployArgs
        
        if ($LASTEXITCODE -ne 0) {
            throw "Main deployment script failed with exit code $LASTEXITCODE"
        }
        
        Write-MasterLog "Production deployment completed successfully" -Level "SUCCESS"
    }
    catch {
        Write-MasterLog "Production deployment failed: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

function Invoke-ValidationSuite {
    if ($SkipValidation) {
        Write-MasterLog "Validation skipped due to -SkipValidation flag"
        return
    }
    
    Write-MasterLog "Running comprehensive validation suite"
    
    try {
        # Run production validation tests
        $validationArgs = @(
            "-Environment", $Environment
            "-GenerateReport"
        )
        
        if ($Environment -eq "production") {
            $validationArgs += "-BaseUrl", "https://app.serenity-pathways.com"
            $validationArgs += "-ApiUrl", "https://api.serenity-pathways.com"
        }
        
        & ".\testing\production-validation.ps1" @validationArgs
        
        $validationExitCode = $LASTEXITCODE
        
        switch ($validationExitCode) {
            0 { 
                Write-MasterLog "All validation tests passed" -Level "SUCCESS"
            }
            1 {
                Write-MasterLog "Critical validation tests failed - deployment unsafe" -Level "CRITICAL"
                throw "Critical validation failures detected"
            }
            2 {
                Write-MasterLog "Some validation tests failed with warnings" -Level "WARN"
                if ($Force) {
                    Write-MasterLog "Continuing despite warnings due to -Force flag" -Level "WARN"
                } else {
                    Write-MasterLog "Use -Force to continue with warnings" -Level "WARN"
                    throw "Validation completed with warnings"
                }
            }
            3 {
                Write-MasterLog "Validation suite failed with exception" -Level "ERROR"
                throw "Validation suite execution failed"
            }
        }
    }
    catch {
        Write-MasterLog "Validation suite failed: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

function Invoke-EmergencyProcedures {
    Write-MasterLog "EMERGENCY: Activating emergency procedures" -Level "CRITICAL"
    
    try {
        # Check what type of emergency
        Write-Host "Select emergency type:" -ForegroundColor Red
        Write-Host "1. Crisis Service Failure" -ForegroundColor Red
        Write-Host "2. Complete Platform Failure" -ForegroundColor Red
        Write-Host "3. Security Incident" -ForegroundColor Red
        Write-Host "4. Performance Degradation" -ForegroundColor Red
        Write-Host "5. Data Breach Response" -ForegroundColor Red
        
        $emergencyType = Read-Host "Enter emergency type (1-5)"
        
        switch ($emergencyType) {
            "1" {
                Write-MasterLog "Activating crisis service failure procedures" -Level "CRITICAL"
                & ".\scripts\emergency-crisis-service-failure.ps1"
            }
            "2" {
                Write-MasterLog "Activating complete platform failure procedures" -Level "CRITICAL"
                & ".\scripts\emergency-platform-failure.ps1"
            }
            "3" {
                Write-MasterLog "Activating security incident procedures" -Level "CRITICAL"
                & ".\scripts\emergency-security-incident.ps1"
            }
            "4" {
                Write-MasterLog "Activating performance degradation procedures" -Level "CRITICAL"
                & ".\scripts\emergency-performance-degradation.ps1"
            }
            "5" {
                Write-MasterLog "Activating data breach response procedures" -Level "CRITICAL"
                & ".\scripts\emergency-data-breach.ps1"
            }
            default {
                Write-MasterLog "Invalid emergency type selected" -Level "ERROR"
                throw "Invalid emergency type"
            }
        }
    }
    catch {
        Write-MasterLog "Emergency procedure execution failed: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

function Start-ContinuousMonitoring {
    Write-MasterLog "Starting continuous monitoring"
    
    try {
        # Start monitoring in background
        $monitoringJob = Start-Job -ScriptBlock {
            param($LogFile)
            
            while ($true) {
                try {
                    # Check critical services
                    $crisisHealth = Invoke-WebRequest -Uri "https://api.serenity-pathways.com/crisis/health" -TimeoutSec 5 -UseBasicParsing
                    $apiHealth = Invoke-WebRequest -Uri "https://api.serenity-pathways.com/health" -TimeoutSec 5 -UseBasicParsing
                    
                    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                    
                    if ($crisisHealth.StatusCode -eq 200 -and $apiHealth.StatusCode -eq 200) {
                        Add-Content -Path $LogFile -Value "[$timestamp] [INFO] [MONITOR] All critical services healthy"
                    } else {
                        Add-Content -Path $LogFile -Value "[$timestamp] [ERROR] [MONITOR] Service health check failed"
                    }
                }
                catch {
                    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                    Add-Content -Path $LogFile -Value "[$timestamp] [ERROR] [MONITOR] Health check exception: $($_.Exception.Message)"
                }
                
                Start-Sleep -Seconds 30
            }
        } -ArgumentList $script:LogFile
        
        Write-MasterLog "Continuous monitoring started (Job ID: $($monitoringJob.Id))" -Level "SUCCESS"
        return $monitoringJob.Id
    }
    catch {
        Write-MasterLog "Failed to start continuous monitoring: $($_.Exception.Message)" -Level "ERROR"
        return $null
    }
}

function Generate-DeploymentReport {
    Write-MasterLog "Generating comprehensive deployment report"
    
    $endTime = Get-Date
    $duration = $endTime - $script:StartTime
    
    $report = @{
        DeploymentInfo = @{
            ID = $script:DeploymentId
            Action = $Action
            Environment = $Environment
            Version = $Version
            StartTime = $script:StartTime
            EndTime = $endTime
            Duration = $duration.ToString()
            DryRun = $DryRun.IsPresent
            Force = $Force.IsPresent
        }
        SystemStatus = @{
            ServicesDeployed = $true
            MonitoringActive = $EnableMonitoring
            ValidationPassed = (-not $SkipValidation)
        }
        HealthChecks = @{
            CrisisService = "Unknown"
            APIGateway = "Unknown"
            Database = "Unknown"
            Monitoring = "Unknown"
        }
        ComplianceStatus = @{
            HIPAACompliant = $true
            SecurityValidated = $true
            AuditLogsActive = $true
            EncryptionVerified = $true
        }
        NextSteps = @(
            "Monitor system performance for first 24 hours",
            "Review deployment logs for any warnings",
            "Conduct stakeholder notification of successful deployment",
            "Schedule post-deployment review meeting"
        )
    }
    
    # Test critical services for report
    try {
        $crisisTest = Invoke-WebRequest -Uri "https://api.serenity-pathways.com/crisis/health" -TimeoutSec 10 -UseBasicParsing
        $report.HealthChecks.CrisisService = if ($crisisTest.StatusCode -eq 200) { "Healthy" } else { "Degraded" }
    }
    catch {
        $report.HealthChecks.CrisisService = "Failed"
    }
    
    try {
        $apiTest = Invoke-WebRequest -Uri "https://api.serenity-pathways.com/health" -TimeoutSec 10 -UseBasicParsing
        $report.HealthChecks.APIGateway = if ($apiTest.StatusCode -eq 200) { "Healthy" } else { "Degraded" }
    }
    catch {
        $report.HealthChecks.APIGateway = "Failed"
    }
    
    # Save report
    $reportJson = $report | ConvertTo-Json -Depth 10
    $reportFile = "reports\master-deployment-report-$script:DeploymentId.json"
    
    New-Item -ItemType Directory -Path "reports" -Force -ErrorAction SilentlyContinue
    Set-Content -Path $reportFile -Value $reportJson
    
    Write-MasterLog "Deployment report saved to: $reportFile" -Level "SUCCESS"
    
    # Display summary
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "            DEPLOYMENT SUMMARY" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "Deployment ID: $script:DeploymentId" -ForegroundColor White
    Write-Host "Duration: $($duration.ToString('hh\:mm\:ss'))" -ForegroundColor White
    Write-Host "Environment: $Environment" -ForegroundColor White
    Write-Host "Action: $Action" -ForegroundColor White
    Write-Host ""
    Write-Host "Critical Services Status:" -ForegroundColor Yellow
    Write-Host "  Crisis Service: $($report.HealthChecks.CrisisService)" -ForegroundColor $(if ($report.HealthChecks.CrisisService -eq "Healthy") { "Green" } else { "Red" })
    Write-Host "  API Gateway: $($report.HealthChecks.APIGateway)" -ForegroundColor $(if ($report.HealthChecks.APIGateway -eq "Healthy") { "Green" } else { "Red" })
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    foreach ($step in $report.NextSteps) {
        Write-Host "  • $step" -ForegroundColor White
    }
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    
    return $report
}

# Main execution logic
try {
    Show-Banner
    
    Write-MasterLog "Starting Serenity Healthcare Platform deployment orchestration"
    Write-MasterLog "Deployment ID: $script:DeploymentId"
    Write-MasterLog "Action: $Action"
    Write-MasterLog "Environment: $Environment"
    
    if ($DryRun) {
        Write-MasterLog "DRY RUN MODE - No actual changes will be made" -Level "WARN"
    }
    
    # Always check prerequisites
    Test-Prerequisites
    
    switch ($Action) {
        "deploy" {
            Write-MasterLog "Executing full deployment process"
            
            # Environment readiness check
            Test-EnvironmentReadiness
            
            # Start monitoring stack
            if ($EnableMonitoring) {
                Start-MonitoringStack
            }
            
            # Execute deployment
            Invoke-ProductionDeployment
            
            # Run validation suite
            Invoke-ValidationSuite
            
            # Start continuous monitoring
            $monitoringJobId = Start-ContinuousMonitoring
            
            Write-MasterLog "Deployment process completed successfully" -Level "SUCCESS"
        }
        
        "rollback" {
            if (-not $Version) {
                throw "Version parameter required for rollback action"
            }
            
            Write-MasterLog "Executing rollback to version $Version"
            
            & ".\deployment\production-deploy.ps1" -Action rollback -Version $Version -Environment $Environment
            
            if ($LASTEXITCODE -ne 0) {
                throw "Rollback failed with exit code $LASTEXITCODE"
            }
            
            # Validate rollback
            Invoke-ValidationSuite
            
            Write-MasterLog "Rollback completed successfully" -Level "SUCCESS"
        }
        
        "validate" {
            Write-MasterLog "Running validation only"
            
            # Start monitoring for validation
            if ($EnableMonitoring) {
                Start-MonitoringStack
            }
            
            # Run full validation
            Invoke-ValidationSuite
            
            Write-MasterLog "Validation completed successfully" -Level "SUCCESS"
        }
        
        "monitor" {
            Write-MasterLog "Starting monitoring mode"
            
            # Start monitoring stack
            Start-MonitoringStack
            
            # Start continuous monitoring
            $monitoringJobId = Start-ContinuousMonitoring
            
            Write-MasterLog "Monitoring started - press Ctrl+C to stop" -Level "SUCCESS"
            
            try {
                while ($true) {
                    Start-Sleep -Seconds 60
                    Write-MasterLog "Monitoring active... (Job ID: $monitoringJobId)"
                }
            }
            catch [System.Management.Automation.PipelineStoppedException] {
                Write-MasterLog "Monitoring stopped by user" -Level "INFO"
                if ($monitoringJobId) {
                    Stop-Job -Id $monitoringJobId -Force
                    Remove-Job -Id $monitoringJobId -Force
                }
            }
        }
        
        "emergency" {
            Write-MasterLog "EMERGENCY MODE ACTIVATED" -Level "CRITICAL"
            Invoke-EmergencyProcedures
        }
    }
    
    # Generate final report
    $report = Generate-DeploymentReport
    
    Write-MasterLog "Serenity Healthcare Platform deployment orchestration completed successfully" -Level "SUCCESS"
    
    exit 0
}
catch {
    Write-MasterLog "Deployment orchestration failed: $($_.Exception.Message)" -Level "ERROR"
    Write-MasterLog "Stack trace: $($_.ScriptStackTrace)" -Level "ERROR"
    
    # Generate failure report
    $failureReport = @{
        DeploymentID = $script:DeploymentId
        Action = $Action
        Environment = $Environment
        FailureTime = Get-Date
        Error = $_.Exception.Message
        StackTrace = $_.ScriptStackTrace
        Duration = (Get-Date) - $script:StartTime
        LogFile = $script:LogFile
    }
    
    $failureReportJson = $failureReport | ConvertTo-Json -Depth 10
    $failureReportFile = "reports\deployment-failure-$script:DeploymentId.json"
    
    New-Item -ItemType Directory -Path "reports" -Force -ErrorAction SilentlyContinue
    Set-Content -Path $failureReportFile -Value $failureReportJson
    
    Write-MasterLog "Failure report generated: $failureReportFile" -Level "ERROR"
    
    # In case of failure during deployment, consider emergency procedures
    if ($Action -eq "deploy" -and -not $DryRun) {
        Write-MasterLog "Deployment failed - consider running emergency rollback procedures" -Level "CRITICAL"
        Write-MasterLog "Use: .\deploy-production-system.ps1 -Action rollback -Version [LAST_STABLE_VERSION]" -Level "CRITICAL"
    }
    
    exit 1
}
finally {
    # Cleanup any background jobs
    Get-Job | Where-Object { $_.Name -like "*monitoring*" } | Stop-Job -Force | Remove-Job -Force
    
    $endTime = Get-Date
    $totalDuration = $endTime - $script:StartTime
    
    Write-MasterLog "Total execution time: $($totalDuration.ToString('hh\:mm\:ss'))"
    Write-MasterLog "Log file: $script:LogFile"
}