# Vercel Environment Verification Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Vercel Deployment Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$PROD_URL = "https://serenity-sober-pathways-guide.vercel.app"

# Step 1: Check site accessibility
Write-Host "`nStep 1: Checking site accessibility..." -ForegroundColor Yellow
$response = curl -I $PROD_URL 2>&1 | Select-String "HTTP"
if ($response -match "200 OK") {
    Write-Host "✅ Site is accessible (HTTP 200)" -ForegroundColor Green
} else {
    Write-Host "❌ Site may have issues" -ForegroundColor Red
    Write-Host $response
}

# Step 2: Check security headers
Write-Host "`nStep 2: Verifying security headers..." -ForegroundColor Yellow
$headers = curl -I $PROD_URL 2>&1
$hsts = $headers | Select-String "Strict-Transport-Security"
$csp = $headers | Select-String "Content-Security-Policy"
$xframe = $headers | Select-String "X-Frame-Options"

if ($hsts) {
    Write-Host "✅ HSTS header present" -ForegroundColor Green
} else {
    Write-Host "⚠️ HSTS header missing" -ForegroundColor Yellow
}

if ($csp) {
    Write-Host "✅ CSP header present" -ForegroundColor Green
} else {
    Write-Host "⚠️ CSP header missing" -ForegroundColor Yellow
}

if ($xframe) {
    Write-Host "✅ X-Frame-Options header present" -ForegroundColor Green
} else {
    Write-Host "⚠️ X-Frame-Options header missing" -ForegroundColor Yellow
}

# Step 3: Check environment variables in browser
Write-Host "`nStep 3: Environment variable check..." -ForegroundColor Yellow
Write-Host "The site should connect to Supabase at:" -ForegroundColor White
Write-Host "  https://tqyiqstpvwztvofrxpuf.supabase.co" -ForegroundColor Cyan

# Step 4: Fetch site content
Write-Host "`nStep 4: Fetching site content..." -ForegroundColor Yellow
$content = curl $PROD_URL 2>&1 | Select-String -Pattern "<title>|supabase|vite"
if ($content -match "Serenity") {
    Write-Host "✅ Site title found: Serenity" -ForegroundColor Green
}
if ($content -match "supabase") {
    Write-Host "✅ Supabase references found in HTML" -ForegroundColor Green
}

# Step 5: Check latest deployment
Write-Host "`nStep 5: Latest deployment info..." -ForegroundColor Yellow
$deployments = vercel ls --limit 1 2>&1
Write-Host $deployments -ForegroundColor Cyan

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Verification Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Open browser: $PROD_URL" -ForegroundColor White
Write-Host "2. Check browser console for errors" -ForegroundColor White
Write-Host "3. Try logging in with test credentials" -ForegroundColor White
Write-Host "4. Monitor network tab for Supabase API calls" -ForegroundColor White