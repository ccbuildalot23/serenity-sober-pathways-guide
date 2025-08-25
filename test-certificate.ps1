# Test iOS Certificate Password
Write-Host "=================================================================================" -ForegroundColor Cyan
Write-Host "  iOS Certificate Password Tester" -ForegroundColor Cyan
Write-Host "=================================================================================" -ForegroundColor Cyan
Write-Host ""

$certPath = "C:\ios-certs\ios_distribution.pfx"
$opensslPath = "C:\Program Files\Git\mingw64\bin\openssl.exe"

if (-not (Test-Path $certPath)) {
    Write-Host "❌ Certificate not found at: $certPath" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Certificate found: $certPath" -ForegroundColor Green
Write-Host ""
Write-Host "Please enter the password for the certificate to test it:" -ForegroundColor Yellow
$password = Read-Host "Certificate Password" -AsSecureString
$passwordText = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

Write-Host ""
Write-Host "🔐 Testing certificate with provided password..." -ForegroundColor Yellow

# Test the certificate
$testResult = & "$opensslPath" pkcs12 -in "$certPath" -passin "pass:$passwordText" -noout 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ SUCCESS! Password is correct!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Now updating GitHub Secret with this password..." -ForegroundColor Yellow
    
    # Update GitHub secret
    $passwordText | gh secret set IOS_CERTIFICATE_PASSWORD --repo ccbuildalot23/serenity-sober-pathways-guide
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ GitHub Secret updated successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🚀 Ready to retry deployment!" -ForegroundColor Cyan
        Write-Host "Run: gh workflow run ios-deploy.yml --ref notification-microservice" -ForegroundColor White
    } else {
        Write-Host "❌ Failed to update GitHub Secret" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Password is incorrect!" -ForegroundColor Red
    Write-Host "Error: $testResult" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Common passwords to try:" -ForegroundColor Yellow
    Write-Host "• (empty/blank password)" -ForegroundColor White
    Write-Host "• 1234" -ForegroundColor White
    Write-Host "• password" -ForegroundColor White
    Write-Host "• The password you used when exporting from Keychain" -ForegroundColor White
}