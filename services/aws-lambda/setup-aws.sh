#!/bin/bash

# AWS Setup Script for Serenity Swarm Deployment
# Configures AWS environment and bootstraps CDK

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🔧 AWS Setup for Serenity Swarms${NC}"
echo -e "${BLUE}===================================${NC}\n"

# Check for required tools
check_requirements() {
    echo -e "${YELLOW}Checking requirements...${NC}"
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI not found${NC}"
        echo "Please install: https://aws.amazon.com/cli/"
        exit 1
    fi
    echo -e "${GREEN}✅ AWS CLI found${NC}"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not found${NC}"
        echo "Please install Node.js 20.x"
        exit 1
    fi
    echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm not found${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ npm found: $(npm --version)${NC}"
    
    # Check jq
    if ! command -v jq &> /dev/null; then
        # Check if we have local jq.exe
        if [ -f "./jq.exe" ]; then
            echo -e "${GREEN}✅ Using local jq.exe${NC}"
            alias jq='./jq.exe'
        else
            echo -e "${YELLOW}⚠️ jq not found, installing...${NC}"
            if [[ "$OSTYPE" == "linux-gnu"* ]]; then
                sudo apt-get update && sudo apt-get install -y jq
            elif [[ "$OSTYPE" == "darwin"* ]]; then
                brew install jq
            else
                echo -e "${RED}Please install jq manually${NC}"
                exit 1
            fi
        fi
    else
        echo -e "${GREEN}✅ jq found${NC}"
    fi
    
    echo ""
}

# Configure AWS credentials
configure_aws() {
    echo -e "${YELLOW}Configuring AWS credentials...${NC}"
    
    # Check if credentials are already configured
    if aws sts get-caller-identity &> /dev/null; then
        ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
        REGION=$(aws configure get region)
        echo -e "${GREEN}✅ AWS credentials configured${NC}"
        echo -e "   Account: ${BLUE}$ACCOUNT_ID${NC}"
        echo -e "   Region: ${BLUE}$REGION${NC}"
    else
        echo -e "${YELLOW}Please configure AWS credentials:${NC}"
        aws configure
    fi
    
    echo ""
}

# Install CDK globally
install_cdk() {
    echo -e "${YELLOW}Installing AWS CDK...${NC}"
    
    if ! command -v cdk &> /dev/null; then
        npm install -g aws-cdk
        echo -e "${GREEN}✅ CDK installed: $(cdk --version)${NC}"
    else
        echo -e "${GREEN}✅ CDK already installed: $(cdk --version)${NC}"
    fi
    
    echo ""
}

# Bootstrap CDK
bootstrap_cdk() {
    echo -e "${YELLOW}Bootstrapping CDK...${NC}"
    
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    REGION=${AWS_REGION:-us-east-1}
    
    echo -e "Bootstrapping account ${BLUE}$ACCOUNT_ID${NC} in region ${BLUE}$REGION${NC}"
    
    cdk bootstrap aws://$ACCOUNT_ID/$REGION \
        --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess \
        --trust $ACCOUNT_ID \
        || echo -e "${YELLOW}CDK already bootstrapped${NC}"
    
    echo -e "${GREEN}✅ CDK bootstrap complete${NC}"
    echo ""
}

# Create S3 buckets
create_s3_buckets() {
    echo -e "${YELLOW}Creating S3 buckets...${NC}"
    
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    REGION=${AWS_REGION:-us-east-1}
    
    # Lambda deployment bucket
    DEPLOYMENT_BUCKET="serenity-lambda-deployments-$ACCOUNT_ID-$REGION"
    if aws s3 ls "s3://$DEPLOYMENT_BUCKET" 2>&1 | grep -q 'NoSuchBucket'; then
        aws s3 mb "s3://$DEPLOYMENT_BUCKET" --region $REGION
        aws s3api put-bucket-versioning \
            --bucket $DEPLOYMENT_BUCKET \
            --versioning-configuration Status=Enabled
        echo -e "${GREEN}✅ Created deployment bucket: $DEPLOYMENT_BUCKET${NC}"
    else
        echo -e "${GREEN}✅ Deployment bucket exists: $DEPLOYMENT_BUCKET${NC}"
    fi
    
    echo ""
}

# Create IAM roles
create_iam_roles() {
    echo -e "${YELLOW}Creating IAM roles...${NC}"
    
    # Lambda execution role
    ROLE_NAME="SerenityLambdaExecutionRole"
    
    # Check if role exists
    if aws iam get-role --role-name $ROLE_NAME &> /dev/null; then
        echo -e "${GREEN}✅ IAM role exists: $ROLE_NAME${NC}"
    else
        # Create trust policy
        cat > /tmp/trust-policy.json <<EOF
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
        
        # Create role
        aws iam create-role \
            --role-name $ROLE_NAME \
            --assume-role-policy-document file:///tmp/trust-policy.json \
            --description "Execution role for Serenity Lambda functions"
        
        # Attach policies
        aws iam attach-role-policy \
            --role-name $ROLE_NAME \
            --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
        
        aws iam attach-role-policy \
            --role-name $ROLE_NAME \
            --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
        
        aws iam attach-role-policy \
            --role-name $ROLE_NAME \
            --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
        
        echo -e "${GREEN}✅ Created IAM role: $ROLE_NAME${NC}"
    fi
    
    echo ""
}

# Create Secrets Manager entries
create_secrets() {
    echo -e "${YELLOW}Creating Secrets Manager entries...${NC}"
    
    ENVIRONMENTS=("dev" "staging" "prod")
    
    for ENV in "${ENVIRONMENTS[@]}"; do
        SECRET_NAME="/serenity/$ENV/api-keys"
        
        # Check if secret exists
        if aws secretsmanager describe-secret --secret-id $SECRET_NAME &> /dev/null; then
            echo -e "${GREEN}✅ Secret exists: $SECRET_NAME${NC}"
        else
            # Create secret with placeholder values
            aws secretsmanager create-secret \
                --name $SECRET_NAME \
                --description "API keys for Serenity $ENV environment" \
                --secret-string '{"apiKey":"REPLACE_ME","jwtSecret":"REPLACE_ME"}'
            
            echo -e "${GREEN}✅ Created secret: $SECRET_NAME${NC}"
            echo -e "${YELLOW}   ⚠️ Remember to update with actual values${NC}"
        fi
    done
    
    echo ""
}

# Create DynamoDB tables for testing
create_dynamodb_tables() {
    echo -e "${YELLOW}Creating DynamoDB tables for development...${NC}"
    
    # Only create for dev environment
    ENV="dev"
    
    # Tables to create
    TABLES=(
        "PeerSupportRateLimit-$ENV:userId:S:requestTime:N"
        "PeerSupportActivity-$ENV:id:S"
        "ClinicalDecisions-$ENV:patientId:S:decisionId:S"
        "EmergencyEvents-$ENV:emergencyId:S:timestamp:N"
        "RBACPolicies-$ENV:roleId:S:resourceId:S"
    )
    
    for TABLE_DEF in "${TABLES[@]}"; do
        IFS=':' read -r TABLE_NAME PK PK_TYPE SK SK_TYPE <<< "$TABLE_DEF"
        
        # Check if table exists
        if aws dynamodb describe-table --table-name $TABLE_NAME &> /dev/null; then
            echo -e "${GREEN}✅ Table exists: $TABLE_NAME${NC}"
        else
            # Create table
            if [ -z "$SK" ]; then
                # Table with only partition key
                aws dynamodb create-table \
                    --table-name $TABLE_NAME \
                    --attribute-definitions AttributeName=$PK,AttributeType=$PK_TYPE \
                    --key-schema AttributeName=$PK,KeyType=HASH \
                    --billing-mode PAY_PER_REQUEST \
                    --region ${AWS_REGION:-us-east-1}
            else
                # Table with partition and sort key
                aws dynamodb create-table \
                    --table-name $TABLE_NAME \
                    --attribute-definitions \
                        AttributeName=$PK,AttributeType=$PK_TYPE \
                        AttributeName=$SK,AttributeType=$SK_TYPE \
                    --key-schema \
                        AttributeName=$PK,KeyType=HASH \
                        AttributeName=$SK,KeyType=RANGE \
                    --billing-mode PAY_PER_REQUEST \
                    --region ${AWS_REGION:-us-east-1}
            fi
            
            echo -e "${GREEN}✅ Created table: $TABLE_NAME${NC}"
        fi
    done
    
    echo ""
}

# Install dependencies for all swarms
install_dependencies() {
    echo -e "${YELLOW}Installing dependencies for all swarms...${NC}"
    
    # Install dependencies for each swarm
    for SWARM in peer-support-swarm clinical-swarm security-swarm emergency-swarm; do
        if [ -d "$SWARM" ]; then
            echo -e "Installing dependencies for ${BLUE}$SWARM${NC}..."
            cd $SWARM
            npm ci --silent || npm install --silent
            cd ..
        fi
    done
    
    # Install layer dependencies
    for LAYER in layers/*/nodejs; do
        if [ -d "$LAYER" ]; then
            echo -e "Installing layer dependencies for ${BLUE}$LAYER${NC}..."
            cd $LAYER
            npm ci --silent || npm install --silent
            cd ../../..
        fi
    done
    
    echo -e "${GREEN}✅ All dependencies installed${NC}"
    echo ""
}

# Main setup flow
main() {
    echo -e "${BLUE}Starting AWS setup...${NC}\n"
    
    check_requirements
    configure_aws
    install_cdk
    bootstrap_cdk
    create_s3_buckets
    create_iam_roles
    create_secrets
    create_dynamodb_tables
    install_dependencies
    
    echo -e "${GREEN}===============================================${NC}"
    echo -e "${GREEN}🎉 AWS setup complete!${NC}"
    echo -e "${GREEN}===============================================${NC}\n"
    
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "1. Update secrets in AWS Secrets Manager with actual values"
    echo -e "2. Configure GitHub Secrets for CI/CD:"
    echo -e "   - AWS_ACCESS_KEY_ID"
    echo -e "   - AWS_SECRET_ACCESS_KEY"
    echo -e "   - VERCEL_TOKEN (if using Vercel)"
    echo -e "   - SLACK_WEBHOOK (for notifications)"
    echo -e "3. Run deployment: ${GREEN}./deploy-all-swarms.sh staging${NC}"
    echo -e ""
    echo -e "${YELLOW}For production deployment:${NC}"
    echo -e "1. Update .env.production with VPC and KMS details"
    echo -e "2. Enable WAF and other security features"
    echo -e "3. Configure custom domain names"
    echo -e "4. Set up monitoring alerts"
}

# Run main function
main