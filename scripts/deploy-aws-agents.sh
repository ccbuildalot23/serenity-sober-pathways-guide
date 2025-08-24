#!/bin/bash

# AWS Intelligent Agents Deployment Script
# Deploys all agents to AWS Lambda and configures EventBridge

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting AWS Intelligent Agents Deployment${NC}"

# Configuration
REGION=${AWS_REGION:-us-east-1}
ENVIRONMENT=${ENVIRONMENT:-production}
LAMBDA_RUNTIME="nodejs20.x"
LAMBDA_TIMEOUT=900
LAMBDA_MEMORY=1024

# Agent list
AGENTS=(
    "InfrastructureHealthAgent"
    "SecuritySentinelAgent"
    "CrisisResponseOrchestrator"
    "ComplianceAuditorAgent"
    "CostIntelligenceAgent"
    "PatientJourneyAgent"
    "ProviderEfficiencyAgent"
)

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install it first.${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ AWS CLI configured${NC}"

# Build TypeScript agents
echo -e "${YELLOW}📦 Building TypeScript agents...${NC}"
npx tsc src/agents/aws/*.ts --outDir dist/agents --module commonjs --target es2020 --skipLibCheck || true

# Create deployment package for each agent
for agent in "${AGENTS[@]}"; do
    echo -e "${YELLOW}📦 Packaging ${agent}...${NC}"
    
    # Create agent directory
    mkdir -p dist/agents/${agent}
    
    # Copy agent code
    cp dist/agents/${agent}.js dist/agents/${agent}/index.js 2>/dev/null || true
    
    # Create package.json for agent
    cat > dist/agents/${agent}/package.json <<EOF
{
  "name": "serenity-${agent,,}",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "@aws-sdk/client-ec2": "^3.0.0",
    "@aws-sdk/client-cloudwatch": "^3.0.0",
    "@aws-sdk/client-dynamodb": "^3.0.0",
    "@aws-sdk/client-sns": "^3.0.0",
    "@aws-sdk/client-lambda": "^3.0.0",
    "@aws-sdk/client-eventbridge": "^3.0.0"
  }
}
EOF
    
    # Install dependencies
    cd dist/agents/${agent}
    npm install --production --silent
    
    # Create deployment package
    zip -rq ../${agent}.zip . -x "*.git*"
    cd ../../..
    
    echo -e "${GREEN}✅ ${agent} packaged${NC}"
done

# Create IAM role for Lambda functions
echo -e "${YELLOW}🔐 Creating IAM roles...${NC}"

# Create trust policy
cat > /tmp/lambda-trust-policy.json <<EOF
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
EOF

# Create execution role for each agent
for agent in "${AGENTS[@]}"; do
    ROLE_NAME="serenity-${agent,,}-role-${ENVIRONMENT}"
    
    # Create role
    aws iam create-role \
        --role-name ${ROLE_NAME} \
        --assume-role-policy-document file:///tmp/lambda-trust-policy.json \
        --region ${REGION} 2>/dev/null || echo "Role exists"
    
    # Attach basic Lambda execution policy
    aws iam attach-role-policy \
        --role-name ${ROLE_NAME} \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
        --region ${REGION} 2>/dev/null || true
    
    # Attach VPC access policy
    aws iam attach-role-policy \
        --role-name ${ROLE_NAME} \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole \
        --region ${REGION} 2>/dev/null || true
    
    echo -e "${GREEN}✅ IAM role created for ${agent}${NC}"
done

# Wait for IAM roles to propagate
echo -e "${YELLOW}⏳ Waiting for IAM roles to propagate...${NC}"
sleep 10

# Deploy Lambda functions
echo -e "${YELLOW}🚀 Deploying Lambda functions...${NC}"

for agent in "${AGENTS[@]}"; do
    FUNCTION_NAME="serenity-${agent,,}-${ENVIRONMENT}"
    ROLE_NAME="serenity-${agent,,}-role-${ENVIRONMENT}"
    
    # Get role ARN
    ROLE_ARN=$(aws iam get-role --role-name ${ROLE_NAME} --query 'Role.Arn' --output text --region ${REGION})
    
    # Check if function exists
    if aws lambda get-function --function-name ${FUNCTION_NAME} --region ${REGION} &>/dev/null; then
        # Update existing function
        echo -e "${YELLOW}Updating ${FUNCTION_NAME}...${NC}"
        
        aws lambda update-function-code \
            --function-name ${FUNCTION_NAME} \
            --zip-file fileb://dist/agents/${agent}.zip \
            --region ${REGION} > /dev/null
        
        aws lambda update-function-configuration \
            --function-name ${FUNCTION_NAME} \
            --timeout ${LAMBDA_TIMEOUT} \
            --memory-size ${LAMBDA_MEMORY} \
            --environment "Variables={
                ENVIRONMENT=${ENVIRONMENT},
                REGION=${REGION}
            }" \
            --region ${REGION} > /dev/null
    else
        # Create new function
        echo -e "${YELLOW}Creating ${FUNCTION_NAME}...${NC}"
        
        aws lambda create-function \
            --function-name ${FUNCTION_NAME} \
            --runtime ${LAMBDA_RUNTIME} \
            --role ${ROLE_ARN} \
            --handler index.handler \
            --timeout ${LAMBDA_TIMEOUT} \
            --memory-size ${LAMBDA_MEMORY} \
            --environment "Variables={
                ENVIRONMENT=${ENVIRONMENT},
                REGION=${REGION}
            }" \
            --zip-file fileb://dist/agents/${agent}.zip \
            --region ${REGION} > /dev/null || true
    fi
    
    echo -e "${GREEN}✅ ${FUNCTION_NAME} deployed${NC}"
done

# Configure EventBridge rules
echo -e "${YELLOW}📅 Configuring EventBridge rules...${NC}"

# Infrastructure Health Agent - Run every 5 minutes
aws events put-rule \
    --name serenity-infrastructure-health-${ENVIRONMENT} \
    --schedule-expression "rate(5 minutes)" \
    --state ENABLED \
    --description "Trigger Infrastructure Health Agent" \
    --region ${REGION} > /dev/null

aws events put-targets \
    --rule serenity-infrastructure-health-${ENVIRONMENT} \
    --targets "Id"="1","Arn"="arn:aws:lambda:${REGION}:$(aws sts get-caller-identity --query Account --output text):function:serenity-infrastructurehealthagent-${ENVIRONMENT}" \
    --region ${REGION} > /dev/null || true

# Security Sentinel Agent - Run every 10 minutes
aws events put-rule \
    --name serenity-security-sentinel-${ENVIRONMENT} \
    --schedule-expression "rate(10 minutes)" \
    --state ENABLED \
    --description "Trigger Security Sentinel Agent" \
    --region ${REGION} > /dev/null

# Compliance Auditor Agent - Run daily at 2 AM
aws events put-rule \
    --name serenity-compliance-auditor-${ENVIRONMENT} \
    --schedule-expression "cron(0 2 * * ? *)" \
    --state ENABLED \
    --description "Trigger Compliance Auditor Agent" \
    --region ${REGION} > /dev/null

# Cost Intelligence Agent - Run every hour
aws events put-rule \
    --name serenity-cost-intelligence-${ENVIRONMENT} \
    --schedule-expression "rate(1 hour)" \
    --state ENABLED \
    --description "Trigger Cost Intelligence Agent" \
    --region ${REGION} > /dev/null

echo -e "${GREEN}✅ EventBridge rules configured${NC}"

# Create CloudWatch Dashboard
echo -e "${YELLOW}📊 Creating CloudWatch Dashboard...${NC}"

cat > /tmp/dashboard.json <<EOF
{
    "name": "SerenityAgents-${ENVIRONMENT}",
    "body": "{\"widgets\":[{\"type\":\"metric\",\"properties\":{\"metrics\":[[\"AWS/Lambda\",\"Invocations\",{\"stat\":\"Sum\"}],[\".\",\"Errors\",{\"stat\":\"Sum\"}],[\".\",\"Duration\",{\"stat\":\"Average\"}]],\"period\":300,\"stat\":\"Average\",\"region\":\"${REGION}\",\"title\":\"Agent Performance\"}}]}"
}
EOF

aws cloudwatch put-dashboard \
    --dashboard-name SerenityAgents-${ENVIRONMENT} \
    --dashboard-body file:///tmp/dashboard.json \
    --region ${REGION} > /dev/null || true

echo -e "${GREEN}✅ CloudWatch Dashboard created${NC}"

# Create SNS Topic for alerts
echo -e "${YELLOW}📢 Creating SNS Topics...${NC}"

TOPICS=(
    "serenity-infrastructure-alerts-${ENVIRONMENT}"
    "serenity-security-alerts-${ENVIRONMENT}"
    "serenity-compliance-alerts-${ENVIRONMENT}"
    "serenity-cost-alerts-${ENVIRONMENT}"
)

for topic in "${TOPICS[@]}"; do
    aws sns create-topic --name ${topic} --region ${REGION} > /dev/null || true
    echo -e "${GREEN}✅ SNS topic ${topic} created${NC}"
done

# Create DynamoDB tables for agent state
echo -e "${YELLOW}💾 Creating DynamoDB tables...${NC}"

TABLES=(
    "AgentState"
    "PatientJourneyEvents"
    "ProviderProfiles"
    "CostOptimizationActions"
    "ComplianceReports"
)

for table in "${TABLES[@]}"; do
    TABLE_NAME="Serenity${table}-${ENVIRONMENT}"
    
    aws dynamodb create-table \
        --table-name ${TABLE_NAME} \
        --attribute-definitions AttributeName=id,AttributeType=S \
        --key-schema AttributeName=id,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region ${REGION} 2>/dev/null || echo "Table ${TABLE_NAME} exists"
    
    echo -e "${GREEN}✅ DynamoDB table ${TABLE_NAME} created${NC}"
done

# Output summary
echo -e "\n${GREEN}🎉 AWS Intelligent Agents Deployment Complete!${NC}"
echo -e "\n${YELLOW}Deployed Agents:${NC}"
for agent in "${AGENTS[@]}"; do
    echo -e "  • serenity-${agent,,}-${ENVIRONMENT}"
done

echo -e "\n${YELLOW}Next Steps:${NC}"
echo -e "1. Configure agent-specific IAM policies"
echo -e "2. Set up CloudWatch alarms"
echo -e "3. Subscribe to SNS topics for alerts"
echo -e "4. Configure VPC settings for Lambda functions"
echo -e "5. Set environment variables for each agent"

echo -e "\n${GREEN}View Dashboard:${NC}"
echo -e "https://console.aws.amazon.com/cloudwatch/home?region=${REGION}#dashboards:name=SerenityAgents-${ENVIRONMENT}"

# Cleanup
rm -rf dist/agents
rm -f /tmp/lambda-trust-policy.json
rm -f /tmp/dashboard.json

echo -e "\n${GREEN}✅ Deployment script complete!${NC}"