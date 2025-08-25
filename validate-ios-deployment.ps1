# iOS Deployment Validation Script
Write-Host "iOS Deployment Readiness Validator" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

$errors = 0
$warnings = 0

# Function to check item
function Test-Item {
    param(
        [string]$Name,
        [scriptblock]$Test,
        [string]$ErrorMessage,
        [bool]$IsWarning = $false
    )
    
    Write-Host -NoNewline "Checking $Name... "
    
    $result = & $Test
    if ($result) {
        Write-Host "[OK]" -ForegroundColor Green
        return $true
    } else {
        if ($IsWarning) {
            Write-Host "[WARNING]" -ForegroundColor Yellow
            Write-Host "  $ErrorMessage" -ForegroundColor Gray
            $script:warnings++
        } else {
            Write-Host "[ERROR]" -ForegroundColor Red
            Write-Host "  $ErrorMessage" -ForegroundColor Gray
            $script:errors++
        }
        return $false
    }
}

Write-Host "=== GitHub Repository ===" -ForegroundColor Yellow

# Check Git
Test-Item "Git installation" {
    Get-Command git -ErrorAction SilentlyContinue
} -ErrorMessage "Git is not installed"

# Check GitHub CLI
Test-Item "GitHub CLI" {
    Get-Command gh -ErrorAction SilentlyContinue
} -ErrorMessage "GitHub CLI is not installed"

# Check repository
Test-Item "Git repository" {
    git rev-parse --git-dir 2>$null
} -ErrorMessage "Not in a git repository"

# Check GitHub authentication
Test-Item "GitHub authentication" {
    gh auth status 2>$null
    $LASTEXITCODE -eq 0
} -ErrorMessage "Not authenticated with GitHub. Run: gh auth login"

Write-Host ""
Write-Host "=== GitHub Secrets ===" -ForegroundColor Yellow

# Get list of secrets
$secrets = gh secret list --json name | ConvertFrom-Json
$secretNames = $secrets | ForEach-Object { $_.name }

# Required secrets
$requiredSecrets = @(
    "APP_STORE_CONNECT_API_KEY",
    "APP_STORE_CONNECT_KEY_ID",
    "APP_STORE_CONNECT_ISSUER_ID",
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY"
)

# Certificate secrets (at least one set required)
$certSecretSets = @(
    @("IOS_DISTRIBUTION_CERTIFICATE_BASE64", "IOS_PROVISION_PROFILE_BASE64"),
    @("IOS_CERTIFICATE", "IOS_PROVISION_PROFILE")
)

foreach ($secret in $requiredSecrets) {
    Test-Item "Secret: $secret" {
        $secretNames -contains $secret
    } -ErrorMessage "Required secret not found. Set with: gh secret set $secret"
}

# Check certificate secrets
$hasCertSecrets = $false
foreach ($set in $certSecretSets) {
    $hasAll = $true
    foreach ($secret in $set) {
        if ($secretNames -notcontains $secret) {
            $hasAll = $false
            break
        }
    }
    if ($hasAll) {
        $hasCertSecrets = $true
        Write-Host "Certificate secrets found: $($set -join ', ')" -ForegroundColor Green
        break
    }
}

if (-not $hasCertSecrets) {
    Write-Host "[ERROR] Certificate secrets missing" -ForegroundColor Red
    Write-Host "  Need either IOS_DISTRIBUTION_CERTIFICATE_BASE64 + IOS_PROVISION_PROFILE_BASE64" -ForegroundColor Gray
    Write-Host "  OR IOS_CERTIFICATE + IOS_PROVISION_PROFILE" -ForegroundColor Gray
    $errors++
}

Write-Host ""
Write-Host "=== Local Certificates ===" -ForegroundColor Yellow

$certPath = "C:\ios-certs"

# Check certificate files
Test-Item "Certificate directory" {
    Test-Path $certPath
} -ErrorMessage "Certificate directory not found: $certPath" -IsWarning $true

if (Test-Path $certPath) {
    Test-Item "Distribution certificate" {
        (Test-Path "$certPath\ios_distribution.p12") -or (Test-Path "$certPath\ios_distribution.pfx")
    } -ErrorMessage "No distribution certificate found (.p12 or .pfx)" -IsWarning $true
    
    Test-Item "Provisioning profile" {
        Test-Path "$certPath\Serenity_App_Store_Profile.mobileprovision"
    } -ErrorMessage "Provisioning profile not found" -IsWarning $true
    
    Test-Item "API key" {
        Test-Path "$certPath\AuthKey_4YBU7UC32Y.p8"
    } -ErrorMessage "API key file not found" -IsWarning $true
}

Write-Host ""
Write-Host "=== Project Files ===" -ForegroundColor Yellow

# Check important files
Test-Item "Package.json" {
    Test-Path "package.json"
} -ErrorMessage "package.json not found"

Test-Item "iOS project" {
    Test-Path "ios\App\App.xcworkspace"
} -ErrorMessage "iOS project not found"

Test-Item "Capacitor config" {
    Test-Path "capacitor.config.ts" -or Test-Path "capacitor.config.json"
} -ErrorMessage "Capacitor configuration not found"

Test-Item "Fastlane" {
    Test-Path "ios\fastlane\Fastfile"
} -ErrorMessage "Fastlane not configured" -IsWarning $true

Test-Item "Ultimate workflow" {
    Test-Path ".github\workflows\ios-deploy-ultimate.yml"
} -ErrorMessage "Ultimate deployment workflow not found"

Write-Host ""
Write-Host "=== Dependencies ===" -ForegroundColor Yellow

# Check Node.js
Test-Item "Node.js" {
    Get-Command node -ErrorAction SilentlyContinue
} -ErrorMessage "Node.js is not installed"

# Check npm
Test-Item "npm" {
    Get-Command npm -ErrorAction SilentlyContinue
} -ErrorMessage "npm is not installed"

# Check node_modules
Test-Item "Node modules" {
    Test-Path "node_modules"
} -ErrorMessage "Dependencies not installed. Run: npm install" -IsWarning $true

Write-Host ""
Write-Host "=== Workflow Status ===" -ForegroundColor Yellow

# Check latest workflow runs
$workflowRuns = gh run list --workflow="iOS Deploy Ultimate" --limit 3 --json status,conclusion,name 2>$null | ConvertFrom-Json

if ($workflowRuns.Count -gt 0) {
    Write-Host "Recent workflow runs:" -ForegroundColor Cyan
    foreach ($run in $workflowRuns) {
        $status = if ($run.conclusion -eq "success") { "Success" } elseif ($run.conclusion) { $run.conclusion } else { $run.status }
        $color = if ($status -eq "Success") { "Green" } elseif ($status -eq "in_progress") { "Yellow" } else { "Red" }
        Write-Host "  - $($run.name): $status" -ForegroundColor $color
    }
} else {
    Write-Host "No workflow runs found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "===============================" -ForegroundColor Cyan
Write-Host "VALIDATION SUMMARY" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

if ($errors -eq 0 -and $warnings -eq 0) {
    Write-Host "✅ All checks passed! Ready to deploy." -ForegroundColor Green
    Write-Host ""
    Write-Host "Deploy with:" -ForegroundColor White
    Write-Host "  gh workflow run 'iOS Deploy Ultimate' -f deployment_type=testflight" -ForegroundColor Cyan
} elseif ($errors -eq 0) {
    Write-Host "⚠️ $warnings warning(s) found but deployment should work." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Deploy with:" -ForegroundColor White
    Write-Host "  gh workflow run 'iOS Deploy Ultimate' -f deployment_type=testflight" -ForegroundColor Cyan
} else {
    Write-Host "❌ $errors error(s) and $warnings warning(s) found." -ForegroundColor Red
    Write-Host ""
    Write-Host "Fix the errors above before deploying." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "For detailed help, run:" -ForegroundColor Gray
Write-Host "  Get-Content DEPLOY-NOW.md" -ForegroundColor Gray