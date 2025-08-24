# Verify AWS Lambda Swarm Deployment
# This script checks the deployment status and tests health endpoints

Write-Host "🔍 Verifying AWS Lambda Swarm Deployment" -ForegroundColor Blue
Write-Host "==========================================" -ForegroundColor Blue
Write-Host ""

$AWS_REGION = "us-east-1"
$ENVIRONMENT = if ($args[0]) { $args[0] } else { "staging" }

Write-Host "Environment: $ENVIRONMENT" -ForegroundColor Green
Write-Host "Region: $AWS_REGION" -ForegroundColor Green
Write-Host ""

# Function to check if a command exists
function Test-Command {
    param($Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

# Check AWS CLI
if (-not (Test-Command "aws")) {
    Write-Host "❌ AWS CLI not found" -ForegroundColor Red
    exit 1
}

# 1. Check CloudFormation Stacks
Write-Host "📊 Checking CloudFormation Stacks..." -ForegroundColor Yellow
$stacks = @("PeerSupportSwarmStack", "ClinicalSwarmStack", "SecuritySwarmStack", "EmergencySwarmStack")

foreach ($stack in $stacks) {
    $stackName = "$stack-$ENVIRONMENT"
    $stackStatus = aws cloudformation describe-stacks `
        --stack-name $stackName `
        --region $AWS_REGION `
        --query "Stacks[0].StackStatus" `
        --output text 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        if ($stackStatus -eq "CREATE_COMPLETE" -or $stackStatus -eq "UPDATE_COMPLETE") {
            Write-Host "✅ $stackName : $stackStatus" -ForegroundColor Green
        } else {
            Write-Host "⚠️ $stackName : $stackStatus" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ $stackName : Not deployed" -ForegroundColor Red
    }
}
Write-Host ""

# 2. Check Lambda Functions
Write-Host "🔧 Checking Lambda Functions..." -ForegroundColor Yellow
$query = 'Functions[?contains(FunctionName, "Serenity")].[FunctionName,State,LastModified]'
$functions = aws lambda list-functions `
    --region $AWS_REGION `
    --query $query `
    --output json | ConvertFrom-Json

if ($functions.Count -gt 0) {
    Write-Host "Found $($functions.Count) Lambda functions:" -ForegroundColor Green
    foreach ($func in $functions) {
        $name = $func[0]
        $state = $func[1]
        $modified = $func[2]
        
        if ($state -eq "Active") {
            Write-Host "  ✅ $name (Active)" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️ $name ($state)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "❌ No Lambda functions found for environment: $ENVIRONMENT" -ForegroundColor Red
}
Write-Host ""

# 3. Check API Gateway Endpoints
Write-Host "🌐 Checking API Gateway Endpoints..." -ForegroundColor Yellow
$apiQuery = 'items[?contains(name, "Serenity")].[name,id,createdDate]'
$apis = aws apigateway get-rest-apis `
    --region $AWS_REGION `
    --query $apiQuery `
    --output json 2>$null | ConvertFrom-Json

if ($apis.Count -gt 0) {
    Write-Host "Found $($apis.Count) API Gateway endpoints:" -ForegroundColor Green
    foreach ($api in $apis) {
        $name = $api[0]
        $apiId = $api[1]
        $baseUrl = "https://$apiId.execute-api.$AWS_REGION.amazonaws.com/$ENVIRONMENT"
        
        Write-Host "  📍 $name" -ForegroundColor Cyan
        Write-Host "     URL: $baseUrl" -ForegroundColor Gray
        
        # Test health endpoint
        $healthUrl = "$baseUrl/peer/health"
        try {
            $response = Invoke-RestMethod -Uri $healthUrl -Method GET -TimeoutSec 5 2>$null
            if ($response) {
                Write-Host "     ✅ Health check passed" -ForegroundColor Green
            }
        } catch {
            Write-Host "     ⚠️ Health check failed or not configured" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "⚠️ No API Gateway endpoints found" -ForegroundColor Yellow
}
Write-Host ""

# 4. Check DynamoDB Tables
Write-Host "💾 Checking DynamoDB Tables..." -ForegroundColor Yellow
$tables = @(
    "PeerSupportRateLimit-$ENVIRONMENT",
    "PeerSupportActivity-$ENVIRONMENT",
    "ClinicalDecisions-$ENVIRONMENT",
    "EmergencyEvents-$ENVIRONMENT",
    "RBACPolicies-$ENVIRONMENT"
)

foreach ($table in $tables) {
    $tableStatus = aws dynamodb describe-table `
        --table-name $table `
        --region $AWS_REGION `
        --query "Table.TableStatus" `
        --output text 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        if ($tableStatus -eq "ACTIVE") {
            Write-Host "✅ $table : Active" -ForegroundColor Green
        } else {
            Write-Host "⚠️ $table : $tableStatus" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ $table : Not found" -ForegroundColor Red
    }
}
Write-Host ""

# 5. Check CloudWatch Log Groups
Write-Host "📝 Checking CloudWatch Log Groups..." -ForegroundColor Yellow
$logQuery = 'logGroups[?contains(logGroupName, "/aws/lambda/Serenity")].logGroupName'
$logGroups = aws logs describe-log-groups `
    --region $AWS_REGION `
    --query $logQuery `
    --output json | ConvertFrom-Json

if ($logGroups.Count -gt 0) {
    Write-Host "Found $($logGroups.Count) log groups:" -ForegroundColor Green
    foreach ($logGroup in $logGroups) {
        # Check for recent logs
        $recentLogs = aws logs filter-log-events `
            --log-group-name $logGroup `
            --start-time ((Get-Date).AddHours(-1).ToUniversalTime().Subtract([datetime]'1970-01-01').TotalMilliseconds) `
            --max-items 1 `
            --region $AWS_REGION 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ $logGroup (Has recent logs)" -ForegroundColor Green
        } else {
            Write-Host "  📁 $logGroup (No recent activity)" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "⚠️ No CloudWatch log groups found" -ForegroundColor Yellow
}
Write-Host ""

# 6. Check Secrets Manager
Write-Host "🔐 Checking Secrets Manager..." -ForegroundColor Yellow
$secretName = "serenity-$ENVIRONMENT-api-keys"
$secret = aws secretsmanager describe-secret `
    --secret-id $secretName `
    --region $AWS_REGION `
    --query "Name" `
    --output text 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Secret configured: $secretName" -ForegroundColor Green
    
    # Check if secret needs updating (contains placeholder values)
    $secretValue = aws secretsmanager get-secret-value `
        --secret-id $secretName `
        --region $AWS_REGION `
        --query "SecretString" `
        --output text 2>$null | ConvertFrom-Json
    
    if ($secretValue.openaiApiKey -like "*placeholder*") {
        Write-Host "  ⚠️ Contains placeholder values - update before production use" -ForegroundColor Yellow
    } else {
        Write-Host "  ✅ API keys configured" -ForegroundColor Green
    }
} else {
    Write-Host "❌ Secret not found: $secretName" -ForegroundColor Red
}
Write-Host ""

# 7. Test Swarm Functionality (if deployed)
if ($functions.Count -gt 0) {
    Write-Host "🧪 Testing Swarm Functionality..." -ForegroundColor Yellow
    
    # Test PeerSupport swarm
    $peerFunction = "PeerSupportQueen-$ENVIRONMENT"
    $testPayload = @{
        path = "/peer/health"
        httpMethod = "GET"
        body = ""
    } | ConvertTo-Json -Compress
    
    $invokeResult = aws lambda invoke `
        --function-name $peerFunction `
        --payload $testPayload `
        --region $AWS_REGION `
        response.json 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        $response = Get-Content response.json | ConvertFrom-Json
        if ($response.statusCode -eq 200) {
            Write-Host "✅ PeerSupport Swarm: Operational" -ForegroundColor Green
        } else {
            Write-Host "⚠️ PeerSupport Swarm: Response code $($response.statusCode)" -ForegroundColor Yellow
        }
        Remove-Item response.json -ErrorAction SilentlyContinue
    } else {
        Write-Host "⚠️ PeerSupport Swarm: Not accessible" -ForegroundColor Yellow
    }
}
Write-Host ""

# Summary
Write-Host "==========================================" -ForegroundColor Blue
Write-Host "📊 Deployment Summary" -ForegroundColor Blue
Write-Host "==========================================" -ForegroundColor Blue

$deploymentReady = $true

if ($functions.Count -eq 0) {
    Write-Host "⚠️ Lambda functions not yet deployed" -ForegroundColor Yellow
    Write-Host "  Run: .\deploy-all-swarms.ps1 $ENVIRONMENT" -ForegroundColor Gray
    $deploymentReady = $false
}

if ($apis.Count -eq 0) {
    Write-Host "⚠️ API Gateway endpoints not configured" -ForegroundColor Yellow
    $deploymentReady = $false
}

if ($deploymentReady) {
    Write-Host "✅ Deployment verification complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Blue
    Write-Host "1. Update API keys in Secrets Manager if needed" -ForegroundColor Gray
    Write-Host "2. Configure custom domain names for production" -ForegroundColor Gray
    Write-Host "3. Set up CloudWatch alarms for monitoring" -ForegroundColor Gray
    Write-Host "4. Test swarm interactions with sample requests" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "🚧 Deployment in progress or not yet started" -ForegroundColor Yellow
    Write-Host "Please complete deployment before verification" -ForegroundColor Yellow
}