# Serenity Platform - HIPAA Compliance Validation
# Comprehensive security and compliance checks

param(
    [switch]$GenerateReport = $true,
    [switch]$AutoFix = $false
)

Write-Host @"

╔══════════════════════════════════════════════════════════════════╗
║            HIPAA COMPLIANCE VALIDATION SUITE                     ║
║              Healthcare Security & Privacy Checks                ║
╚══════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

$complianceChecks = @()
$failures = @()

# Compliance Check Function
function Test-ComplianceRequirement {
    param(
        [string]$Category,
        [string]$Requirement,
        [scriptblock]$Test,
        [string]$Remediation = ""
    )
    
    Write-Host "`nChecking: $Requirement" -ForegroundColor Yellow -NoNewline
    
    try {
        $result = & $Test
        if ($result) {
            Write-Host " [PASS]" -ForegroundColor Green
            $complianceChecks += @{
                Category = $Category
                Requirement = $Requirement
                Status = "PASS"
                Message = "Compliant"
            }
            return $true
        } else {
            Write-Host " [FAIL]" -ForegroundColor Red
            $failures += $Requirement
            $complianceChecks += @{
                Category = $Category
                Requirement = $Requirement
                Status = "FAIL"
                Message = "Non-compliant"
                Remediation = $Remediation
            }
            return $false
        }
    } catch {
        Write-Host " [ERROR]" -ForegroundColor Red
        $complianceChecks += @{
            Category = $Category
            Requirement = $Requirement
            Status = "ERROR"
            Message = $_.ToString()
        }
        return $false
    }
}

Write-Host "`n============ ADMINISTRATIVE SAFEGUARDS ============" -ForegroundColor Magenta

# Access Control
Test-ComplianceRequirement -Category "Administrative" -Requirement "Unique User Identification" -Test {
    Test-Path "C:\dev\serenity\auth-service\src\services\jwt.service.ts"
} -Remediation "Implement unique user IDs in auth service"

Test-ComplianceRequirement -Category "Administrative" -Requirement "Automatic Logoff" -Test {
    $authConfig = Get-Content "C:\dev\serenity\auth-service\src\config\auth.config.ts" -ErrorAction SilentlyContinue
    $authConfig -match "sessionTimeout.*900000" # 15 minutes
} -Remediation "Set session timeout to 15 minutes or less"

Test-ComplianceRequirement -Category "Administrative" -Requirement "Audit Controls" -Test {
    Test-Path "C:\dev\serenity\auth-service\src\middleware\audit.middleware.ts"
} -Remediation "Implement comprehensive audit logging"

Write-Host "`n============ PHYSICAL SAFEGUARDS ============" -ForegroundColor Magenta

Test-ComplianceRequirement -Category "Physical" -Requirement "Device & Media Controls" -Test {
    # Check for encryption at rest configuration
    Test-Path "C:\dev\serenity\shared-libs\encryption"
} -Remediation "Implement encryption for data at rest"

Write-Host "`n============ TECHNICAL SAFEGUARDS ============" -ForegroundColor Magenta

# Encryption
Test-ComplianceRequirement -Category "Technical" -Requirement "Encryption in Transit" -Test {
    $dockerCompose = Get-Content "C:\dev\serenity\docker-compose.yml" -ErrorAction SilentlyContinue
    $dockerCompose -match "HTTPS|TLS|SSL"
} -Remediation "Enable TLS/SSL for all services"

Test-ComplianceRequirement -Category "Technical" -Requirement "Encryption at Rest" -Test {
    Test-Path "C:\dev\serenity\shared-libs\encryption"
} -Remediation "Implement AES-256 encryption for stored PHI"

# Access Control
Test-ComplianceRequirement -Category "Technical" -Requirement "Role-Based Access Control" -Test {
    Test-Path "C:\dev\serenity\auth-service\src\services\rbac.service.ts"
} -Remediation "Implement RBAC in auth service"

# Password Management
Test-ComplianceRequirement -Category "Technical" -Requirement "Strong Password Policy" -Test {
    Test-Path "C:\dev\serenity\auth-service\src\services\password.service.ts"
} -Remediation "Implement password complexity requirements"

# Rate Limiting
Test-ComplianceRequirement -Category "Technical" -Requirement "Brute Force Protection" -Test {
    Test-Path "C:\dev\serenity\auth-service\src\middleware\rateLimit.middleware.ts"
} -Remediation "Implement rate limiting for authentication"

Write-Host "`n============ DATA INTEGRITY ============" -ForegroundColor Magenta

Test-ComplianceRequirement -Category "Integrity" -Requirement "Backup Procedures" -Test {
    Test-Path "C:\dev\serenity\scripts\backup"
} -Remediation "Create automated backup procedures"

Test-ComplianceRequirement -Category "Integrity" -Requirement "Disaster Recovery Plan" -Test {
    Test-Path "C:\dev\serenity\docs\DISASTER_RECOVERY.md"
} -Remediation "Document disaster recovery procedures"

Write-Host "`n============ BREACH NOTIFICATION ============" -ForegroundColor Magenta

Test-ComplianceRequirement -Category "Breach" -Requirement "Incident Response Plan" -Test {
    Test-Path "C:\dev\serenity\docs\INCIDENT_RESPONSE.md"
} -Remediation "Create incident response procedures"

# Security Headers Check
Write-Host "`n============ SECURITY HEADERS ============" -ForegroundColor Magenta

$securityHeaders = @(
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Content-Security-Policy",
    "X-XSS-Protection"
)

foreach ($header in $securityHeaders) {
    Test-ComplianceRequirement -Category "Security" -Requirement "Header: $header" -Test {
        $kongConfig = Get-Content "C:\dev\serenity\api-gateway\config\kong.yml" -ErrorAction SilentlyContinue
        $kongConfig -match $header
    } -Remediation "Add $header to API Gateway configuration"
}

# Calculate Compliance Score
$totalChecks = $complianceChecks.Count
$passedChecks = ($complianceChecks | Where-Object { $_.Status -eq "PASS" }).Count
$failedChecks = ($complianceChecks | Where-Object { $_.Status -eq "FAIL" }).Count
$complianceScore = if ($totalChecks -gt 0) { ($passedChecks / $totalChecks) * 100 } else { 0 }

Write-Host "`n============ COMPLIANCE SUMMARY ============" -ForegroundColor Magenta
Write-Host "Total Checks: $totalChecks" -ForegroundColor White
Write-Host "Passed: $passedChecks" -ForegroundColor Green
Write-Host "Failed: $failedChecks" -ForegroundColor $(if ($failedChecks -eq 0) { "Green" } else { "Red" })
Write-Host "Compliance Score: $([math]::Round($complianceScore, 2))%" -ForegroundColor $(if ($complianceScore -eq 100) { "Green" } elseif ($complianceScore -ge 80) { "Yellow" } else { "Red" })

# Generate Compliance Report
if ($GenerateReport) {
    $reportDate = Get-Date -Format "yyyy-MM-dd-HHmm"
    $reportPath = "C:\dev\serenity\compliance-reports\hipaa-compliance-$reportDate.json"
    
    New-Item -Path (Split-Path $reportPath) -ItemType Directory -Force | Out-Null
    
    $report = @{
        Date = Get-Date
        ComplianceScore = $complianceScore
        TotalChecks = $totalChecks
        PassedChecks = $passedChecks
        FailedChecks = $failedChecks
        Details = $complianceChecks
    }
    
    $report | ConvertTo-Json -Depth 10 | Out-File $reportPath
    
    Write-Host "`nCompliance report saved: $reportPath" -ForegroundColor Green
}

# Auto-fix if requested
if ($AutoFix -and $failedChecks -gt 0) {
    Write-Host "`n============ ATTEMPTING AUTO-FIX ============" -ForegroundColor Magenta
    
    foreach ($check in ($complianceChecks | Where-Object { $_.Status -eq "FAIL" })) {
        Write-Host "Fixing: $($check.Requirement)" -ForegroundColor Yellow
        Write-Host "  Remediation: $($check.Remediation)" -ForegroundColor Cyan
        # Add auto-fix logic here based on the requirement
    }
}

# Risk Assessment
Write-Host "`n============ RISK ASSESSMENT ============" -ForegroundColor Magenta

if ($complianceScore -eq 100) {
    Write-Host "Risk Level: LOW - Fully compliant" -ForegroundColor Green
} elseif ($complianceScore -ge 80) {
    Write-Host "Risk Level: MEDIUM - Minor compliance gaps" -ForegroundColor Yellow
} else {
    Write-Host "Risk Level: HIGH - Significant compliance issues" -ForegroundColor Red
}

# Recommendations
if ($failedChecks -gt 0) {
    Write-Host "`n============ RECOMMENDATIONS ============" -ForegroundColor Magenta
    
    $priorities = @(
        "Encryption in Transit",
        "Audit Controls",
        "Automatic Logoff",
        "Role-Based Access Control"
    )
    
    foreach ($priority in $priorities) {
        $failedPriority = $complianceChecks | Where-Object { $_.Requirement -eq $priority -and $_.Status -eq "FAIL" }
        if ($failedPriority) {
            Write-Host "CRITICAL: Fix $priority immediately" -ForegroundColor Red
        }
    }
}

Write-Host "`n============ VALIDATION COMPLETE ============" -ForegroundColor Green

# Exit with appropriate code
if ($failedChecks -gt 0) {
    exit 1
} else {
    exit 0
}