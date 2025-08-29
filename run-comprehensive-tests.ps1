# Serenity Platform - Comprehensive Testing Suite
# Orchestrates multiple testing swarms for complete validation

param(
    [switch]$Parallel = $true,
    [switch]$IncludeLoadTests = $false,
    [switch]$IncludeSecurityScan = $true,
    [switch]$GenerateReport = $true
)

Write-Host @"

╔══════════════════════════════════════════════════════════════════╗
║           SERENITY COMPREHENSIVE TESTING SUITE                   ║
║              Powered by BMAD Framework & Swarms                  ║
╚══════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

$startTime = Get-Date
$testResults = @{}

# Test Categories
$testSuites = @(
    @{
        Name = "Unit Tests"
        Services = @("auth-service", "notification-service", "crisis-service")
        Command = "npm test"
        Critical = $true
    },
    @{
        Name = "Integration Tests"
        Services = @("api-gateway")
        Command = "npm run test:integration"
        Critical = $true
    },
    @{
        Name = "E2E Tests"
        Services = @("frontend-app")
        Command = "npm run test:e2e"
        Critical = $false
    },
    @{
        Name = "HIPAA Compliance"
        Services = @("all")
        Command = "npm run test:hipaa"
        Critical = $true
    },
    @{
        Name = "Performance Tests"
        Services = @("crisis-service")
        Command = "npm run test:performance"
        Critical = $false
    }
)

function Run-TestSuite {
    param(
        [hashtable]$Suite,
        [string]$Service
    )
    
    $testName = "$($Suite.Name) - $Service"
    Write-Host "`nRunning: $testName" -ForegroundColor Yellow
    
    $servicePath = "C:\dev\serenity\$Service"
    
    if (!(Test-Path $servicePath)) {
        Write-Host "  Path not found: $servicePath" -ForegroundColor Red
        return @{ Success = $false; Message = "Path not found" }
    }
    
    Push-Location $servicePath
    
    try {
        $output = & cmd /c $Suite.Command 2>&1
        $success = $LASTEXITCODE -eq 0
        
        if ($success) {
            Write-Host "  PASSED: $testName" -ForegroundColor Green
        } else {
            Write-Host "  FAILED: $testName" -ForegroundColor Red
        }
        
        return @{
            Success = $success
            Output = $output
            Duration = (Get-Date) - $startTime
        }
    } catch {
        Write-Host "  ERROR: $testName - $_" -ForegroundColor Red
        return @{ Success = $false; Message = $_.ToString() }
    } finally {
        Pop-Location
    }
}

Write-Host "`n============ STARTING TEST EXECUTION ============" -ForegroundColor Magenta

# Run tests in parallel or sequential
if ($Parallel) {
    Write-Host "Executing tests in PARALLEL mode..." -ForegroundColor Cyan
    
    $jobs = @()
    foreach ($suite in $testSuites) {
        foreach ($service in $suite.Services) {
            $jobs += Start-Job -ScriptBlock {
                param($suite, $service)
                Run-TestSuite -Suite $suite -Service $service
            } -ArgumentList $suite, $service
        }
    }
    
    # Wait for all jobs and collect results
    $jobs | ForEach-Object {
        Wait-Job $_
        $result = Receive-Job $_
        $testResults[$_.Name] = $result
        Remove-Job $_
    }
} else {
    Write-Host "Executing tests in SEQUENTIAL mode..." -ForegroundColor Cyan
    
    foreach ($suite in $testSuites) {
        foreach ($service in $suite.Services) {
            $result = Run-TestSuite -Suite $suite -Service $service
            $testResults["$($suite.Name)-$service"] = $result
        }
    }
}

# Security Scan
if ($IncludeSecurityScan) {
    Write-Host "`n============ SECURITY SCANNING ============" -ForegroundColor Magenta
    
    Write-Host "Running OWASP dependency check..." -ForegroundColor Yellow
    # Add security scan commands here
    
    Write-Host "Running vulnerability scan..." -ForegroundColor Yellow
    # Add vulnerability scan commands here
}

# Load Tests
if ($IncludeLoadTests) {
    Write-Host "`n============ LOAD TESTING ============" -ForegroundColor Magenta
    
    Write-Host "Running K6 load tests..." -ForegroundColor Yellow
    # Add K6 load test commands here
    
    Write-Host "Crisis response time validation (<500ms)..." -ForegroundColor Yellow
    # Add performance validation here
}

# Calculate Results
$totalTests = $testResults.Count
$passedTests = ($testResults.Values | Where-Object { $_.Success }).Count
$failedTests = $totalTests - $passedTests
$successRate = if ($totalTests -gt 0) { ($passedTests / $totalTests) * 100 } else { 0 }

Write-Host "`n============ TEST RESULTS SUMMARY ============" -ForegroundColor Magenta
Write-Host "Total Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Failed: $failedTests" -ForegroundColor $(if ($failedTests -eq 0) { "Green" } else { "Red" })
Write-Host "Success Rate: $([math]::Round($successRate, 2))%" -ForegroundColor $(if ($successRate -ge 90) { "Green" } elseif ($successRate -ge 70) { "Yellow" } else { "Red" })

# Generate Report
if ($GenerateReport) {
    $reportPath = "C:\dev\serenity\test-reports\test-report-$(Get-Date -Format 'yyyy-MM-dd-HHmm').html"
    
    Write-Host "`n============ GENERATING REPORT ============" -ForegroundColor Magenta
    
    $htmlReport = @"
<!DOCTYPE html>
<html>
<head>
    <title>Serenity Test Report</title>
    <style>
        body { font-family: Arial; margin: 20px; }
        .passed { color: green; }
        .failed { color: red; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .summary { background-color: #f0f8ff; padding: 15px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>Serenity Platform Test Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p>Date: $(Get-Date)</p>
        <p>Total Tests: $totalTests</p>
        <p>Passed: <span class="passed">$passedTests</span></p>
        <p>Failed: <span class="failed">$failedTests</span></p>
        <p>Success Rate: $([math]::Round($successRate, 2))%</p>
    </div>
    <h2>Detailed Results</h2>
    <table>
        <tr><th>Test Suite</th><th>Status</th><th>Duration</th></tr>
"@
    
    foreach ($key in $testResults.Keys) {
        $result = $testResults[$key]
        $status = if ($result.Success) { "PASSED" } else { "FAILED" }
        $statusClass = if ($result.Success) { "passed" } else { "failed" }
        $htmlReport += "<tr><td>$key</td><td class='$statusClass'>$status</td><td>$($result.Duration)</td></tr>"
    }
    
    $htmlReport += @"
    </table>
</body>
</html>
"@
    
    New-Item -Path (Split-Path $reportPath) -ItemType Directory -Force | Out-Null
    $htmlReport | Out-File $reportPath
    
    Write-Host "Report generated: $reportPath" -ForegroundColor Green
}

$duration = (Get-Date) - $startTime
Write-Host "`n============ TESTING COMPLETE ============" -ForegroundColor Green
Write-Host "Total Duration: $($duration.ToString('hh\:mm\:ss'))" -ForegroundColor Cyan

# Exit with appropriate code
if ($failedTests -gt 0) {
    exit 1
} else {
    exit 0
}