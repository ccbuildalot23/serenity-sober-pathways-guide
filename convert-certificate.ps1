# iOS Certificate Conversion Helper
# Converts .cer to .p12 for GitHub Actions

Write-Host "=================================================================================" -ForegroundColor Cyan
Write-Host "  Serenity iOS Certificate Converter (.cer to .p12)" -ForegroundColor Cyan
Write-Host "=================================================================================" -ForegroundColor Cyan
Write-Host ""

$certDir = "ios-certificates"
$opensslPath = "C:\Program Files\Git\mingw64\bin\openssl.exe"

Set-Location $certDir

# Check for .cer file
$cerFile = Get-ChildItem -Filter "*.cer" | Select-Object -First 1

if (-not $cerFile) {
    Write-Host "❌ No .cer file found in $pwd" -ForegroundColor Red
    Write-Host "Please download the certificate from Apple Developer Portal first!" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Found certificate: $($cerFile.Name)" -ForegroundColor Green

# Check for private key
if (-not (Test-Path "ios_distribution.key")) {
    Write-Host "❌ Private key not found: ios_distribution.key" -ForegroundColor Red
    Write-Host "Run generate-ios-certificate.ps1 first!" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Found private key: ios_distribution.key" -ForegroundColor Green
Write-Host ""

# Convert .cer to .pem
Write-Host "🔄 Converting certificate to PEM format..." -ForegroundColor Yellow
& "$opensslPath" x509 -in $cerFile.Name -inform DER -out ios_distribution.pem -outform PEM

if (Test-Path "ios_distribution.pem") {
    Write-Host "✅ PEM file created: ios_distribution.pem" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to convert certificate" -ForegroundColor Red
    exit 1
}

# Create .p12
Write-Host ""
Write-Host "🔐 Creating .p12 file..." -ForegroundColor Yellow
Write-Host "⚠️  You will be prompted for a password. REMEMBER THIS PASSWORD!" -ForegroundColor Yellow
Write-Host "   (You'll need it for GitHub Secrets)" -ForegroundColor Gray
Write-Host ""

& "$opensslPath" pkcs12 -export -out ios_distribution.p12 -inkey ios_distribution.key -in ios_distribution.pem

if (Test-Path "ios_distribution.p12") {
    Write-Host ""
    Write-Host "✅ SUCCESS! Certificate created: ios_distribution.p12" -ForegroundColor Green
    
    # Get file info
    $p12Info = Get-Item "ios_distribution.p12"
    Write-Host "📊 File size: $($p12Info.Length) bytes" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "=================================================================================" -ForegroundColor Cyan
    Write-Host "  Next Steps" -ForegroundColor Cyan
    Write-Host "=================================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. 📱 Download Provisioning Profile:" -ForegroundColor Yellow
    Write-Host "   https://developer.apple.com/account/resources/profiles/list" -ForegroundColor White
    Write-Host "   - Find 'Serenity App Store Profile'" -ForegroundColor Gray
    Write-Host "   - Download and save in this folder" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. 🔑 Create App Store Connect API Key:" -ForegroundColor Yellow
    Write-Host "   https://appstoreconnect.apple.com/access/integrations/api" -ForegroundColor White
    Write-Host "   - Generate new API Key with Admin access" -ForegroundColor Gray
    Write-Host "   - Download .p8 file (ONLY AVAILABLE ONCE!)" -ForegroundColor Gray
    Write-Host "   - Note the Key ID and Issuer ID" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. 🚀 Run encoding script:" -ForegroundColor Yellow
    Write-Host "   ..\certificate-encoder.ps1 -CertificatePath $pwd\ios_distribution.p12 -ProvisioningProfilePath [path-to-mobileprovision]" -ForegroundColor White
    Write-Host ""
    Write-Host "📁 Certificate location: $pwd\ios_distribution.p12" -ForegroundColor Cyan
} else {
    Write-Host "❌ Failed to create .p12 file" -ForegroundColor Red
    exit 1
}

Set-Location ..