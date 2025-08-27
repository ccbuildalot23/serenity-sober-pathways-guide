# Serenity iOS Certificate Preparation Script for Windows
# This script helps you prepare certificates for GitHub Actions iOS deployment

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  Serenity iOS Certificate Preparation for Windows  " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Function to convert file to base64
function Convert-ToBase64 {
    param(
        [string]$FilePath,
        [string]$OutputName
    )
    
    if (Test-Path $FilePath) {
        $bytes = [System.IO.File]::ReadAllBytes($FilePath)
        $base64 = [System.Convert]::ToBase64String($bytes)
        
        # Save to file
        $outputPath = ".\$OutputName.txt"
        $base64 | Out-File -FilePath $outputPath -NoNewline
        
        Write-Host "✅ Converted $FilePath to base64" -ForegroundColor Green
        Write-Host "   Saved to: $outputPath" -ForegroundColor Gray
        
        # Also copy to clipboard for easy pasting
        $base64 | Set-Clipboard
        Write-Host "   Copied to clipboard!" -ForegroundColor Yellow
        
        return $true
    } else {
        Write-Host "❌ File not found: $FilePath" -ForegroundColor Red
        return $false
    }
}

# Step 1: Instructions
Write-Host "BEFORE YOU START:" -ForegroundColor Yellow
Write-Host "=================" -ForegroundColor Yellow
Write-Host ""
Write-Host "You need to download these files from Apple Developer Portal:" -ForegroundColor White
Write-Host "1. iOS Distribution Certificate (.p12 file)" -ForegroundColor Cyan
Write-Host "2. App Store Provisioning Profile (.mobileprovision file)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Go to: https://developer.apple.com/account/resources/certificates/list" -ForegroundColor Green
Write-Host ""
Write-Host "Press Enter when you have both files ready..." -ForegroundColor Yellow
Read-Host

# Step 2: Get certificate file
Write-Host ""
Write-Host "STEP 1: iOS Distribution Certificate" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Drag and drop your .p12 certificate file here (or type the path):" -ForegroundColor White
$certPath = Read-Host

# Clean up the path (remove quotes if present)
$certPath = $certPath.Trim('"')

if (Test-Path $certPath) {
    Write-Host "✅ Certificate found: $certPath" -ForegroundColor Green
    
    # Get certificate password
    Write-Host ""
    Write-Host "Enter the password for this certificate:" -ForegroundColor White
    $certPassword = Read-Host -AsSecureString
    $certPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($certPassword))
    
    # Convert to base64
    Convert-ToBase64 -FilePath $certPath -OutputName "ios_certificate_base64"
} else {
    Write-Host "❌ Certificate file not found!" -ForegroundColor Red
    exit 1
}

# Step 3: Get provisioning profile
Write-Host ""
Write-Host "STEP 2: Provisioning Profile" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Drag and drop your .mobileprovision file here (or type the path):" -ForegroundColor White
$profilePath = Read-Host

# Clean up the path
$profilePath = $profilePath.Trim('"')

if (Test-Path $profilePath) {
    Write-Host "✅ Provisioning profile found: $profilePath" -ForegroundColor Green
    
    # Convert to base64
    Convert-ToBase64 -FilePath $profilePath -OutputName "ios_provisioning_profile_base64"
} else {
    Write-Host "❌ Provisioning profile not found!" -ForegroundColor Red
    exit 1
}

# Step 4: Get App Store Connect API details
Write-Host ""
Write-Host "STEP 3: App Store Connect API Key" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Go to: https://appstoreconnect.apple.com/access/api" -ForegroundColor Green
Write-Host ""
Write-Host "Create an API Key with 'App Manager' role and download the .p8 file" -ForegroundColor White
Write-Host ""
Write-Host "Enter your Issuer ID (from App Store Connect):" -ForegroundColor White
$issuerId = Read-Host

Write-Host "Enter your Key ID (from App Store Connect):" -ForegroundColor White
$keyId = Read-Host

Write-Host "Drag and drop your .p8 API key file here:" -ForegroundColor White
$apiKeyPath = Read-Host
$apiKeyPath = $apiKeyPath.Trim('"')

if (Test-Path $apiKeyPath) {
    Write-Host "✅ API Key found: $apiKeyPath" -ForegroundColor Green
    
    # Read the API key content
    $apiKeyContent = Get-Content $apiKeyPath -Raw
    $apiKeyContent | Out-File -FilePath ".\app_store_connect_api_key.txt" -NoNewline
    Write-Host "   Saved to: app_store_connect_api_key.txt" -ForegroundColor Gray
} else {
    Write-Host "❌ API Key file not found!" -ForegroundColor Red
    exit 1
}

# Step 5: Get Team ID
Write-Host ""
Write-Host "STEP 4: Apple Team ID" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Enter your Apple Team ID (10 characters, e.g., ABCDE12345):" -ForegroundColor White
$teamId = Read-Host

# Step 6: Generate GitHub Secrets configuration
Write-Host ""
Write-Host "STEP 5: GitHub Secrets Configuration" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$secretsConfig = @"
GitHub Secrets to Add:
======================

Go to: https://github.com/YOUR_USERNAME/serenity-sober-pathways-guide/settings/secrets/actions

Add these secrets:

1. IOS_CERTIFICATE
   Value: [Contents of ios_certificate_base64.txt]

2. IOS_CERTIFICATE_PASSWORD
   Value: $certPasswordPlain

3. IOS_PROVISION_PROFILE
   Value: [Contents of ios_provisioning_profile_base64.txt]

4. KEYCHAIN_PASSWORD
   Value: $(New-Guid)

5. APP_STORE_CONNECT_API_KEY
   Value: [Contents of app_store_connect_api_key.txt]

6. APP_STORE_CONNECT_ISSUER_ID
   Value: $issuerId

7. APP_STORE_CONNECT_KEY_ID
   Value: $keyId

8. APPLE_TEAM_ID
   Value: $teamId

9. PROVISIONING_PROFILE_NAME
   Value: [Check in Apple Developer Portal]

10. VITE_SUPABASE_URL
    Value: [Your Supabase URL]

11. VITE_SUPABASE_ANON_KEY
    Value: [Your Supabase Anon Key]
"@

$secretsConfig | Out-File -FilePath ".\github_secrets_config.txt"

Write-Host $secretsConfig -ForegroundColor White
Write-Host ""
Write-Host "✅ Configuration saved to: github_secrets_config.txt" -ForegroundColor Green

# Step 7: Update ExportOptions.plist
Write-Host ""
Write-Host "STEP 6: Update Configuration Files" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

$exportOptionsPath = ".\ios\App\ExportOptions.plist"
if (Test-Path $exportOptionsPath) {
    $content = Get-Content $exportOptionsPath -Raw
    $content = $content -replace "YOUR_TEAM_ID", $teamId
    $content | Out-File -FilePath $exportOptionsPath -NoNewline
    Write-Host "✅ Updated ExportOptions.plist with Team ID" -ForegroundColor Green
}

# Step 8: Final instructions
Write-Host ""
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "          SETUP COMPLETE! Next Steps:               " -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "1. Add all secrets to GitHub (see github_secrets_config.txt)" -ForegroundColor White
Write-Host "2. Commit and push your changes:" -ForegroundColor White
Write-Host "   git add ." -ForegroundColor Cyan
Write-Host "   git commit -m 'Configure iOS deployment'" -ForegroundColor Cyan
Write-Host "   git push" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Go to GitHub Actions tab to watch the build" -ForegroundColor White
Write-Host "4. Check TestFlight in ~10 minutes" -ForegroundColor White
Write-Host "5. Submit for App Store review!" -ForegroundColor White
Write-Host ""
Write-Host "📱 Your app will be ready for submission in ~15 minutes!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Enter to exit..." -ForegroundColor Gray
Read-Host