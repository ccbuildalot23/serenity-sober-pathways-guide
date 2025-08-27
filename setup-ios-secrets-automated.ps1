# Automated PowerShell script to set up GitHub Secrets for iOS deployment
Write-Host "Setting up iOS Deployment Secrets..." -ForegroundColor Cyan
Write-Host ""

# Check if GitHub CLI is installed
if (-Not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: GitHub CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   winget install GitHub.cli" -ForegroundColor Yellow
    exit 1
}

Write-Host "Step 1: Setting App Store Connect credentials..." -ForegroundColor Yellow

# Set Key ID
Write-Host "  Setting APP_STORE_CONNECT_KEY_ID..." -ForegroundColor Gray
echo "4YBU7UC32Y" | gh secret set APP_STORE_CONNECT_KEY_ID
Write-Host "  [OK] Key ID set" -ForegroundColor Green

# Set Issuer ID
Write-Host "  Setting APP_STORE_CONNECT_ISSUER_ID..." -ForegroundColor Gray
echo "acb9e47c-6935-4933-ae2c-6170b5d90234" | gh secret set APP_STORE_CONNECT_ISSUER_ID
Write-Host "  [OK] Issuer ID set" -ForegroundColor Green

# Set API Key content
Write-Host "  Setting APP_STORE_CONNECT_API_KEY..." -ForegroundColor Gray
$apiKey = @"
-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgf1wCVC6FF2MZTlGD
UXzFZx8XbpjRPMlX4MN9OSUlnHmgCgYIKoZIzj0DAQehRANCAASlrZ2enujSr9vN
qRsL5OMMXUIJBTdDWh5I2Ph1WmPmL5WTJmq7nfwqWrRxis0JhuZizhjbAaBR3R0y
qLBSDQKc
-----END PRIVATE KEY-----
"@

$tempFile = [System.IO.Path]::GetTempFileName()
[System.IO.File]::WriteAllText($tempFile, $apiKey, [System.Text.Encoding]::ASCII)
gh secret set APP_STORE_CONNECT_API_KEY --body-file $tempFile
Remove-Item $tempFile
Write-Host "  [OK] API Key set" -ForegroundColor Green

Write-Host ""
Write-Host "Step 2: Setting certificates and profiles..." -ForegroundColor Yellow

# Path to certificates
$certPath = "C:\ios-certs"

# Check for distribution certificate
$certPfx = "$certPath\ios_distribution.pfx"
$certP12 = "$certPath\ios_distribution.p12"

if (Test-Path $certPfx) {
    Write-Host "  Found distribution certificate (.pfx)" -ForegroundColor Green
    $bytes = [System.IO.File]::ReadAllBytes($certPfx)
    $base64 = [Convert]::ToBase64String($bytes)
    $tempCert = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($tempCert, $base64, [System.Text.Encoding]::ASCII)
    gh secret set IOS_DISTRIBUTION_CERTIFICATE_BASE64 --body-file $tempCert
    Remove-Item $tempCert
    Write-Host "  [OK] Certificate encoded and uploaded" -ForegroundColor Green
} elseif (Test-Path $certP12) {
    Write-Host "  Found distribution certificate (.p12)" -ForegroundColor Green
    $bytes = [System.IO.File]::ReadAllBytes($certP12)
    $base64 = [Convert]::ToBase64String($bytes)
    $tempCert = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($tempCert, $base64, [System.Text.Encoding]::ASCII)
    gh secret set IOS_DISTRIBUTION_CERTIFICATE_BASE64 --body-file $tempCert
    Remove-Item $tempCert
    Write-Host "  [OK] Certificate encoded and uploaded" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] No certificate found" -ForegroundColor Yellow
}

# Set empty password for certificate
echo "" | gh secret set IOS_DISTRIBUTION_CERTIFICATE_PASSWORD
Write-Host "  [OK] Certificate password set (empty)" -ForegroundColor Green

# Check for provisioning profile
$profilePath = "$certPath\Serenity_App_Store_Profile.mobileprovision"
if (Test-Path $profilePath) {
    Write-Host "  Found provisioning profile" -ForegroundColor Green
    $bytes = [System.IO.File]::ReadAllBytes($profilePath)
    $base64 = [Convert]::ToBase64String($bytes)
    $tempProfile = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($tempProfile, $base64, [System.Text.Encoding]::ASCII)
    gh secret set IOS_PROVISION_PROFILE_BASE64 --body-file $tempProfile
    Remove-Item $tempProfile
    Write-Host "  [OK] Provisioning profile encoded and uploaded" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] Provisioning profile not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 3: Setting Supabase credentials..." -ForegroundColor Yellow

# Set Supabase URL
echo "https://osfgyoupkmjbxwodsoqh.supabase.co" | gh secret set VITE_SUPABASE_URL
Write-Host "  [OK] VITE_SUPABASE_URL set" -ForegroundColor Green

# Set Supabase Anon Key
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZmd5b3Vwa21qYnh3b2Rzb3FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NzU0ODIsImV4cCI6MjA3MDA1MTQ4Mn0.VppoX3FM-8g1-XcbzUFretE78xGjpLd7VFZANFF85Tw" | gh secret set VITE_SUPABASE_ANON_KEY
Write-Host "  [OK] VITE_SUPABASE_ANON_KEY set" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Configured secrets:" -ForegroundColor Yellow
gh secret list | findstr /I "APP_STORE IOS VITE"

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Re-run the failed workflow:" -ForegroundColor White
Write-Host "   gh run rerun 17222259396" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Or trigger new deployment:" -ForegroundColor White
Write-Host "   git commit --allow-empty -m 'trigger: iOS deployment'" -ForegroundColor Cyan
Write-Host "   git push" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your app should deploy to TestFlight in 10-15 minutes!" -ForegroundColor Green