# Deploy All AWS Lambda Swarms
# Usage: .\deploy-all-swarms.ps1 [environment]
# Example: .\deploy-all-swarms.ps1 staging

param(
    [string]$Environment = "staging"
)

Write-Host "🚀 Deploying AWS Lambda Swarms" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue
Write-Host "Environment: $Environment" -ForegroundColor Green
Write-Host ""

$ErrorActionPreference = "Continue"
$AWS_REGION = "us-east-1"
$ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)

Write-Host "Account: $ACCOUNT_ID" -ForegroundColor Green
Write-Host "Region: $AWS_REGION" -ForegroundColor Green
Write-Host ""

# Array of swarms to deploy
$swarms = @(
    @{Name="peer-support-swarm"; StackName="PeerSupportSwarmStack"},
    @{Name="clinical-swarm"; StackName="ClinicalSwarmStack"},
    @{Name="security-swarm"; StackName="SecuritySwarmStack"},
    @{Name="emergency-swarm"; StackName="EmergencySwarmStack"}
)

$deploymentResults = @()

foreach ($swarm in $swarms) {
    Write-Host "📦 Deploying $($swarm.Name)..." -ForegroundColor Yellow
    
    $swarmPath = Join-Path $PSScriptRoot $swarm.Name
    if (Test-Path $swarmPath) {
        Push-Location $swarmPath
        
        try {
            # Install dependencies if package.json exists
            if (Test-Path "package.json") {
                Write-Host "  Installing dependencies..." -ForegroundColor Gray
                npm install --silent 2>&1 | Out-Null
            }
            
            # Build TypeScript if needed
            if (Test-Path "tsconfig.json") {
                Write-Host "  Building TypeScript..." -ForegroundColor Gray
                npx tsc 2>&1 | Out-Null
            }
            
            # Deploy with CDK
            Write-Host "  Deploying CDK stack..." -ForegroundColor Gray
            $stackName = "$($swarm.StackName)-$Environment"
            
            # First, synthesize to check for errors
            $synthResult = cdk synth --context environment=$Environment 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ Synthesis successful" -ForegroundColor Green
                
                # Deploy the stack
                Write-Host "  🚀 Deploying $stackName..." -ForegroundColor Cyan
                $deployCommand = "cdk deploy --require-approval never --context environment=$Environment --outputs-file outputs-$Environment.json"
                
                $result = Invoke-Expression $deployCommand 2>&1
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "  ✅ $($swarm.Name) deployed successfully!" -ForegroundColor Green
                    $deploymentResults += @{Swarm=$swarm.Name; Status="Success"; Stack=$stackName}
                    
                    # Parse outputs if file exists
                    $outputFile = "outputs-$Environment.json"
                    if (Test-Path $outputFile) {
                        $outputs = Get-Content $outputFile | ConvertFrom-Json
                        if ($outputs.$stackName) {
                            Write-Host "  📍 Stack Outputs:" -ForegroundColor Blue
                            $outputs.$stackName.PSObject.Properties | ForEach-Object {
                                Write-Host "     $($_.Name): $($_.Value)" -ForegroundColor Gray
                            }
                        }
                    }
                } else {
                    Write-Host "  ❌ Deployment failed for $($swarm.Name)" -ForegroundColor Red
                    Write-Host "  Error: $result" -ForegroundColor Red
                    $deploymentResults += @{Swarm=$swarm.Name; Status="Failed"; Stack=$stackName; Error=$result}
                }
            } else {
                Write-Host "  ❌ Synthesis failed for $($swarm.Name)" -ForegroundColor Red
                Write-Host "  Error: $synthResult" -ForegroundColor Red
                $deploymentResults += @{Swarm=$swarm.Name; Status="Synthesis Failed"; Stack=$stackName; Error=$synthResult}
            }
            
        } catch {
            Write-Host "  ❌ Error deploying $($swarm.Name): $_" -ForegroundColor Red
            $deploymentResults += @{Swarm=$swarm.Name; Status="Error"; Stack=$stackName; Error=$_}
        } finally {
            Pop-Location
        }
    } else {
        Write-Host "  ⚠️ Directory not found: $swarmPath" -ForegroundColor Yellow
        $deploymentResults += @{Swarm=$swarm.Name; Status="Not Found"; Stack=$stackName}
    }
    
    Write-Host ""
}

# Display summary
Write-Host "================================" -ForegroundColor Blue
Write-Host "📊 Deployment Summary" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue

$successCount = ($deploymentResults | Where-Object { $_.Status -eq "Success" }).Count
$failCount = ($deploymentResults | Where-Object { $_.Status -ne "Success" }).Count

foreach ($result in $deploymentResults) {
    $icon = if ($result.Status -eq "Success") { "✅" } else { "❌" }
    $color = if ($result.Status -eq "Success") { "Green" } else { "Red" }
    Write-Host "$icon $($result.Swarm): $($result.Status)" -ForegroundColor $color
}

Write-Host ""
Write-Host "Deployed: $successCount / $($swarms.Count)" -ForegroundColor $(if ($successCount -eq $swarms.Count) { "Green" } else { "Yellow" })

if ($successCount -gt 0) {
    Write-Host ""
    Write-Host "🎉 Next Steps:" -ForegroundColor Blue
    Write-Host "1. Verify health endpoints:" -ForegroundColor Gray
    Write-Host "   .\check-deployment.ps1" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Check CloudWatch logs:" -ForegroundColor Gray
    Write-Host "   aws logs tail /aws/lambda/PeerSupportQueen-$Environment --follow" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Test the APIs:" -ForegroundColor Gray
    Write-Host "   Use the API Gateway URLs from the stack outputs above" -ForegroundColor Gray
}

if ($failCount -gt 0) {
    Write-Host ""
    Write-Host "⚠️ Some deployments failed. Check the errors above." -ForegroundColor Yellow
    Write-Host "You can retry individual deployments with:" -ForegroundColor Yellow
    Write-Host "  cd [swarm-directory]" -ForegroundColor Gray
    Write-Host ("  cdk deploy --context environment=" + $Environment) -ForegroundColor Gray
}