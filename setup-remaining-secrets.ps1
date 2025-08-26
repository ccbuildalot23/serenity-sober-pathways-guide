# Setup Remaining Fastlane Match Secrets
Write-Host "Setting up remaining Fastlane Match secrets..." -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Function to set GitHub secret securely
function Set-GitHubSecret {
    param(
        [string]$SecretName,
        [string]$Value
    )
    
    try {
        $Value | gh secret set $SecretName
        Write-Host "  Successfully set $SecretName" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "  Failed to set $SecretName : $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Check what's missing
Write-Host "Checking for missing secrets..." -ForegroundColor Yellow

$secretsList = gh secret list --json name | ConvertFrom-Json
$existingSecrets = $secretsList | ForEach-Object { $_.name }

$needAppleId = "APPLE_ID" -notin $existingSecrets
$needAppPassword = "APPLE_APP_SPECIFIC_PASSWORD" -notin $existingSecrets

if (-not $needAppleId -and -not $needAppPassword) {
    Write-Host "All required secrets are already configured!" -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "The following secrets need to be configured:" -ForegroundColor White

if ($needAppleId) {
    Write-Host "  - APPLE_ID" -ForegroundColor Yellow
}
if ($needAppPassword) {
    Write-Host "  - APPLE_APP_SPECIFIC_PASSWORD" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "IMPORTANT: You'll need to provide these values manually." -ForegroundColor Red
Write-Host "This script will guide you through the process." -ForegroundColor White
Write-Host ""

$secretsSet = 0

# Set APPLE_ID if needed
if ($needAppleId) {
    Write-Host "Setting up APPLE_ID..." -ForegroundColor Cyan
    Write-Host "This should be your Apple Developer account email address." -ForegroundColor Gray
    Write-Host "Example: developer@yourcompany.com" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Please run this command manually with your Apple ID:" -ForegroundColor Yellow
    Write-Host "echo 'your-apple-id@example.com' | gh secret set APPLE_ID" -ForegroundColor White
    Write-Host ""
}

# Set APPLE_APP_SPECIFIC_PASSWORD if needed  
if ($needAppPassword) {
    Write-Host "Setting up APPLE_APP_SPECIFIC_PASSWORD..." -ForegroundColor Cyan
    Write-Host "This is required for Apple accounts with 2FA enabled." -ForegroundColor Gray
    Write-Host "Steps to create:" -ForegroundColor Gray
    Write-Host "1. Go to https://appleid.apple.com/account/manage" -ForegroundColor Gray
    Write-Host "2. Sign in with your Apple ID" -ForegroundColor Gray
    Write-Host "3. Go to Security section" -ForegroundColor Gray
    Write-Host "4. Click 'App-Specific Passwords'" -ForegroundColor Gray
    Write-Host "5. Click 'Generate Password'" -ForegroundColor Gray
    Write-Host "6. Enter label: 'Fastlane iOS Deployment'" -ForegroundColor Gray
    Write-Host "7. Copy the generated password" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Please run this command manually with your app-specific password:" -ForegroundColor Yellow
    Write-Host "echo 'your-app-specific-password' | gh secret set APPLE_APP_SPECIFIC_PASSWORD" -ForegroundColor White
    Write-Host ""
}

# Alternative: Automated setup with placeholder values for testing
Write-Host "Alternative: Test Setup" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host "If you want to set up placeholder values for testing, run:" -ForegroundColor Gray
Write-Host ""

if ($needAppleId) {
    Write-Host "echo 'test-developer@example.com' | gh secret set APPLE_ID" -ForegroundColor Gray
}
if ($needAppPassword) {
    Write-Host "echo 'test-app-specific-password' | gh secret set APPLE_APP_SPECIFIC_PASSWORD" -ForegroundColor Gray
}

Write-Host ""
Write-Host "WARNING: Replace with real values before production deployment!" -ForegroundColor Red

Write-Host ""
Write-Host "After setting the secrets, run this to verify:" -ForegroundColor Cyan
Write-Host "powershell.exe -File validate-fastlane-secrets-fixed.ps1" -ForegroundColor White