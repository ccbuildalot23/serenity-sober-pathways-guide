# Serenity Healthcare Platform - Production Validation Suite
# Comprehensive end-to-end validation for production deployment
# Author: Production Validation Agent
# Version: 1.0.0

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "production",
    
    [Parameter(Mandatory=$false)]
    [string]$BaseUrl = "https://app.serenity-pathways.com",
    
    [Parameter(Mandatory=$false)]
    [string]$ApiUrl = "https://api.serenity-pathways.com",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipSlowTests,
    
    [Parameter(Mandatory=$false)]
    [switch]$GenerateReport,
    
    [Parameter(Mandatory=$false)]
    [int]$TimeoutMinutes = 30
)

# Script configuration
$ErrorActionPreference = "Continue"
$VerbosePreference = "Continue"

# Global variables
$script:TestResults = @{}
$script:StartTime = Get-Date
$script:TotalTests = 0
$script:PassedTests = 0
$script:FailedTests = 0
$script:SkippedTests = 0
$script:CrisisResponseThreshold = 500 # milliseconds

# Ensure logs directory exists
if (!(Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" -Force
}

$script:LogFile = "logs\production-validation-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

function Write-ValidationLog {
    param(
        [string]$Message,
        [ValidateSet("INFO", "PASS", "FAIL", "WARN", "SKIP")]
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    $color = switch ($Level) {
        "INFO" { "White" }
        "PASS" { "Green" }
        "FAIL" { "Red" }
        "WARN" { "Yellow" }
        "SKIP" { "Cyan" }
        default { "White" }
    }
    
    Write-Host $logEntry -ForegroundColor $color
    Add-Content -Path $script:LogFile -Value $logEntry
}

function Start-ValidationTest {
    param(
        [string]$TestName,
        [scriptblock]$TestScript,
        [bool]$Critical = $false,
        [int]$TimeoutSeconds = 300
    )
    
    $script:TotalTests++
    Write-ValidationLog "Starting test: $TestName" -Level "INFO"
    
    try {
        # Run test with timeout
        $job = Start-Job -ScriptBlock $TestScript
        $completed = Wait-Job $job -Timeout $TimeoutSeconds
        
        if ($completed) {
            $result = Receive-Job $job
            Remove-Job $job
            
            if ($result -and $result.Success) {
                Write-ValidationLog "PASSED: $TestName" -Level "PASS"
                $script:PassedTests++
                $script:TestResults[$TestName] = @{
                    Status = "PASSED"
                    Details = $result.Details
                    Duration = $result.Duration
                    Critical = $Critical
                }
                return $true
            } else {
                $errorMsg = if ($result.Error) { $result.Error } else { "Test returned false" }
                Write-ValidationLog "FAILED: $TestName - $errorMsg" -Level "FAIL"
                $script:FailedTests++
                $script:TestResults[$TestName] = @{
                    Status = "FAILED"
                    Error = $errorMsg
                    Critical = $Critical
                }
                
                if ($Critical) {
                    throw "Critical test failed: $TestName"
                }
                return $false
            }
        } else {
            Remove-Job $job -Force
            Write-ValidationLog "FAILED: $TestName - Timeout after $TimeoutSeconds seconds" -Level "FAIL"
            $script:FailedTests++
            $script:TestResults[$TestName] = @{
                Status = "FAILED"
                Error = "Timeout"
                Critical = $Critical
            }
            
            if ($Critical) {
                throw "Critical test timeout: $TestName"
            }
            return $false
        }
    }
    catch {
        Write-ValidationLog "FAILED: $TestName - $($_.Exception.Message)" -Level "FAIL"
        $script:FailedTests++
        $script:TestResults[$TestName] = @{
            Status = "FAILED"
            Error = $_.Exception.Message
            Critical = $Critical
        }
        
        if ($Critical) {
            throw
        }
        return $false
    }
}

# Test: Application Availability
function Test-ApplicationAvailability {
    $startTime = Get-Date
    
    try {
        $response = Invoke-WebRequest -Uri $BaseUrl -TimeoutSec 30 -UseBasicParsing
        $duration = (Get-Date) - $startTime
        
        if ($response.StatusCode -eq 200) {
            return @{
                Success = $true
                Details = "Application accessible, status code: $($response.StatusCode)"
                Duration = $duration.TotalMilliseconds
            }
        } else {
            return @{
                Success = $false
                Error = "Unexpected status code: $($response.StatusCode)"
                Duration = $duration.TotalMilliseconds
            }
        }
    }
    catch {
        $duration = (Get-Date) - $startTime
        return @{
            Success = $false
            Error = $_.Exception.Message
            Duration = $duration.TotalMilliseconds
        }
    }
}

# Test: API Health Endpoints
function Test-APIHealthEndpoints {
    $startTime = Get-Date
    $healthEndpoints = @(
        "/health",
        "/health/db",
        "/health/auth",
        "/health/ready",
        "/auth/health",
        "/crisis/health",
        "/notifications/health"
    )
    
    $results = @()
    $allHealthy = $true
    
    foreach ($endpoint in $healthEndpoints) {
        try {
            $url = "$ApiUrl$endpoint"
            $response = Invoke-WebRequest -Uri $url -TimeoutSec 10 -UseBasicParsing
            
            if ($response.StatusCode -eq 200) {
                $results += "✓ $endpoint"
            } else {
                $results += "✗ $endpoint (Status: $($response.StatusCode))"
                $allHealthy = $false
            }
        }
        catch {
            $results += "✗ $endpoint (Error: $($_.Exception.Message))"
            $allHealthy = $false
        }
    }
    
    $duration = (Get-Date) - $startTime
    
    return @{
        Success = $allHealthy
        Details = $results -join "; "
        Error = if ($allHealthy) { $null } else { "Some health endpoints failed" }
        Duration = $duration.TotalMilliseconds
    }
}

# Test: Crisis Response Time (CRITICAL)
function Test-CrisisResponseTime {
    $startTime = Get-Date
    $responseTimes = @()
    
    for ($i = 1; $i -le 10; $i++) {
        try {
            $testStart = Get-Date
            $response = Invoke-WebRequest -Uri "$ApiUrl/crisis/test" -Method POST -TimeoutSec 2 -UseBasicParsing
            $testEnd = Get-Date
            $responseTime = ($testEnd - $testStart).TotalMilliseconds
            
            $responseTimes += $responseTime
            
            if ($response.StatusCode -ne 200) {
                return @{
                    Success = $false
                    Error = "Crisis endpoint returned status $($response.StatusCode)"
                    Duration = ((Get-Date) - $startTime).TotalMilliseconds
                }
            }
        }
        catch {
            return @{
                Success = $false
                Error = "Crisis endpoint test failed: $($_.Exception.Message)"
                Duration = ((Get-Date) - $startTime).TotalMilliseconds
            }
        }
    }
    
    $avgResponseTime = ($responseTimes | Measure-Object -Average).Average
    $maxResponseTime = ($responseTimes | Measure-Object -Maximum).Maximum
    $p95ResponseTime = $responseTimes | Sort-Object | Select-Object -Index ([math]::Floor($responseTimes.Count * 0.95))
    
    $duration = (Get-Date) - $startTime
    
    $success = ($avgResponseTime -le $script:CrisisResponseThreshold) -and ($p95ResponseTime -le $script:CrisisResponseThreshold)
    
    return @{
        Success = $success
        Details = "Avg: $([math]::Round($avgResponseTime, 2))ms, Max: $([math]::Round($maxResponseTime, 2))ms, P95: $([math]::Round($p95ResponseTime, 2))ms"
        Error = if ($success) { $null } else { "Crisis response time exceeds $($script:CrisisResponseThreshold)ms threshold" }
        Duration = $duration.TotalMilliseconds
    }
}

# Test: Authentication Flow
function Test-AuthenticationFlow {
    $startTime = Get-Date
    
    try {
        # Test user registration
        $registerData = @{
            email = "test-$(Get-Random)@serenity-test.com"
            password = "TestPass123!"
            role = "patient"
        } | ConvertTo-Json
        
        $registerResponse = Invoke-WebRequest -Uri "$ApiUrl/auth/register" -Method POST -Body $registerData -ContentType "application/json" -TimeoutSec 30 -UseBasicParsing
        
        if ($registerResponse.StatusCode -ne 201 -and $registerResponse.StatusCode -ne 200) {
            return @{
                Success = $false
                Error = "Registration failed with status $($registerResponse.StatusCode)"
                Duration = ((Get-Date) - $startTime).TotalMilliseconds
            }
        }
        
        # Test user login
        $loginData = @{
            email = ($registerData | ConvertFrom-Json).email
            password = ($registerData | ConvertFrom-Json).password
        } | ConvertTo-Json
        
        $loginResponse = Invoke-WebRequest -Uri "$ApiUrl/auth/login" -Method POST -Body $loginData -ContentType "application/json" -TimeoutSec 30 -UseBasicParsing
        
        if ($loginResponse.StatusCode -ne 200) {
            return @{
                Success = $false
                Error = "Login failed with status $($loginResponse.StatusCode)"
                Duration = ((Get-Date) - $startTime).TotalMilliseconds
            }
        }
        
        # Test token validation
        $loginResponseData = $loginResponse.Content | ConvertFrom-Json
        $token = $loginResponseData.access_token
        
        if (!$token) {
            return @{
                Success = $false
                Error = "No access token received"
                Duration = ((Get-Date) - $startTime).TotalMilliseconds
            }
        }
        
        $headers = @{ Authorization = "Bearer $token" }
        $profileResponse = Invoke-WebRequest -Uri "$ApiUrl/auth/profile" -Headers $headers -TimeoutSec 30 -UseBasicParsing
        
        if ($profileResponse.StatusCode -ne 200) {
            return @{
                Success = $false
                Error = "Profile access failed with status $($profileResponse.StatusCode)"
                Duration = ((Get-Date) - $startTime).TotalMilliseconds
            }
        }
        
        $duration = (Get-Date) - $startTime
        
        return @{
            Success = $true
            Details = "Registration, login, and token validation successful"
            Duration = $duration.TotalMilliseconds
        }
    }
    catch {
        $duration = (Get-Date) - $startTime
        return @{
            Success = $false
            Error = $_.Exception.Message
            Duration = $duration.TotalMilliseconds
        }
    }
}

# Test: Database Connectivity
function Test-DatabaseConnectivity {
    $startTime = Get-Date
    
    try {
        # Test basic database health via API
        $response = Invoke-WebRequest -Uri "$ApiUrl/health/db" -TimeoutSec 30 -UseBasicParsing
        
        if ($response.StatusCode -ne 200) {
            return @{
                Success = $false
                Error = "Database health check failed with status $($response.StatusCode)"
                Duration = ((Get-Date) - $startTime).TotalMilliseconds
            }
        }
        
        $healthData = $response.Content | ConvertFrom-Json
        
        if ($healthData.status -ne "healthy") {
            return @{
                Success = $false
                Error = "Database reported unhealthy status: $($healthData.status)"
                Duration = ((Get-Date) - $startTime).TotalMilliseconds
            }
        }
        
        # Test database read/write operations
        $testData = @{
            test_id = "validation-$(Get-Date -Format 'yyyyMMddHHmmss')"
            test_value = "production-validation"
        } | ConvertTo-Json
        
        $writeResponse = Invoke-WebRequest -Uri "$ApiUrl/test/db-write" -Method POST -Body $testData -ContentType "application/json" -TimeoutSec 30 -UseBasicParsing
        
        if ($writeResponse.StatusCode -ne 200 -and $writeResponse.StatusCode -ne 201) {
            return @{
                Success = $false
                Error = "Database write test failed with status $($writeResponse.StatusCode)"
                Duration = ((Get-Date) - $startTime).TotalMilliseconds
            }
        }
        
        $duration = (Get-Date) - $startTime
        
        return @{
            Success = $true
            Details = "Database connectivity, health check, and write operations successful"
            Duration = $duration.TotalMilliseconds
        }
    }
    catch {
        $duration = (Get-Date) - $startTime
        return @{
            Success = $false
            Error = $_.Exception.Message
            Duration = $duration.TotalMilliseconds
        }
    }
}

# Test: HIPAA Compliance Checks
function Test-HIPAACompliance {
    $startTime = Get-Date
    $complianceChecks = @()
    $allCompliant = $true
    
    try {
        # Check HTTPS enforcement
        try {
            $httpResponse = Invoke-WebRequest -Uri $BaseUrl.Replace("https://", "http://") -TimeoutSec 10 -UseBasicParsing
            # Should redirect to HTTPS or fail
            if ($httpResponse.StatusCode -eq 200 -and !$httpResponse.BaseResponse.ResponseUri.Scheme.Equals("https")) {
                $complianceChecks += "✗ HTTPS not enforced"
                $allCompliant = $false
            } else {
                $complianceChecks += "✓ HTTPS enforced"
            }
        }
        catch {
            $complianceChecks += "✓ HTTP access blocked (expected)"
        }
        
        # Check security headers
        $response = Invoke-WebRequest -Uri $BaseUrl -TimeoutSec 30 -UseBasicParsing
        
        $requiredHeaders = @(
            "X-Frame-Options",
            "X-Content-Type-Options", 
            "X-XSS-Protection",
            "Strict-Transport-Security",
            "Content-Security-Policy"
        )
        
        foreach ($header in $requiredHeaders) {
            if ($response.Headers[$header]) {
                $complianceChecks += "✓ $header header present"
            } else {
                $complianceChecks += "✗ $header header missing"
                $allCompliant = $false
            }
        }
        
        # Check audit logging endpoint
        $auditResponse = Invoke-WebRequest -Uri "$ApiUrl/audit/health" -TimeoutSec 30 -UseBasicParsing
        if ($auditResponse.StatusCode -eq 200) {
            $complianceChecks += "✓ Audit logging system operational"
        } else {
            $complianceChecks += "✗ Audit logging system not accessible"
            $allCompliant = $false
        }
        
        # Check encryption at rest indicator
        $encryptionResponse = Invoke-WebRequest -Uri "$ApiUrl/security/encryption-status" -TimeoutSec 30 -UseBasicParsing
        if ($encryptionResponse.StatusCode -eq 200) {
            $encryptionData = $encryptionResponse.Content | ConvertFrom-Json
            if ($encryptionData.encryption_at_rest -eq $true) {
                $complianceChecks += "✓ Encryption at rest confirmed"
            } else {
                $complianceChecks += "✗ Encryption at rest not confirmed"
                $allCompliant = $false
            }
        } else {
            $complianceChecks += "✗ Unable to verify encryption at rest"
            $allCompliant = $false
        }
        
        $duration = (Get-Date) - $startTime
        
        return @{
            Success = $allCompliant
            Details = $complianceChecks -join "; "
            Error = if ($allCompliant) { $null } else { "HIPAA compliance violations found" }
            Duration = $duration.TotalMilliseconds
        }
    }
    catch {
        $duration = (Get-Date) - $startTime
        return @{
            Success = $false
            Error = $_.Exception.Message
            Duration = $duration.TotalMilliseconds
        }
    }
}

# Test: Load Performance
function Test-LoadPerformance {
    if ($SkipSlowTests) {
        $script:SkippedTests++
        Write-ValidationLog "SKIPPED: Load Performance Test (--SkipSlowTests)" -Level "SKIP"
        return $true
    }
    
    $startTime = Get-Date
    $concurrent = 20
    $requests = 100
    
    try {
        $jobs = @()
        
        # Create concurrent requests
        for ($i = 1; $i -le $concurrent; $i++) {
            $job = Start-Job -ScriptBlock {
                param($BaseUrl, $RequestsPerJob)
                
                $results = @()
                for ($j = 1; $j -le $RequestsPerJob; $j++) {
                    try {
                        $start = Get-Date
                        $response = Invoke-WebRequest -Uri $BaseUrl -TimeoutSec 30 -UseBasicParsing
                        $end = Get-Date
                        
                        $results += @{
                            Success = ($response.StatusCode -eq 200)
                            ResponseTime = ($end - $start).TotalMilliseconds
                            StatusCode = $response.StatusCode
                        }
                    }
                    catch {
                        $results += @{
                            Success = $false
                            ResponseTime = 0
                            Error = $_.Exception.Message
                        }
                    }
                }
                return $results
            } -ArgumentList $BaseUrl, ([math]::Floor($requests / $concurrent))
            
            $jobs += $job
        }
        
        # Wait for all jobs to complete
        Wait-Job $jobs -Timeout 600 | Out-Null
        
        # Collect results
        $allResults = @()
        foreach ($job in $jobs) {
            $jobResults = Receive-Job $job
            $allResults += $jobResults
            Remove-Job $job
        }
        
        # Analyze results
        $successfulRequests = $allResults | Where-Object { $_.Success }
        $successRate = ($successfulRequests.Count / $allResults.Count) * 100
        
        if ($successfulRequests.Count -gt 0) {
            $avgResponseTime = ($successfulRequests | Measure-Object -Property ResponseTime -Average).Average
            $maxResponseTime = ($successfulRequests | Measure-Object -Property ResponseTime -Maximum).Maximum
            $minResponseTime = ($successfulRequests | Measure-Object -Property ResponseTime -Minimum).Minimum
        } else {
            $avgResponseTime = 0
            $maxResponseTime = 0
            $minResponseTime = 0
        }
        
        $duration = (Get-Date) - $startTime
        
        $success = $successRate -ge 95 -and $avgResponseTime -le 5000 # 95% success rate and 5s average response time
        
        return @{
            Success = $success
            Details = "Success rate: $([math]::Round($successRate, 2))%, Avg response: $([math]::Round($avgResponseTime, 2))ms, Max: $([math]::Round($maxResponseTime, 2))ms"
            Error = if ($success) { $null } else { "Load performance below acceptable thresholds" }
            Duration = $duration.TotalMilliseconds
        }
    }
    catch {
        # Clean up any remaining jobs
        Get-Job | Where-Object { $_.State -eq "Running" } | Stop-Job -Force | Remove-Job -Force
        
        $duration = (Get-Date) - $startTime
        return @{
            Success = $false
            Error = $_.Exception.Message
            Duration = $duration.TotalMilliseconds
        }
    }
}

# Test: Backup and Recovery Verification
function Test-BackupRecoveryVerification {
    $startTime = Get-Date
    
    try {
        # Check backup status
        $backupResponse = Invoke-WebRequest -Uri "$ApiUrl/admin/backup-status" -TimeoutSec 30 -UseBasicParsing
        
        if ($backupResponse.StatusCode -ne 200) {
            return @{
                Success = $false
                Error = "Backup status check failed with status $($backupResponse.StatusCode)"
                Duration = ((Get-Date) - $startTime).TotalMilliseconds
            }
        }
        
        $backupData = $backupResponse.Content | ConvertFrom-Json
        
        # Check if backup is recent (within last 24 hours)
        $lastBackup = [DateTime]::Parse($backupData.last_backup_time)
        $hoursSinceLastBackup = ((Get-Date) - $lastBackup).TotalHours
        
        if ($hoursSinceLastBackup -gt 24) {
            return @{
                Success = $false
                Error = "Last backup is too old: $([math]::Round($hoursSinceLastBackup, 2)) hours ago"
                Duration = ((Get-Date) - $startTime).TotalMilliseconds
            }
        }
        
        # Check backup integrity
        if ($backupData.integrity_check -ne "passed") {
            return @{
                Success = $false
                Error = "Backup integrity check failed: $($backupData.integrity_check)"
                Duration = ((Get-Date) - $startTime).TotalMilliseconds
            }
        }
        
        $duration = (Get-Date) - $startTime
        
        return @{
            Success = $true
            Details = "Last backup: $([math]::Round($hoursSinceLastBackup, 2)) hours ago, Integrity: $($backupData.integrity_check)"
            Duration = $duration.TotalMilliseconds
        }
    }
    catch {
        $duration = (Get-Date) - $startTime
        return @{
            Success = $false
            Error = $_.Exception.Message
            Duration = $duration.TotalMilliseconds
        }
    }
}

# Test: Monitoring Systems
function Test-MonitoringSystems {
    $startTime = Get-Date
    $monitoringChecks = @()
    $allHealthy = $true
    
    try {
        # Check Prometheus
        try {
            $prometheusResponse = Invoke-WebRequest -Uri "http://localhost:9090/api/v1/query?query=up" -TimeoutSec 10 -UseBasicParsing
            if ($prometheusResponse.StatusCode -eq 200) {
                $monitoringChecks += "✓ Prometheus accessible"
            } else {
                $monitoringChecks += "✗ Prometheus not accessible"
                $allHealthy = $false
            }
        }
        catch {
            $monitoringChecks += "✗ Prometheus connection failed"
            $allHealthy = $false
        }
        
        # Check Grafana
        try {
            $grafanaResponse = Invoke-WebRequest -Uri "http://localhost:3030/api/health" -TimeoutSec 10 -UseBasicParsing
            if ($grafanaResponse.StatusCode -eq 200) {
                $monitoringChecks += "✓ Grafana accessible"
            } else {
                $monitoringChecks += "✗ Grafana not accessible"
                $allHealthy = $false
            }
        }
        catch {
            $monitoringChecks += "✗ Grafana connection failed"
            $allHealthy = $false
        }
        
        # Check AlertManager
        try {
            $alertmanagerResponse = Invoke-WebRequest -Uri "http://localhost:9093/api/v1/status" -TimeoutSec 10 -UseBasicParsing
            if ($alertmanagerResponse.StatusCode -eq 200) {
                $monitoringChecks += "✓ AlertManager accessible"
            } else {
                $monitoringChecks += "✗ AlertManager not accessible"
                $allHealthy = $false
            }
        }
        catch {
            $monitoringChecks += "✗ AlertManager connection failed"
            $allHealthy = $false
        }
        
        $duration = (Get-Date) - $startTime
        
        return @{
            Success = $allHealthy
            Details = $monitoringChecks -join "; "
            Error = if ($allHealthy) { $null } else { "Some monitoring systems are not accessible" }
            Duration = $duration.TotalMilliseconds
        }
    }
    catch {
        $duration = (Get-Date) - $startTime
        return @{
            Success = $false
            Error = $_.Exception.Message
            Duration = $duration.TotalMilliseconds
        }
    }
}

# Generate validation report
function Generate-ValidationReport {
    $endTime = Get-Date
    $totalDuration = $endTime - $script:StartTime
    
    $report = @{
        ExecutionSummary = @{
            StartTime = $script:StartTime
            EndTime = $endTime
            TotalDuration = $totalDuration.ToString()
            Environment = $Environment
            BaseUrl = $BaseUrl
            ApiUrl = $ApiUrl
        }
        TestStatistics = @{
            TotalTests = $script:TotalTests
            PassedTests = $script:PassedTests
            FailedTests = $script:FailedTests
            SkippedTests = $script:SkippedTests
            SuccessRate = if ($script:TotalTests -gt 0) { [math]::Round(($script:PassedTests / $script:TotalTests) * 100, 2) } else { 0 }
        }
        TestResults = $script:TestResults
        CriticalFailures = @()
        Recommendations = @()
    }
    
    # Identify critical failures
    foreach ($testName in $script:TestResults.Keys) {
        $test = $script:TestResults[$testName]
        if ($test.Critical -and $test.Status -eq "FAILED") {
            $report.CriticalFailures += @{
                TestName = $testName
                Error = $test.Error
            }
        }
    }
    
    # Generate recommendations
    if ($script:FailedTests -gt 0) {
        $report.Recommendations += "Review and resolve failed tests before production deployment"
    }
    
    if ($report.CriticalFailures.Count -gt 0) {
        $report.Recommendations += "CRITICAL: Address all critical failures immediately - deployment not recommended"
    }
    
    if ($script:TestResults.ContainsKey("Crisis Response Time") -and $script:TestResults["Crisis Response Time"].Status -eq "FAILED") {
        $report.Recommendations += "URGENT: Crisis response time exceeds safety requirements - investigate immediately"
    }
    
    $reportJson = $report | ConvertTo-Json -Depth 10
    $reportFile = "reports\production-validation-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    
    New-Item -ItemType Directory -Path "reports" -Force -ErrorAction SilentlyContinue
    Set-Content -Path $reportFile -Value $reportJson
    
    Write-ValidationLog "Validation report generated: $reportFile" -Level "INFO"
    return $report
}

# Main execution
try {
    Write-ValidationLog "Starting Serenity Healthcare Platform production validation" -Level "INFO"
    Write-ValidationLog "Environment: $Environment" -Level "INFO"
    Write-ValidationLog "Base URL: $BaseUrl" -Level "INFO"
    Write-ValidationLog "API URL: $ApiUrl" -Level "INFO"
    
    # Run validation tests
    Write-ValidationLog "Running validation test suite..." -Level "INFO"
    
    # Critical tests (will stop execution if failed)
    Start-ValidationTest -TestName "Application Availability" -TestScript { Test-ApplicationAvailability } -Critical $true
    Start-ValidationTest -TestName "API Health Endpoints" -TestScript { Test-APIHealthEndpoints } -Critical $true
    Start-ValidationTest -TestName "Crisis Response Time" -TestScript { Test-CrisisResponseTime } -Critical $true
    Start-ValidationTest -TestName "Database Connectivity" -TestScript { Test-DatabaseConnectivity } -Critical $true
    Start-ValidationTest -TestName "HIPAA Compliance" -TestScript { Test-HIPAACompliance } -Critical $true
    
    # Non-critical tests
    Start-ValidationTest -TestName "Authentication Flow" -TestScript { Test-AuthenticationFlow }
    Start-ValidationTest -TestName "Load Performance" -TestScript { Test-LoadPerformance }
    Start-ValidationTest -TestName "Backup Recovery Verification" -TestScript { Test-BackupRecoveryVerification }
    Start-ValidationTest -TestName "Monitoring Systems" -TestScript { Test-MonitoringSystems }
    
    # Generate and display results
    Write-ValidationLog "" -Level "INFO"
    Write-ValidationLog "=== VALIDATION RESULTS ===" -Level "INFO"
    Write-ValidationLog "Total Tests: $script:TotalTests" -Level "INFO"
    Write-ValidationLog "Passed: $script:PassedTests" -Level "PASS"
    Write-ValidationLog "Failed: $script:FailedTests" -Level $(if ($script:FailedTests -gt 0) { "FAIL" } else { "INFO" })
    Write-ValidationLog "Skipped: $script:SkippedTests" -Level $(if ($script:SkippedTests -gt 0) { "SKIP" } else { "INFO" })
    
    $successRate = if ($script:TotalTests -gt 0) { [math]::Round(($script:PassedTests / $script:TotalTests) * 100, 2) } else { 0 }
    Write-ValidationLog "Success Rate: $successRate%" -Level $(if ($successRate -ge 90) { "PASS" } else { "FAIL" })
    
    if ($GenerateReport) {
        $report = Generate-ValidationReport
        Write-ValidationLog "Detailed report available in reports directory" -Level "INFO"
    }
    
    # Determine final result
    $criticalFailures = ($script:TestResults.GetEnumerator() | Where-Object { $_.Value.Critical -and $_.Value.Status -eq "FAILED" }).Count
    
    if ($criticalFailures -gt 0) {
        Write-ValidationLog "PRODUCTION VALIDATION FAILED: $criticalFailures critical test(s) failed" -Level "FAIL"
        Write-ValidationLog "RECOMMENDATION: DO NOT PROCEED WITH PRODUCTION DEPLOYMENT" -Level "FAIL"
        exit 1
    } elseif ($script:FailedTests -gt 0) {
        Write-ValidationLog "PRODUCTION VALIDATION COMPLETED WITH WARNINGS: $script:FailedTests test(s) failed" -Level "WARN"
        Write-ValidationLog "RECOMMENDATION: Review failed tests before production deployment" -Level "WARN"
        exit 2
    } else {
        Write-ValidationLog "PRODUCTION VALIDATION PASSED: All tests successful" -Level "PASS"
        Write-ValidationLog "RECOMMENDATION: System ready for production deployment" -Level "PASS"
        exit 0
    }
}
catch {
    Write-ValidationLog "Validation suite failed with exception: $($_.Exception.Message)" -Level "FAIL"
    Write-ValidationLog "Stack trace: $($_.ScriptStackTrace)" -Level "FAIL"
    
    if ($GenerateReport) {
        Generate-ValidationReport
    }
    
    exit 3
}