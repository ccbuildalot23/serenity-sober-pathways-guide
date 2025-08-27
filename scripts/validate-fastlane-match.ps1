# Fastlane Match Validation Script
# This script validates the Fastlane Match setup before deployment

param(
    [switch]$FullValidation,
    [switch]$Quick,
    [string]$OutputFormat = "console" # console, json, xml
)

$ErrorActionPreference = "Stop"

# Configuration
$Config = @{
    AppIdentifier = "com.serenity.recovery"
    TeamId = "XDY458RQ59"
    RepositoryUrl = "https://github.com/ccbuildalot23/serenity-ios-certificates"
    RequiredSecrets = @(
        'MATCH_PASSWORD',
        'MATCH_KEYCHAIN_PASSWORD', 
        'APP_STORE_CONNECT_KEY_ID',
        'APP_STORE_CONNECT_ISSUER_ID',
        'APP_STORE_CONNECT_API_KEY',
        'APPLE_TEAM_ID'
    )
}

$ValidationResults = @{
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    OverallStatus = $false
    Tests = @{}
}

function Write-ValidationHeader {
    Write-Host "🔍 Fastlane Match Validation" -ForegroundColor Cyan
    Write-Host "============================" -ForegroundColor Cyan
    Write-Host "App: Serenity Recovery" -ForegroundColor White
    Write-Host "Bundle ID: $($Config.AppIdentifier)" -ForegroundColor White
    Write-Host "Team ID: $($Config.TeamId)" -ForegroundColor White
    Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
    Write-Host ""
}

function Test-GitHubRepository {
    Write-Host "🔗 Testing GitHub repository access..." -ForegroundColor Yellow
    
    $test = @{
        Name = "GitHub Repository"
        Status = $false
        Details = @{}
        Errors = @()
    }
    
    try {
        # Test repository accessibility
        $response = Invoke-RestMethod -Uri "https://api.github.com/repos/ccbuildalot23/serenity-ios-certificates" -Method Get
        $test.Details.RepoExists = $true
        $test.Details.IsPrivate = $response.private
        $test.Details.DefaultBranch = $response.default_branch
        
        # Test if we can access with authentication
        $authHeader = @{
            'Authorization' = "token $env:GITHUB_TOKEN"
        }
        $authResponse = Invoke-RestMethod -Uri "https://api.github.com/repos/ccbuildalot23/serenity-ios-certificates/contents" -Method Get -Headers $authHeader
        $test.Details.HasWriteAccess = $true
        
        $test.Status = $true
        Write-Host "✅ GitHub repository accessible" -ForegroundColor Green
        
    } catch {
        $test.Errors += $_.Exception.Message
        Write-Host "❌ GitHub repository test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    return $test
}

function Test-FastlaneConfiguration {
    Write-Host "⚙️  Testing Fastlane configuration..." -ForegroundColor Yellow
    
    $test = @{
        Name = "Fastlane Configuration"
        Status = $false
        Details = @{}
        Errors = @()
    }
    
    try {
        # Check Matchfile exists and is valid
        $matchfilePath = Join-Path $PSScriptRoot "..\ios\fastlane\Matchfile"
        if (Test-Path $matchfilePath) {
            $test.Details.MatchfileExists = $true
            
            # Read and validate Matchfile content
            $matchfileContent = Get-Content $matchfilePath -Raw
            $test.Details.HasGitUrl = $matchfileContent -match "git_url"
            $test.Details.HasAppIdentifier = $matchfileContent -match "app_identifier"
            $test.Details.HasTeamId = $matchfileContent -match "team_id"
            
        } else {
            $test.Details.MatchfileExists = $false
            $test.Errors += "Matchfile not found at $matchfilePath"
        }
        
        # Check Fastfile exists
        $fastfilePath = Join-Path $PSScriptRoot "..\ios\fastlane\Fastfile"
        $test.Details.FastfileExists = Test-Path $fastfilePath
        
        # Check if Fastlane is installed
        try {
            $fastlaneVersion = fastlane --version 2>$null
            $test.Details.FastlaneInstalled = $true
            $test.Details.FastlaneVersion = $fastlaneVersion
        } catch {
            $test.Details.FastlaneInstalled = $false
            $test.Errors += "Fastlane not installed or not in PATH"
        }
        
        $test.Status = $test.Details.MatchfileExists -and $test.Details.FastfileExists -and $test.Details.FastlaneInstalled
        
        if ($test.Status) {
            Write-Host "✅ Fastlane configuration valid" -ForegroundColor Green
        } else {
            Write-Host "❌ Fastlane configuration issues found" -ForegroundColor Red
        }
        
    } catch {
        $test.Errors += $_.Exception.Message
        Write-Host "❌ Fastlane configuration test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    return $test
}

function Test-GitHubSecrets {
    Write-Host "🔐 Testing GitHub secrets configuration..." -ForegroundColor Yellow
    
    $test = @{
        Name = "GitHub Secrets"
        Status = $false
        Details = @{}
        Errors = @()
    }
    
    try {
        # For local testing, check environment variables
        $secretStatus = @{}
        foreach ($secret in $Config.RequiredSecrets) {
            $value = [System.Environment]::GetEnvironmentVariable($secret)
            $secretStatus[$secret] = @{
                Configured = ![string]::IsNullOrEmpty($value)
                Length = if ($value) { $value.Length } else { 0 }
            }
        }
        
        $test.Details.Secrets = $secretStatus
        $configuredCount = ($secretStatus.Values | Where-Object { $_.Configured }).Count
        $test.Details.ConfiguredSecrets = $configuredCount
        $test.Details.TotalSecrets = $Config.RequiredSecrets.Count
        
        $test.Status = $configuredCount -eq $Config.RequiredSecrets.Count
        
        if ($test.Status) {
            Write-Host "✅ All required secrets configured" -ForegroundColor Green
        } else {
            Write-Host "⚠️  $configuredCount/$($Config.RequiredSecrets.Count) secrets configured" -ForegroundColor Yellow
            $missingSecrets = $secretStatus.GetEnumerator() | Where-Object { !$_.Value.Configured } | Select-Object -ExpandProperty Key
            $test.Errors += "Missing secrets: $($missingSecrets -join ', ')"
        }
        
    } catch {
        $test.Errors += $_.Exception.Message
        Write-Host "❌ GitHub secrets test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    return $test
}

function Test-iOSProject {
    Write-Host "📱 Testing iOS project configuration..." -ForegroundColor Yellow
    
    $test = @{
        Name = "iOS Project"
        Status = $false
        Details = @{}
        Errors = @()
    }
    
    try {
        # Check if iOS project directory exists
        $iosPath = Join-Path $PSScriptRoot "..\ios"
        $test.Details.iOSDirectoryExists = Test-Path $iosPath
        
        if ($test.Details.iOSDirectoryExists) {
            # Check for Xcode project
            $xcodeProjectPath = Join-Path $iosPath "App\App.xcodeproj"
            $test.Details.XcodeProjectExists = Test-Path $xcodeProjectPath
            
            # Check for workspace
            $xcodeWorkspacePath = Join-Path $iosPath "App\App.xcworkspace"
            $test.Details.XcodeWorkspaceExists = Test-Path $xcodeWorkspacePath
            
            # Check for Podfile
            $podfilePath = Join-Path $iosPath "App\Podfile"
            $test.Details.PodfileExists = Test-Path $podfilePath
            
            # Check App directory
            $appPath = Join-Path $iosPath "App"
            $test.Details.AppDirectoryExists = Test-Path $appPath
        }
        
        $test.Status = $test.Details.iOSDirectoryExists -and $test.Details.XcodeProjectExists -and $test.Details.AppDirectoryExists
        
        if ($test.Status) {
            Write-Host "✅ iOS project structure valid" -ForegroundColor Green
        } else {
            Write-Host "❌ iOS project structure issues found" -ForegroundColor Red
        }
        
    } catch {
        $test.Errors += $_.Exception.Message
        Write-Host "❌ iOS project test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    return $test
}

function Test-AppStoreConnectAPI {
    Write-Host "🏪 Testing App Store Connect API..." -ForegroundColor Yellow
    
    $test = @{
        Name = "App Store Connect API"
        Status = $false
        Details = @{}
        Errors = @()
    }
    
    try {
        $keyId = $env:APP_STORE_CONNECT_KEY_ID
        $issuerId = $env:APP_STORE_CONNECT_ISSUER_ID
        $apiKey = $env:APP_STORE_CONNECT_API_KEY
        
        $test.Details.KeyIdConfigured = ![string]::IsNullOrEmpty($keyId)
        $test.Details.IssuerIdConfigured = ![string]::IsNullOrEmpty($issuerId)
        $test.Details.ApiKeyConfigured = ![string]::IsNullOrEmpty($apiKey)
        
        if ($test.Details.ApiKeyConfigured) {
            $test.Details.ApiKeyFormat = if ($apiKey.StartsWith("-----BEGIN PRIVATE KEY-----")) { "Valid" } else { "Invalid" }
        }
        
        $test.Status = $test.Details.KeyIdConfigured -and $test.Details.IssuerIdConfigured -and $test.Details.ApiKeyConfigured -and ($test.Details.ApiKeyFormat -eq "Valid")
        
        if ($test.Status) {
            Write-Host "✅ App Store Connect API configuration valid" -ForegroundColor Green
        } else {
            Write-Host "❌ App Store Connect API configuration issues" -ForegroundColor Red
        }
        
    } catch {
        $test.Errors += $_.Exception.Message
        Write-Host "❌ App Store Connect API test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    return $test
}

# Main validation execution
Write-ValidationHeader
    
    # Run validation tests
    $ValidationResults.Tests.GitHubRepository = Test-GitHubRepository
    $ValidationResults.Tests.FastlaneConfiguration = Test-FastlaneConfiguration
    $ValidationResults.Tests.GitHubSecrets = Test-GitHubSecrets
    $ValidationResults.Tests.iOSProject = Test-iOSProject
    $ValidationResults.Tests.AppStoreConnectAPI = Test-AppStoreConnectAPI
    
    # Calculate overall status
    $passedTests = ($ValidationResults.Tests.Values | Where-Object { $_.Status }).Count
    $totalTests = $ValidationResults.Tests.Count
    $ValidationResults.OverallStatus = $passedTests -eq $totalTests
    
    # Display summary
    Write-Host "`n📊 Validation Summary" -ForegroundColor Cyan
    Write-Host "====================" -ForegroundColor Cyan
    Write-Host "Tests passed: $passedTests/$totalTests" -ForegroundColor White
    
    foreach ($test in $ValidationResults.Tests.GetEnumerator()) {
        $status = if ($test.Value.Status) { "✅" } else { "❌" }
        $color = if ($test.Value.Status) { "Green" } else { "Red" }
        Write-Host "$status $($test.Value.Name)" -ForegroundColor $color
        
        if ($test.Value.Errors.Count -gt 0) {
            foreach ($error in $test.Value.Errors) {
                Write-Host "   └─ $error" -ForegroundColor Red
            }
        }
    }
    
    if ($ValidationResults.OverallStatus) {
        Write-Host "`n🎉 All validation tests passed! Ready for Fastlane Match deployment." -ForegroundColor Green
        exit 0
    } else {
        Write-Host "`n⚠️  Validation failed. Please fix the issues above before proceeding." -ForegroundColor Yellow
        exit 1
    }
