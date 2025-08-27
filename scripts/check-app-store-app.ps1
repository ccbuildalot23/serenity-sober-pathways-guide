# PowerShell script to check if app exists in App Store Connect
# This script uses the App Store Connect API to verify the app record

Write-Host "App Store Connect App Verification" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$bundleId = "com.serenity.recovery"
$teamId = "XDY458RQ59"
$keyId = "4YBU7UC32Y"

Write-Host "App Configuration:" -ForegroundColor Yellow
Write-Host "   Bundle ID: $bundleId" -ForegroundColor White
Write-Host "   Team ID: $teamId" -ForegroundColor White
Write-Host "   API Key ID: $keyId" -ForegroundColor White
Write-Host ""

# Check if we have the necessary files
$apiKeyPath = "C:\ios-certs\AuthKey_4YBU7UC32Y.p8"
if (-not (Test-Path $apiKeyPath)) {
    Write-Host "ERROR: API key file not found at: $apiKeyPath" -ForegroundColor Red
    exit 1
}

Write-Host "Found API key file" -ForegroundColor Green

# Get issuer ID from GitHub secrets
Write-Host "Checking App Store Connect configuration..." -ForegroundColor Yellow

# List current GitHub secrets
$secrets = gh secret list | Select-String "APP_STORE"
Write-Host ""
Write-Host "Current GitHub Secrets:" -ForegroundColor Cyan
$secrets | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "NEXT STEPS TO RESOLVE DEPLOYMENT FAILURE:" -ForegroundColor Red
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "The deployment is failing because the app doesn't exist in App Store Connect." -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to App Store Connect:" -ForegroundColor Cyan
Write-Host "   https://appstoreconnect.apple.com" -ForegroundColor White
Write-Host ""
Write-Host "2. Click the '+' button and select 'New App'" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Enter these EXACT values:" -ForegroundColor Cyan
Write-Host "   - Platform: iOS" -ForegroundColor White
Write-Host "   - App Name: Serenity Sober Pathways" -ForegroundColor White
Write-Host "   - Primary Language: English (U.S.)" -ForegroundColor White  
Write-Host "   - Bundle ID: Select 'com.serenity.recovery' from dropdown" -ForegroundColor White
Write-Host "   - SKU: serenity-recovery-001" -ForegroundColor White
Write-Host ""
Write-Host "4. If Bundle ID not in dropdown:" -ForegroundColor Cyan
Write-Host "   a. Go to https://developer.apple.com/account/resources/identifiers/list" -ForegroundColor White
Write-Host "   b. Click '+' to register new identifier" -ForegroundColor White
Write-Host "   c. Select 'App IDs' and continue" -ForegroundColor White
Write-Host "   d. Select 'App' type" -ForegroundColor White
Write-Host "   e. Enter Description: 'Serenity Sober Pathways'" -ForegroundColor White
Write-Host "   f. Enter Bundle ID: 'com.serenity.recovery' (Explicit)" -ForegroundColor White
Write-Host "   g. Enable capabilities: Push Notifications, Sign in with Apple" -ForegroundColor White
Write-Host "   h. Register the Bundle ID" -ForegroundColor White
Write-Host "   i. Return to App Store Connect and create the app" -ForegroundColor White
Write-Host ""
Write-Host "5. After creating the app:" -ForegroundColor Cyan
Write-Host "   - The deployment workflow should succeed" -ForegroundColor Green
Write-Host "   - TestFlight upload will work" -ForegroundColor Green
Write-Host "   - You can submit for review" -ForegroundColor Green
Write-Host ""
Write-Host "For detailed instructions, see:" -ForegroundColor Yellow
Write-Host "docs\App-Store-Connect-Setup-Guide.md" -ForegroundColor White
Write-Host ""