# Vercel Environment Setup Helper Script
# This script helps you configure Vercel environment variables securely

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VERCEL ENVIRONMENT SETUP ASSISTANT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to generate secure encryption key
function Generate-EncryptionKey {
    $bytes = New-Object byte[] 32
    [Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
    return [BitConverter]::ToString($bytes).Replace("-", "").ToLower()
}

# Generate new encryption key for production
$encryptionKey = Generate-EncryptionKey
Write-Host "Generated New Encryption Key (SAVE THIS!):" -ForegroundColor Green
Write-Host $encryptionKey -ForegroundColor Yellow
Write-Host ""

# Read values from backup file
$backupFile = ".env.backup.secure"
if (Test-Path $backupFile) {
    Write-Host "Reading values from $backupFile..." -ForegroundColor Yellow
    $backupContent = Get-Content $backupFile
    
    # Extract values
    $supabaseUrl = ($backupContent | Select-String "VITE_SUPABASE_URL=(.*)").Matches[0].Groups[1].Value
    $supabaseKey = ($backupContent | Select-String "VITE_SUPABASE_ANON_KEY=(.*)").Matches[0].Groups[1].Value
    $appleKeyId = ($backupContent | Select-String "APP_STORE_CONNECT_API_KEY_ID=(.*)").Matches[0].Groups[1].Value
    $appleIssuerId = ($backupContent | Select-String "APP_STORE_CONNECT_ISSUER_ID=(.*)").Matches[0].Groups[1].Value
    $appleId = ($backupContent | Select-String "APPLE_ID=(.*)").Matches[0].Groups[1].Value
    $appleTeamId = ($backupContent | Select-String "APPLE_TEAM_ID=(.*)").Matches[0].Groups[1].Value
    
    Write-Host "✅ Values extracted from backup" -ForegroundColor Green
} else {
    Write-Host "⚠️ Backup file not found. Manual entry required." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  REQUIRED ENVIRONMENT VARIABLES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Copy these to Vercel Dashboard:" -ForegroundColor Yellow
Write-Host "(https://vercel.com/dashboard → Your Project → Settings → Environment Variables)" -ForegroundColor Gray
Write-Host ""

Write-Host "# Core Configuration" -ForegroundColor Green
Write-Host "VITE_SUPABASE_URL=$supabaseUrl"
Write-Host "VITE_SUPABASE_ANON_KEY=$supabaseKey"
Write-Host "SUPABASE_URL=$supabaseUrl"
Write-Host "SUPABASE_ANON_KEY=$supabaseKey"
Write-Host ""

Write-Host "# Security (NEW - DO NOT USE OLD KEY)" -ForegroundColor Green
Write-Host "VITE_ENCRYPTION_MASTER_KEY=$encryptionKey" -ForegroundColor Yellow
Write-Host ""

Write-Host "# Apple Configuration (ROTATE AFTER ADDING)" -ForegroundColor Green
Write-Host "APP_STORE_CONNECT_API_KEY_ID=$appleKeyId"
Write-Host "APP_STORE_CONNECT_ISSUER_ID=$appleIssuerId"
Write-Host "APPLE_ID=$appleId"
Write-Host "APPLE_TEAM_ID=$appleTeamId"
Write-Host ""

Write-Host "# Sentry (Add after Phase 2)" -ForegroundColor Green
Write-Host "VITE_SENTRY_DSN=[GET_FROM_SENTRY]"
Write-Host "SENTRY_AUTH_TOKEN=[GET_FROM_SENTRY]"
Write-Host ""

Write-Host "# Production Settings" -ForegroundColor Green
Write-Host "NODE_ENV=production"
Write-Host "VITE_APP_ENV=production"
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VERCEL CLI COMMANDS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "After adding to dashboard, verify with:" -ForegroundColor Yellow
Write-Host "vercel env pull .env.production" -ForegroundColor White
Write-Host ""

Write-Host "Or add via CLI (one by one):" -ForegroundColor Yellow
Write-Host "vercel env add VITE_SUPABASE_URL production" -ForegroundColor White
Write-Host "vercel env add VITE_ENCRYPTION_MASTER_KEY production" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SECURITY NOTES" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. The P12_PASSWORD has been removed for security" -ForegroundColor Yellow
Write-Host "2. Generate a NEW password for P12_PASSWORD" -ForegroundColor Yellow
Write-Host "3. The APP_STORE_CONNECT_KEY (private key) should be added separately" -ForegroundColor Yellow
Write-Host "4. Rotate Apple API credentials after adding" -ForegroundColor Yellow
Write-Host "5. Never commit these values to git" -ForegroundColor Yellow
Write-Host ""

# Save to file for reference
$outputFile = "vercel-env-values.txt"
@"
# Generated $(Get-Date)
# DO NOT COMMIT THIS FILE

VITE_SUPABASE_URL=$supabaseUrl
VITE_SUPABASE_ANON_KEY=$supabaseKey
SUPABASE_URL=$supabaseUrl
SUPABASE_ANON_KEY=$supabaseKey
VITE_ENCRYPTION_MASTER_KEY=$encryptionKey
APP_STORE_CONNECT_API_KEY_ID=$appleKeyId
APP_STORE_CONNECT_ISSUER_ID=$appleIssuerId
APPLE_ID=$appleId
APPLE_TEAM_ID=$appleTeamId
"@ | Out-File $outputFile

Write-Host "✅ Values saved to $outputFile for reference" -ForegroundColor Green
Write-Host "   (Delete this file after configuring Vercel!)" -ForegroundColor Yellow