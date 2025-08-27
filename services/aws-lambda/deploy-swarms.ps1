# Deploy AWS Lambda Swarms
param([string]$Environment = "staging")

Write-Host "🚀 Deploying AWS Lambda Swarms to $Environment" -ForegroundColor Blue
Write-Host ""

$swarms = @("peer-support-swarm", "clinical-swarm", "security-swarm", "emergency-swarm")

foreach ($swarm in $swarms) {
    Write-Host "📦 Deploying $swarm..." -ForegroundColor Yellow
    
    if (Test-Path $swarm) {
        Set-Location $swarm
        
        # Install dependencies
        Write-Host "  Installing dependencies..." -ForegroundColor Gray
        npm install --silent 2>&1 | Out-Null
        
        # Deploy with CDK
        Write-Host "  Running CDK deploy..." -ForegroundColor Cyan
        cdk deploy --require-approval never --context environment=$Environment
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ $swarm deployed!" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $swarm failed!" -ForegroundColor Red
        }
        
        Set-Location ..
    }
    Write-Host ""
}

Write-Host "✅ Deployment complete!" -ForegroundColor Green