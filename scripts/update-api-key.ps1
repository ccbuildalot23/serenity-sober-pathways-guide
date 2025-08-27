# Update App Store Connect API Key in GitHub Secrets

# Read the API key file
$apiKeyPath = "C:\ios-certs\AuthKey_4YBU7UC32Y.p8"
if (-not (Test-Path $apiKeyPath)) {
    Write-Host "❌ API key file not found at: $apiKeyPath" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Reading API key from: $apiKeyPath" -ForegroundColor Yellow
$apiKeyContent = Get-Content $apiKeyPath -Raw

Write-Host "API key content (first 50 chars):" -ForegroundColor Cyan
Write-Host $apiKeyContent.Substring(0, 50) -ForegroundColor Gray

# Update GitHub secret
Write-Host "🔐 Updating GitHub secret APP_STORE_CONNECT_API_KEY..." -ForegroundColor Yellow

# Use GitHub CLI to update the secret
$result = gh secret set APP_STORE_CONNECT_API_KEY --body $apiKeyContent 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Successfully updated APP_STORE_CONNECT_API_KEY" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to update secret: $result" -ForegroundColor Red
    exit 1
}

# Also verify the key ID matches
Write-Host "`n📝 Key ID from filename: 4YBU7UC32Y" -ForegroundColor Yellow
Write-Host "📝 Please ensure APP_STORE_CONNECT_KEY_ID is set to: 4YBU7UC32Y" -ForegroundColor Yellow

# Check current value
$keyId = gh secret list | Select-String "APP_STORE_CONNECT_KEY_ID"
Write-Host "Current setting: $keyId" -ForegroundColor Cyan

Write-Host "`n🎉 API key updated successfully!" -ForegroundColor Green
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Verify APP_STORE_CONNECT_KEY_ID = 4YBU7UC32Y" -ForegroundColor White
Write-Host "   2. Verify APP_STORE_CONNECT_ISSUER_ID is set correctly" -ForegroundColor White
Write-Host "   3. Re-run the iOS deployment workflow" -ForegroundColor White