# Simple Fastlane Match Validation Script
# This script validates the basic Fastlane Match setup

param(
    [switch]$Verbose
)

Write-Host "🔍 Fastlane Match Setup Validation" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check 1: GitHub repository exists
Write-Host "1. Testing GitHub repository..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://github.com/ccbuildalot23/serenity-ios-certificates" -Method Head -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Repository exists and is accessible" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Repository not accessible" -ForegroundColor Red
        $allGood = $false
    }
} catch {
    Write-Host "   ❌ Repository test failed: $($_.Exception.Message)" -ForegroundColor Red
    $allGood = $false
}

# Check 2: iOS project structure
Write-Host "2. Checking iOS project structure..." -ForegroundColor Yellow
$iosPath = Join-Path $PSScriptRoot "..\ios"
if (Test-Path $iosPath) {
    Write-Host "   ✅ iOS directory exists" -ForegroundColor Green
    
    $fastfilePath = Join-Path $iosPath "fastlane\Fastfile"
    if (Test-Path $fastfilePath) {
        Write-Host "   ✅ Fastfile exists" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Fastfile missing" -ForegroundColor Red
        $allGood = $false
    }
    
    $matchfilePath = Join-Path $iosPath "fastlane\Matchfile"
    if (Test-Path $matchfilePath) {
        Write-Host "   ✅ Matchfile exists" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Matchfile missing" -ForegroundColor Red
        $allGood = $false
    }
    
} else {
    Write-Host "   ❌ iOS directory not found" -ForegroundColor Red
    $allGood = $false
}

# Check 3: GitHub secrets (simulate checking)
Write-Host "3. Checking GitHub secrets configuration..." -ForegroundColor Yellow
$requiredSecrets = @(
    'MATCH_PASSWORD',
    'MATCH_KEYCHAIN_PASSWORD',
    'APP_STORE_CONNECT_KEY_ID',
    'APP_STORE_CONNECT_ISSUER_ID',
    'APP_STORE_CONNECT_API_KEY'
)

foreach ($secret in $requiredSecrets) {
    if (Get-ChildItem env: | Where-Object Name -eq $secret) {
        Write-Host "   ✅ $secret is configured" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  $secret not found in environment (may be in GitHub)" -ForegroundColor Yellow
    }
}

# Check 4: Validate current secrets list
Write-Host "4. Validating current GitHub secrets..." -ForegroundColor Yellow
try {
    $secretsList = gh secret list --repo ccbuildalot23/serenity-sober-pathways-guide
    if ($secretsList -match "MATCH_PASSWORD") {
        Write-Host "   ✅ MATCH_PASSWORD configured in GitHub" -ForegroundColor Green
    } else {
        Write-Host "   ❌ MATCH_PASSWORD missing in GitHub" -ForegroundColor Red
        $allGood = $false
    }
    
    if ($secretsList -match "APP_STORE_CONNECT_KEY_ID") {
        Write-Host "   ✅ App Store Connect API configured" -ForegroundColor Green
    } else {
        Write-Host "   ❌ App Store Connect API missing" -ForegroundColor Red
        $allGood = $false
    }
} catch {
    Write-Host "   ⚠️  Could not validate GitHub secrets (gh CLI may not be authenticated)" -ForegroundColor Yellow
}

# Check 5: Workflow file
Write-Host "5. Checking GitHub Actions workflow..." -ForegroundColor Yellow
$workflowPath = Join-Path $PSScriptRoot "..\.github\workflows\ios-deploy-fastlane-match.yml"
if (Test-Path $workflowPath) {
    Write-Host "   ✅ iOS deployment workflow exists" -ForegroundColor Green
} else {
    Write-Host "   ❌ iOS deployment workflow missing" -ForegroundColor Red
    $allGood = $false
}

# Final result
Write-Host ""
Write-Host "📊 Validation Summary" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan

if ($allGood) {
    Write-Host "🎉 All critical checks passed! Ready for Fastlane Match deployment." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor White
    Write-Host "1. Push changes to trigger the workflow" -ForegroundColor White
    Write-Host "2. Monitor the deployment in GitHub Actions" -ForegroundColor White
    Write-Host "3. Check TestFlight for the new build" -ForegroundColor White
    exit 0
} else {
    Write-Host "⚠️  Some issues found. Please address them before deployment." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor White
    Write-Host "- Ensure GitHub repository is private and accessible" -ForegroundColor White
    Write-Host "- Verify all secrets are set in GitHub repository settings" -ForegroundColor White
    Write-Host "- Check that iOS project structure is correct" -ForegroundColor White
    exit 1
}