# Production Environment Validation
Write-Host "PRODUCTION ENVIRONMENT VALIDATION" -ForegroundColor Cyan
$errors = 0

# Check main env file
if (Test-Path ".env.production.complete") {
    Write-Host "✅ Main production environment file exists" -ForegroundColor Green
} else {
    Write-Host "❌ Main production environment file not found!" -ForegroundColor Red
    $errors++
}

# Check service env files
$services = @("auth-service", "notification-service", "crisis-service", "patient-portal")
foreach ($service in $services) {
    if (Test-Path "$service/.env.production") {
        Write-Host "✅ $service production env exists" -ForegroundColor Green
    } else {
        Write-Host "❌ $service production env not found!" -ForegroundColor Red
        $errors++
    }
}

# Check for placeholders
$content = Get-Content ".env.production.complete" -ErrorAction SilentlyContinue
$placeholders = @("[RDS_ENDPOINT]", "[ELASTICACHE_ENDPOINT]", "your-project.supabase.co", "ACxxxxxx")
foreach ($p in $placeholders) {
    if ($content -match [regex]::Escape($p)) {
        Write-Host "⚠️  Placeholder found: $p" -ForegroundColor Yellow
    }
}

if ($errors -eq 0) {
    Write-Host "`n✅ Environment files created successfully!" -ForegroundColor Green
    Write-Host "⚠️  Remember to update placeholder values with actual credentials" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ $errors error(s) found" -ForegroundColor Red
}
