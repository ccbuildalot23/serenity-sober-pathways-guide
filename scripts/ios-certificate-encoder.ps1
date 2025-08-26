# iOS Certificate and Profile Base64 Encoder
# This script properly encodes iOS certificates and provisioning profiles for GitHub Secrets
# Usage: .\ios-certificate-encoder.ps1

param(
    [string]$CertPath = "ios-certificates\ios_distribution.p12",
    [string]$ProfilePath = "ios-certificates\Serenity_App_Store_Profile.mobileprovision",
    [string]$OutputDir = "ios-certificates"
)

Write-Host "🔐 iOS Certificate and Profile Encoder" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Check if files exist
if (-not (Test-Path $CertPath)) {
    Write-Host "❌ Certificate not found at: $CertPath" -ForegroundColor Red
    Write-Host "Please ensure you have exported your iOS Distribution Certificate as a .p12 file" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $ProfilePath)) {
    Write-Host "❌ Provisioning profile not found at: $ProfilePath" -ForegroundColor Red
    Write-Host "Please download your provisioning profile from Apple Developer Portal" -ForegroundColor Yellow
    exit 1
}

# Create output directory if it doesn't exist
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

# Encode certificate
Write-Host "`n📄 Encoding certificate..." -ForegroundColor Green
$certBytes = [System.IO.File]::ReadAllBytes($CertPath)
$certBase64 = [System.Convert]::ToBase64String($certBytes)
$certOutputPath = Join-Path $OutputDir "BUILD_CERTIFICATE_BASE64.txt"
Set-Content -Path $certOutputPath -Value $certBase64 -NoNewline
Write-Host "✅ Certificate encoded to: $certOutputPath" -ForegroundColor Green

# Encode provisioning profile
Write-Host "`n📱 Encoding provisioning profile..." -ForegroundColor Green
$profileBytes = [System.IO.File]::ReadAllBytes($ProfilePath)
$profileBase64 = [System.Convert]::ToBase64String($profileBytes)
$profileOutputPath = Join-Path $OutputDir "BUILD_PROVISION_PROFILE_BASE64.txt"
Set-Content -Path $profileOutputPath -Value $profileBase64 -NoNewline
Write-Host "✅ Profile encoded to: $profileOutputPath" -ForegroundColor Green

# Generate GitHub Secrets commands
Write-Host "`n🔧 GitHub Secrets Setup Commands:" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run these commands to set up GitHub Secrets:" -ForegroundColor Yellow
Write-Host ""
Write-Host "# Set certificate (from PowerShell):" -ForegroundColor Gray
Write-Host "gh secret set BUILD_CERTIFICATE_BASE64 --body `"``$(Get-Content '$certOutputPath')`"" -ForegroundColor White
Write-Host ""
Write-Host "# Set provisioning profile (from PowerShell):" -ForegroundColor Gray
Write-Host "gh secret set BUILD_PROVISION_PROFILE_BASE64 --body `"``$(Get-Content '$profileOutputPath')`"" -ForegroundColor White
Write-Host ""
Write-Host "# Set P12 password (replace with your actual password):" -ForegroundColor Gray
Write-Host 'gh secret set P12_PASSWORD --body "your-certificate-password"' -ForegroundColor White
Write-Host ""
Write-Host "# Set keychain password (can be any secure password):" -ForegroundColor Gray
Write-Host 'gh secret set KEYCHAIN_PASSWORD --body "temporary-keychain-password"' -ForegroundColor White

# Validate encoding
Write-Host "`n🔍 Validating encoding..." -ForegroundColor Cyan
$decodedCert = [System.Convert]::FromBase64String($certBase64)
if ($decodedCert.Length -eq $certBytes.Length) {
    Write-Host "✅ Certificate encoding validated successfully" -ForegroundColor Green
} else {
    Write-Host "⚠️ Certificate encoding validation failed" -ForegroundColor Red
}

$decodedProfile = [System.Convert]::FromBase64String($profileBase64)
if ($decodedProfile.Length -eq $profileBytes.Length) {
    Write-Host "✅ Provisioning profile encoding validated successfully" -ForegroundColor Green
} else {
    Write-Host "⚠️ Profile encoding validation failed" -ForegroundColor Red
}

# Additional instructions
Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "=============" -ForegroundColor Cyan
Write-Host "1. Run the GitHub Secrets commands above" -ForegroundColor White
Write-Host "2. Ensure you have App Store Connect API keys set:" -ForegroundColor White
Write-Host "   - APP_STORE_CONNECT_API_KEY_ID" -ForegroundColor Gray
Write-Host "   - APP_STORE_CONNECT_ISSUER_ID" -ForegroundColor Gray
Write-Host "   - APP_STORE_CONNECT_KEY (base64 encoded .p8 file)" -ForegroundColor Gray
Write-Host "3. Verify all secrets are set with: gh secret list" -ForegroundColor White

Write-Host "`n✨ Done! Your certificates are ready for CI/CD deployment." -ForegroundColor Green