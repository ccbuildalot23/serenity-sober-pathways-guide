# AWS Setup Script for Windows
# Configures AWS environment for Serenity Swarms

Write-Host "🔧 AWS Setup for Serenity Swarms" -ForegroundColor Blue
Write-Host "===================================" -ForegroundColor Blue
Write-Host ""

# Variables
$AWS_REGION = "us-east-1"
$ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)

Write-Host "Account: $ACCOUNT_ID" -ForegroundColor Green
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

# Check requirements
Write-Host "Checking requirements..." -ForegroundColor Yellow

if (Test-Command "aws") {
    Write-Host "✅ AWS CLI found" -ForegroundColor Green
} else {
    Write-Host "❌ AWS CLI not found. Please install from https://aws.amazon.com/cli/" -ForegroundColor Red
    exit 1
}

if (Test-Command "node") {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js not found" -ForegroundColor Red
    exit 1
}

if (Test-Command "cdk") {
    $cdkVersion = cdk --version
    Write-Host "✅ CDK found: $cdkVersion" -ForegroundColor Green
} else {
    Write-Host "❌ CDK not found" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Bootstrap CDK
Write-Host "Bootstrapping CDK..." -ForegroundColor Yellow
try {
    cdk bootstrap "aws://$ACCOUNT_ID/$AWS_REGION" `
        --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess `
        --trust $ACCOUNT_ID 2>$null
    Write-Host "✅ CDK bootstrap complete" -ForegroundColor Green
} catch {
    Write-Host "CDK already bootstrapped or error occurred" -ForegroundColor Yellow
}
Write-Host ""

# Create S3 bucket for deployments
Write-Host "Creating S3 buckets..." -ForegroundColor Yellow
$DEPLOYMENT_BUCKET = "serenity-lambda-deployments-$ACCOUNT_ID-$AWS_REGION"

$bucketExists = aws s3 ls "s3://$DEPLOYMENT_BUCKET" 2>$null
if ($LASTEXITCODE -ne 0) {
    aws s3 mb "s3://$DEPLOYMENT_BUCKET" --region $AWS_REGION
    aws s3api put-bucket-versioning `
        --bucket $DEPLOYMENT_BUCKET `
        --versioning-configuration Status=Enabled
    Write-Host "✅ Created deployment bucket: $DEPLOYMENT_BUCKET" -ForegroundColor Green
} else {
    Write-Host "✅ Deployment bucket exists: $DEPLOYMENT_BUCKET" -ForegroundColor Green
}
Write-Host ""

# Create IAM role
Write-Host "Creating IAM roles..." -ForegroundColor Yellow
$ROLE_NAME = "SerenityLambdaExecutionRole"

$roleExists = aws iam get-role --role-name $ROLE_NAME 2>$null
if ($LASTEXITCODE -ne 0) {
    # Create trust policy
    $trustPolicy = @'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
'@
    
    $trustPolicy | Out-File -FilePath trust-policy.json -Encoding UTF8
    
    # Create role
    aws iam create-role `
        --role-name $ROLE_NAME `
        --assume-role-policy-document file://trust-policy.json `
        --description "Execution role for Serenity Lambda functions"
    
    # Attach policies
    aws iam attach-role-policy `
        --role-name $ROLE_NAME `
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    
    aws iam attach-role-policy `
        --role-name $ROLE_NAME `
        --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
    
    aws iam attach-role-policy `
        --role-name $ROLE_NAME `
        --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
    
    # Clean up temp file
    Remove-Item trust-policy.json
    
    Write-Host "✅ Created IAM role: $ROLE_NAME" -ForegroundColor Green
} else {
    Write-Host "✅ IAM role exists: $ROLE_NAME" -ForegroundColor Green
}
Write-Host ""

# Create Secrets Manager entries
Write-Host "Creating Secrets Manager entries..." -ForegroundColor Yellow

$environments = @("dev", "staging", "prod")
foreach ($env in $environments) {
    $SECRET_NAME = "/serenity/$env/api-keys"
    
    $secretExists = aws secretsmanager describe-secret --secret-id $SECRET_NAME 2>$null
    if ($LASTEXITCODE -ne 0) {
        aws secretsmanager create-secret `
            --name $SECRET_NAME `
            --description "API keys for Serenity $env environment" `
            --secret-string '{"apiKey":"REPLACE_ME","jwtSecret":"REPLACE_ME"}'
        
        Write-Host "✅ Created secret: $SECRET_NAME" -ForegroundColor Green
        Write-Host "   ⚠️ Remember to update with actual values" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Secret exists: $SECRET_NAME" -ForegroundColor Green
    }
}
Write-Host ""

# Create DynamoDB tables for development
Write-Host "Creating DynamoDB tables for development..." -ForegroundColor Yellow

$tables = @(
    @{Name="PeerSupportRateLimit-dev"; PK="userId"; PKType="S"; SK="requestTime"; SKType="N"},
    @{Name="PeerSupportActivity-dev"; PK="id"; PKType="S"; SK=$null; SKType=$null},
    @{Name="ClinicalDecisions-dev"; PK="patientId"; PKType="S"; SK="decisionId"; SKType="S"},
    @{Name="EmergencyEvents-dev"; PK="emergencyId"; PKType="S"; SK="timestamp"; SKType="N"},
    @{Name="RBACPolicies-dev"; PK="roleId"; PKType="S"; SK="resourceId"; SKType="S"}
)

foreach ($table in $tables) {
    $tableExists = aws dynamodb describe-table --table-name $table.Name 2>$null
    if ($LASTEXITCODE -ne 0) {
        if ($null -eq $table.SK) {
            # Table with only partition key
            aws dynamodb create-table `
                --table-name $table.Name `
                --attribute-definitions AttributeName=$($table.PK),AttributeType=$($table.PKType) `
                --key-schema AttributeName=$($table.PK),KeyType=HASH `
                --billing-mode PAY_PER_REQUEST `
                --region $AWS_REGION
        } else {
            # Table with partition and sort key
            aws dynamodb create-table `
                --table-name $table.Name `
                --attribute-definitions `
                    AttributeName=$($table.PK),AttributeType=$($table.PKType) `
                    AttributeName=$($table.SK),AttributeType=$($table.SKType) `
                --key-schema `
                    AttributeName=$($table.PK),KeyType=HASH `
                    AttributeName=$($table.SK),KeyType=RANGE `
                --billing-mode PAY_PER_REQUEST `
                --region $AWS_REGION
        }
        Write-Host "✅ Created table: $($table.Name)" -ForegroundColor Green
    } else {
        Write-Host "✅ Table exists: $($table.Name)" -ForegroundColor Green
    }
}
Write-Host ""

# Install dependencies
Write-Host "Installing dependencies for all swarms..." -ForegroundColor Yellow

$swarms = @("peer-support-swarm", "clinical-swarm", "security-swarm", "emergency-swarm")
foreach ($swarm in $swarms) {
    if (Test-Path $swarm) {
        Write-Host "Installing dependencies for $swarm..." -ForegroundColor Blue
        Push-Location $swarm
        npm install --silent
        Pop-Location
    }
}

# Install layer dependencies
$layers = Get-ChildItem -Path "layers" -Directory
foreach ($layer in $layers) {
    $nodejsPath = Join-Path $layer.FullName "nodejs"
    if (Test-Path $nodejsPath) {
        Write-Host "Installing layer dependencies for $($layer.Name)..." -ForegroundColor Blue
        Push-Location $nodejsPath
        npm install --silent
        Pop-Location
    }
}

Write-Host "✅ All dependencies installed" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "===============================================" -ForegroundColor Green
Write-Host "🎉 AWS setup complete!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Blue
Write-Host "1. Update secrets in AWS Secrets Manager with actual values"
Write-Host "2. Run deployment: .\deploy-all-swarms.ps1 staging"
Write-Host ""
Write-Host "For production deployment:" -ForegroundColor Yellow
Write-Host "1. Update .env.production with VPC and KMS details"
Write-Host "2. Enable WAF and other security features" 
Write-Host "3. Configure custom domain names"
Write-Host "4. Set up monitoring alerts"
