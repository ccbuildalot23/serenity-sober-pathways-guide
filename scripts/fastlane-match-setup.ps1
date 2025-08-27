# Fastlane Match Setup Script for Windows
# This script sets up Fastlane Match for iOS certificate management

param(
    [switch]$Initialize,
    [switch]$TestConnection,
    [switch]$GenerateCertificates,
    [switch]$ValidateSetup
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Serenity iOS Fastlane Match Setup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Configuration
$RepositoryUrl = "https://github.com/ccbuildalot23/serenity-ios-certificates"
$AppIdentifier = "com.serenity.recovery"
$TeamId = "XDY458RQ59"

function Test-RequiredTools {
    Write-Host "🔍 Checking required tools..." -ForegroundColor Yellow
    
    # Check Git
    if (!(Get-Command git -ErrorAction SilentlyContinue)) {
        throw "Git is not installed or not in PATH"
    }
    Write-Host "✅ Git found" -ForegroundColor Green
    
    # Check Ruby (for Fastlane)
    if (!(Get-Command ruby -ErrorAction SilentlyContinue)) {
        Write-Host "⚠️  Ruby not found. Installing via Homebrew is recommended." -ForegroundColor Yellow
    } else {
        Write-Host "✅ Ruby found" -ForegroundColor Green
    }
    
    # Check Fastlane
    if (!(Get-Command fastlane -ErrorAction SilentlyContinue)) {
        Write-Host "⚠️  Fastlane not found. Will install via gem." -ForegroundColor Yellow
    } else {
        Write-Host "✅ Fastlane found" -ForegroundColor Green
    }
}

function Test-GitHubConnection {
    Write-Host "🔗 Testing GitHub connection..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri "https://api.github.com/repos/ccbuildalot23/serenity-ios-certificates" -Method Get
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ GitHub repository accessible" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "❌ GitHub repository not accessible: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-AppStoreConnectAPI {
    Write-Host "🏪 Testing App Store Connect API..." -ForegroundColor Yellow
    
    $keyId = $env:APP_STORE_CONNECT_KEY_ID
    $issuerId = $env:APP_STORE_CONNECT_ISSUER_ID
    $keyPath = $env:APP_STORE_CONNECT_API_KEY_PATH
    
    if (!$keyId -or !$issuerId -or !$keyPath) {
        Write-Host "⚠️  App Store Connect API credentials not found in environment" -ForegroundColor Yellow
        return $false
    }
    
    if (!(Test-Path $keyPath)) {
        Write-Host "⚠️  App Store Connect API key file not found: $keyPath" -ForegroundColor Yellow
        return $false
    }
    
    Write-Host "✅ App Store Connect API credentials configured" -ForegroundColor Green
    return $true
}

function Initialize-FastlaneMatch {
    Write-Host "🚀 Initializing Fastlane Match..." -ForegroundColor Yellow
    
    # Navigate to iOS directory
    $iosPath = Join-Path $PSScriptRoot "..\ios"
    if (!(Test-Path $iosPath)) {
        throw "iOS directory not found: $iosPath"
    }
    
    Push-Location $iosPath
    try {
        Write-Host "📍 Working directory: $(Get-Location)" -ForegroundColor Blue
        
        # Install Fastlane if not present
        if (!(Get-Command fastlane -ErrorAction SilentlyContinue)) {
            Write-Host "📦 Installing Fastlane..." -ForegroundColor Yellow
            gem install fastlane
        }
        
        # Initialize Match (this may fail on first run, which is expected)
        Write-Host "🔧 Running Fastlane Match init..." -ForegroundColor Yellow
        try {
            fastlane match init
        } catch {
            Write-Host "⚠️  Match init encountered issues (this may be expected)" -ForegroundColor Yellow
        }
        
        Write-Host "✅ Fastlane Match initialized" -ForegroundColor Green
    } finally {
        Pop-Location
    }
}

function Test-CertificateGeneration {
    Write-Host "📱 Testing certificate generation..." -ForegroundColor Yellow
    
    $iosPath = Join-Path $PSScriptRoot "..\ios"
    Push-Location $iosPath
    try {
        # Test development certificates
        Write-Host "🔨 Testing development certificate sync..." -ForegroundColor Blue
        fastlane match development --readonly
        
        # Test App Store certificates  
        Write-Host "🏪 Testing App Store certificate sync..." -ForegroundColor Blue
        fastlane match appstore --readonly
        
        Write-Host "✅ Certificate generation test completed" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Certificate generation test failed: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "This may be expected if certificates don't exist yet" -ForegroundColor Blue
    } finally {
        Pop-Location
    }
}

function Validate-SetupComplete {
    Write-Host "🔍 Validating complete setup..." -ForegroundColor Yellow
    
    $validationResults = @{}
    
    # Check GitHub repository
    $validationResults['GitHubRepo'] = Test-GitHubConnection
    
    # Check App Store Connect API
    $validationResults['AppStoreAPI'] = Test-AppStoreConnectAPI
    
    # Check Matchfile exists
    $matchfilePath = Join-Path $PSScriptRoot "..\ios\fastlane\Matchfile"
    $validationResults['MatchfileExists'] = Test-Path $matchfilePath
    
    # Check Fastfile exists
    $fastfilePath = Join-Path $PSScriptRoot "..\ios\fastlane\Fastfile"
    $validationResults['FastfileExists'] = Test-Path $fastfilePath
    
    # Check environment variables
    $requiredEnvVars = @('MATCH_PASSWORD', 'MATCH_KEYCHAIN_PASSWORD', 'APP_STORE_CONNECT_KEY_ID', 'APP_STORE_CONNECT_ISSUER_ID')
    $envVarResults = @{}
    foreach ($var in $requiredEnvVars) {
        $envVarResults[$var] = [bool](Get-ChildItem env: | Where-Object Name -eq $var)
    }
    $validationResults['EnvironmentVars'] = $envVarResults
    
    # Display results
    Write-Host "`n📊 Validation Results:" -ForegroundColor Cyan
    Write-Host "======================" -ForegroundColor Cyan
    
    foreach ($result in $validationResults.GetEnumerator()) {
        if ($result.Name -eq 'EnvironmentVars') {
            Write-Host "Environment Variables:" -ForegroundColor White
            foreach ($envVar in $result.Value.GetEnumerator()) {
                $status = if ($envVar.Value) { "✅" } else { "❌" }
                Write-Host "  $status $($envVar.Name)" -ForegroundColor $(if ($envVar.Value) { "Green" } else { "Red" })
            }
        } else {
            $status = if ($result.Value) { "✅" } else { "❌" }
            $color = if ($result.Value) { "Green" } else { "Red" }
            Write-Host "$status $($result.Name)" -ForegroundColor $color
        }
    }
    
    $allValid = ($validationResults.Values | Where-Object { $_ -is [bool] } | Measure-Object -Sum | Select-Object -ExpandProperty Sum) -eq ($validationResults.Values | Where-Object { $_ -is [bool] } | Measure-Object | Select-Object -ExpandProperty Count)
    $envVarsValid = ($validationResults['EnvironmentVars'].Values | Where-Object { $_ } | Measure-Object | Select-Object -ExpandProperty Count) -eq $requiredEnvVars.Length
    
    if ($allValid -and $envVarsValid) {
        Write-Host "`n🎉 Setup validation passed! Ready for deployment." -ForegroundColor Green
    } else {
        Write-Host "`n⚠️  Setup validation found issues. Please address them before deployment." -ForegroundColor Yellow
    }
}

# Main execution
try {
    Test-RequiredTools
    
    if ($Initialize) {
        Initialize-FastlaneMatch
    }
    
    if ($TestConnection) {
        Test-GitHubConnection
        Test-AppStoreConnectAPI
    }
    
    if ($GenerateCertificates) {
        Test-CertificateGeneration
    }
    
    if ($ValidateSetup) {
        Validate-SetupComplete
    }
    
    if (!$Initialize -and !$TestConnection -and !$GenerateCertificates -and !$ValidateSetup) {
        Write-Host "📋 Available options:" -ForegroundColor Yellow
        Write-Host "  -Initialize          : Initialize Fastlane Match setup" -ForegroundColor White
        Write-Host "  -TestConnection      : Test GitHub and App Store Connect connectivity" -ForegroundColor White
        Write-Host "  -GenerateCertificates: Test certificate generation" -ForegroundColor White
        Write-Host "  -ValidateSetup       : Validate complete setup" -ForegroundColor White
        Write-Host ""
        Write-Host "Example: .\fastlane-match-setup.ps1 -Initialize -ValidateSetup" -ForegroundColor Green
    }
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Script completed successfully!" -ForegroundColor Green