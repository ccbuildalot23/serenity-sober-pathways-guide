# Simple Sequential Optimization Script
# Runs each task one by one with proper error handling

Write-Host "`n🚀 STARTING SEQUENTIAL OPTIMIZATION..." -ForegroundColor Cyan
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Yellow

# Create log directory
$logDir = "optimization-logs\$(Get-Date -Format 'yyyy-MM-dd-HHmm')"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

Write-Host "`n📦 Running security scan..." -ForegroundColor Yellow
node scripts/security-dependency-scan.cjs 2>&1 | Tee-Object -FilePath "$logDir\security.log"

Write-Host "`n✨ Fixing linting issues..." -ForegroundColor Yellow
npm run lint:fix 2>&1 | Tee-Object -FilePath "$logDir\lint.log"

Write-Host "`n🔍 Running type check..." -ForegroundColor Yellow
npm run typecheck 2>&1 | Tee-Object -FilePath "$logDir\typecheck.log"

Write-Host "`n🧪 Running E2E tests..." -ForegroundColor Yellow
npm run test:e2e 2>&1 | Tee-Object -FilePath "$logDir\tests.log"

Write-Host "`n✅ OPTIMIZATION COMPLETE!" -ForegroundColor Green
Write-Host "Logs saved to: $logDir" -ForegroundColor Cyan