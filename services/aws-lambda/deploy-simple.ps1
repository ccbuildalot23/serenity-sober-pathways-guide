# Simple AWS Lambda Deployment without CDK complexities
param([string]$Environment = "staging")

Write-Host "🚀 Simple AWS Lambda Deployment" -ForegroundColor Blue
Write-Host ""

$AWS_REGION = "us-east-1"
$ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)

Write-Host "Account: $ACCOUNT_ID" -ForegroundColor Green
Write-Host "Region: $AWS_REGION" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Green
Write-Host ""

# Create deployment package for a simple Lambda
Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow

$functionName = "SerenityPeerSupportSimple-$Environment"

# Create a simple Lambda function code
$lambdaCode = @'
exports.handler = async (event) => {
    console.log('PeerSupport Lambda invoked:', event);
    
    const response = {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            message: 'PeerSupport Swarm is operational',
            environment: process.env.ENVIRONMENT || 'staging',
            timestamp: new Date().toISOString(),
            status: 'healthy',
            version: '1.0.0'
        })
    };
    
    return response;
};
'@

# Save to file
$lambdaCode | Out-File -FilePath index.js -Encoding UTF8

# Create zip package
Write-Host "  Creating zip package..." -ForegroundColor Gray
Compress-Archive -Path index.js -DestinationPath lambda-deployment.zip -Force

# Upload to S3
$bucketName = "serenity-lambda-deployments-$ACCOUNT_ID-$AWS_REGION"
Write-Host "  Uploading to S3..." -ForegroundColor Gray
aws s3 cp lambda-deployment.zip "s3://$bucketName/peer-support-simple-$Environment.zip" --region $AWS_REGION

# Create or update Lambda function
Write-Host ""
Write-Host "🔧 Creating Lambda function..." -ForegroundColor Yellow

$functionExists = aws lambda get-function --function-name $functionName --region $AWS_REGION 2>$null

if ($LASTEXITCODE -eq 0) {
    # Update existing function
    Write-Host "  Updating existing function..." -ForegroundColor Gray
    aws lambda update-function-code `
        --function-name $functionName `
        --s3-bucket $bucketName `
        --s3-key "peer-support-simple-$Environment.zip" `
        --region $AWS_REGION | Out-Null
    
    Write-Host "✅ Function updated: $functionName" -ForegroundColor Green
} else {
    # Create new function
    Write-Host "  Creating new function..." -ForegroundColor Gray
    
    # Get role ARN
    $roleArn = aws iam get-role --role-name SerenityLambdaExecutionRole --query "Role.Arn" --output text 2>$null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ IAM role not found. Please run setup-aws-windows.ps1 first" -ForegroundColor Red
        exit 1
    }
    
    aws lambda create-function `
        --function-name $functionName `
        --runtime nodejs20.x `
        --role $roleArn `
        --handler index.handler `
        --code "S3Bucket=$bucketName,S3Key=peer-support-simple-$Environment.zip" `
        --description "Simple PeerSupport Lambda for $Environment" `
        --timeout 30 `
        --memory-size 512 `
        --environment "Variables={ENVIRONMENT=$Environment,NODE_ENV=$Environment}" `
        --region $AWS_REGION | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Function created: $functionName" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create function" -ForegroundColor Red
        exit 1
    }
}

# Test the function
Write-Host ""
Write-Host "🧪 Testing Lambda function..." -ForegroundColor Yellow

$testPayload = '{"test": true}'
$response = aws lambda invoke `
    --function-name $functionName `
    --payload $testPayload `
    --region $AWS_REGION `
    response.json 2>$null

if ($LASTEXITCODE -eq 0) {
    $result = Get-Content response.json | ConvertFrom-Json
    Write-Host "✅ Function test successful!" -ForegroundColor Green
    Write-Host "  Response: $($result.message)" -ForegroundColor Gray
    Remove-Item response.json
} else {
    Write-Host "❌ Function test failed" -ForegroundColor Red
}

# Clean up
Remove-Item index.js -ErrorAction SilentlyContinue
Remove-Item lambda-deployment.zip -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "======================================" -ForegroundColor Blue
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Function ARN:" -ForegroundColor Blue
Write-Host "arn:aws:lambda:${AWS_REGION}:${ACCOUNT_ID}:function:${functionName}" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Blue
Write-Host "1. Create API Gateway to expose the Lambda" -ForegroundColor Gray
Write-Host "2. Configure DynamoDB tables for data persistence" -ForegroundColor Gray
Write-Host "3. Set up CloudWatch monitoring" -ForegroundColor Gray