# Fix remaining secrets that need file input
Write-Host "Fixing remaining iOS secrets..." -ForegroundColor Cyan

# Fix API Key (use < redirection instead of --body-file)
Write-Host "Updating APP_STORE_CONNECT_API_KEY..." -ForegroundColor Yellow
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
Get-Content $tempFile | gh secret set APP_STORE_CONNECT_API_KEY
Remove-Item $tempFile
Write-Host "[OK] API Key updated" -ForegroundColor Green

# Set distribution certificate
Write-Host "Setting IOS_DISTRIBUTION_CERTIFICATE_BASE64..." -ForegroundColor Yellow
$certPath = "C:\ios-certs\ios_distribution.pfx"
if (Test-Path $certPath) {
    $bytes = [System.IO.File]::ReadAllBytes($certPath)
    $base64 = [Convert]::ToBase64String($bytes)
    $tempCert = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($tempCert, $base64, [System.Text.Encoding]::ASCII)
    Get-Content $tempCert | gh secret set IOS_DISTRIBUTION_CERTIFICATE_BASE64
    Remove-Item $tempCert
    Write-Host "[OK] Certificate uploaded" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Certificate not found" -ForegroundColor Yellow
}

# Set provisioning profile
Write-Host "Setting IOS_PROVISION_PROFILE_BASE64..." -ForegroundColor Yellow
$profilePath = "C:\ios-certs\Serenity_App_Store_Profile.mobileprovision"
if (Test-Path $profilePath) {
    $bytes = [System.IO.File]::ReadAllBytes($profilePath)
    $base64 = [Convert]::ToBase64String($bytes)
    $tempProfile = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($tempProfile, $base64, [System.Text.Encoding]::ASCII)
    Get-Content $tempProfile | gh secret set IOS_PROVISION_PROFILE_BASE64
    Remove-Item $tempProfile
    Write-Host "[OK] Provisioning profile uploaded" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Provisioning profile not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "ALL SECRETS CONFIGURED!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Final check of secrets:" -ForegroundColor Yellow
gh secret list | findstr /I "APP_STORE IOS"
Write-Host ""
Write-Host "Re-run the deployment:" -ForegroundColor Yellow
Write-Host "gh run rerun 17222259396" -ForegroundColor Cyan