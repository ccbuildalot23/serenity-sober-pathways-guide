# Simple AWS Lambda Deployment Check

Write-Host "🔍 AWS Lambda Swarm Deployment Status" -ForegroundColor Blue
Write-Host "======================================" -ForegroundColor Blue
Write-Host ""

$AWS_REGION = "us-east-1"

# Check Lambda Functions
Write-Host "Lambda Functions:" -ForegroundColor Yellow
aws lambda list-functions --region $AWS_REGION --query "Functions[*].[FunctionName,State]" --output table 2>$null | Select-String -Pattern "Serenity|Peer|Clinical|Emergency|RBAC"

Write-Host ""

# Check DynamoDB Tables  
Write-Host "DynamoDB Tables:" -ForegroundColor Yellow
$tables = @(
    "PeerSupportRateLimit-dev",
    "PeerSupportActivity-dev", 
    "ClinicalDecisions-dev",
    "EmergencyEvents-dev",
    "RBACPolicies-dev"
)

foreach ($table in $tables) {
    $exists = aws dynamodb describe-table --table-name $table --region $AWS_REGION --query "Table.TableStatus" --output text 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ $table : $exists" -ForegroundColor Green
    }
}

Write-Host ""

# Check Secrets
Write-Host "Secrets Manager:" -ForegroundColor Yellow
aws secretsmanager list-secrets --region $AWS_REGION --query "SecretList[*].Name" --output text | Select-String -Pattern "serenity" | ForEach-Object {
    Write-Host "  ✅ $_" -ForegroundColor Green
}

Write-Host ""

# Check CloudWatch Log Groups
Write-Host "CloudWatch Log Groups:" -ForegroundColor Yellow
$logGroups = aws logs describe-log-groups --region $AWS_REGION --query "logGroups[*].logGroupName" --output text 2>$null
if ($logGroups) {
    $logGroups | Select-String -Pattern "Serenity|PeerSupport|Clinical|Emergency" | ForEach-Object {
        Write-Host "  📝 $_" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Blue
Write-Host "✅ Check Complete" -ForegroundColor Green