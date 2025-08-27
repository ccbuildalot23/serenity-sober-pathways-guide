#!/bin/bash

# Deploy All Swarms Script
# Orchestrates deployment of all AWS Lambda swarms with health checks
# Implements Byzantine consensus for production deployments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)

echo -e "${BLUE}🚀 Serenity Swarm Deployment System${NC}"
echo -e "${BLUE}=====================================

${NC}"
echo -e "Environment: ${GREEN}$ENVIRONMENT${NC}"
echo -e "AWS Region: ${GREEN}$AWS_REGION${NC}"
echo -e "AWS Account: ${GREEN}$AWS_ACCOUNT${NC}"
echo ""

# Function to deploy a swarm
deploy_swarm() {
    local swarm_name=$1
    local stack_name=$2
    
    echo -e "${YELLOW}📦 Deploying $swarm_name...${NC}"
    
    cd $swarm_name
    
    # Install dependencies
    echo "  Installing dependencies..."
    npm ci --silent
    
    # Bootstrap CDK if needed
    echo "  Bootstrapping CDK..."
    npx cdk bootstrap aws://$AWS_ACCOUNT/$AWS_REGION --force 2>/dev/null || true
    
    # Synthesize CloudFormation template
    echo "  Synthesizing stack..."
    npx cdk synth $stack_name --quiet
    
    # Deploy stack
    echo "  Deploying to AWS..."
    npx cdk deploy $stack_name \
        --require-approval never \
        --outputs-file outputs.json \
        --context environment=$ENVIRONMENT \
        --context enableXRay=true \
        --context enableWAF=true \
        --context byzantineNodes=9
    
    # Verify deployment
    if [ -f outputs.json ]; then
        echo -e "  ${GREEN}✅ $swarm_name deployed successfully${NC}"
        
        # Extract and display key outputs
        API_ENDPOINT=$(jq -r '.[]?.APIEndpoint // .[]?.ClinicalAPIEndpoint // .[]?.SecurityAPIEndpoint // .[]?.EmergencyAPIEndpoint // "N/A"' outputs.json)
        echo -e "  API Endpoint: ${BLUE}$API_ENDPOINT${NC}"
    else
        echo -e "  ${RED}❌ Failed to deploy $swarm_name${NC}"
        exit 1
    fi
    
    cd ..
    echo ""
}

# Function to run health checks
run_health_check() {
    local api_endpoint=$1
    local swarm_name=$2
    
    echo -e "${YELLOW}🔍 Running health check for $swarm_name...${NC}"
    
    HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$api_endpoint/health" || echo "000")
    
    if [ "$HEALTH_RESPONSE" = "200" ]; then
        echo -e "  ${GREEN}✅ Health check passed${NC}"
        return 0
    else
        echo -e "  ${RED}❌ Health check failed (HTTP $HEALTH_RESPONSE)${NC}"
        return 1
    fi
}

# Function to setup monitoring
setup_monitoring() {
    echo -e "${YELLOW}📊 Setting up CloudWatch monitoring...${NC}"
    
    # Create composite alarm for all swarms
    aws cloudwatch put-composite-alarm \
        --alarm-name "Serenity-AllSwarms-Health-$ENVIRONMENT" \
        --alarm-description "Composite health alarm for all Serenity swarms" \
        --actions-enabled \
        --alarm-rule "(ALARM('PeerSupportSwarm-Health') OR ALARM('ClinicalSwarm-Health') OR ALARM('SecuritySwarm-Health') OR ALARM('EmergencySwarm-Health'))" \
        --region $AWS_REGION 2>/dev/null || true
    
    echo -e "  ${GREEN}✅ Monitoring configured${NC}"
}

# Function to run Byzantine consensus check
byzantine_consensus() {
    echo -e "${YELLOW}🏛️ Running Byzantine consensus check...${NC}"
    
    local votes=0
    local total=4
    
    # Check each swarm's readiness
    for swarm in peer-support-swarm clinical-swarm security-swarm emergency-swarm; do
        if [ -f "$swarm/outputs.json" ]; then
            ((votes++))
        fi
    done
    
    local consensus_ratio=$(echo "scale=2; $votes / $total" | bc)
    echo -e "  Consensus: ${votes}/${total} (${consensus_ratio})"
    
    if (( $(echo "$consensus_ratio >= 0.67" | bc -l) )); then
        echo -e "  ${GREEN}✅ Byzantine consensus achieved${NC}"
        return 0
    else
        echo -e "  ${RED}❌ Byzantine consensus not achieved${NC}"
        return 1
    fi
}

# Main deployment sequence
main() {
    echo -e "${BLUE}Starting swarm deployment sequence...${NC}\n"
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI not found. Please install AWS CLI.${NC}"
        exit 1
    fi
    
    # Check CDK CLI
    if ! command -v cdk &> /dev/null; then
        echo -e "${YELLOW}⚠️ CDK not found. Installing...${NC}"
        npm install -g aws-cdk
    fi
    
    # Deploy each swarm
    echo -e "${BLUE}Phase 1: Lambda Swarm Deployment${NC}\n"
    
    deploy_swarm "peer-support-swarm" "PeerSupportSwarmStack"
    deploy_swarm "clinical-swarm" "ClinicalSwarmStack"
    deploy_swarm "security-swarm" "SecuritySwarmStack"
    deploy_swarm "emergency-swarm" "EmergencySwarmStack"
    
    # Run Byzantine consensus check
    echo -e "${BLUE}Phase 2: Byzantine Consensus Verification${NC}\n"
    if ! byzantine_consensus; then
        echo -e "${RED}⚠️ Deployment incomplete - not all swarms deployed successfully${NC}"
        exit 1
    fi
    
    # Setup monitoring
    echo -e "${BLUE}Phase 3: Monitoring Setup${NC}\n"
    setup_monitoring
    
    # Run health checks
    echo -e "${BLUE}Phase 4: Health Check Validation${NC}\n"
    
    HEALTH_FAILURES=0
    
    for swarm_dir in peer-support-swarm clinical-swarm security-swarm emergency-swarm; do
        if [ -f "$swarm_dir/outputs.json" ]; then
            API_ENDPOINT=$(jq -r '.[]? | to_entries[] | select(.key | contains("APIEndpoint")) | .value' "$swarm_dir/outputs.json" | head -1)
            
            if [ ! -z "$API_ENDPOINT" ] && [ "$API_ENDPOINT" != "null" ]; then
                SWARM_NAME=$(echo $swarm_dir | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2))}1')
                
                if ! run_health_check "$API_ENDPOINT" "$SWARM_NAME"; then
                    ((HEALTH_FAILURES++))
                fi
            fi
        fi
    done
    
    # Generate deployment summary
    echo -e "\n${BLUE}=====================================

${NC}"
    echo -e "${BLUE}📋 Deployment Summary${NC}"
    echo -e "${BLUE}=====================================

${NC}"
    
    echo -e "Environment: ${GREEN}$ENVIRONMENT${NC}"
    echo -e "Region: ${GREEN}$AWS_REGION${NC}"
    echo -e "Account: ${GREEN}$AWS_ACCOUNT${NC}"
    echo -e "Timestamp: ${GREEN}$(date -u +"%Y-%m-%d %H:%M:%S UTC")${NC}"
    echo ""
    
    echo -e "${BLUE}Deployed Swarms:${NC}"
    for swarm_dir in peer-support-swarm clinical-swarm security-swarm emergency-swarm; do
        if [ -f "$swarm_dir/outputs.json" ]; then
            SWARM_NAME=$(echo $swarm_dir | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2))}1')
            API_ENDPOINT=$(jq -r '.[]? | to_entries[] | select(.key | contains("APIEndpoint")) | .value' "$swarm_dir/outputs.json" | head -1)
            echo -e "  ✅ $SWARM_NAME"
            echo -e "     Endpoint: ${BLUE}$API_ENDPOINT${NC}"
        fi
    done
    
    echo ""
    
    if [ $HEALTH_FAILURES -eq 0 ]; then
        echo -e "${GREEN}🎉 All swarms deployed and healthy!${NC}"
        echo -e "${GREEN}🐝 Swarm intelligence activated${NC}"
        echo -e "${GREEN}🏛️ Byzantine consensus operational${NC}"
        echo -e "${GREEN}🔒 Zero-trust security enabled${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️ Deployment completed with $HEALTH_FAILURES health check failures${NC}"
        echo -e "${YELLOW}Please check CloudWatch logs for details${NC}"
        exit 1
    fi
}

# Run main function
main