#!/usr/bin/env bash
set -euo pipefail

PROFILE="${1:-default}"

# Discover regions
REGIONS=$(aws ec2 describe-regions --all-regions --profile "$PROFILE" --query 'Regions[].RegionName' --output text)

timestamp=$(date +%Y%m%dT%H%M%S)
OUTDIR="ops/aws-inventory"
mkdir -p "$OUTDIR"

echo "=== AWS ACCOUNT & USER CONTEXT ==="
aws sts get-caller-identity --profile "$PROFILE"
echo

for svc in ec2 ecs eks lambda apigateway amplify elasticbeanstalk cloudfront s3 rds dynamodb sqs sns elbv2 ecr events logs cloudformation route53 iam; do
  echo "=== SERVICE CHECK: $svc ==="
done

for region in $REGIONS; do
  echo
  echo "######## REGION: $region ########"

  # EC2
  aws ec2 describe-instances --region "$region" --profile "$PROFILE" --query 'Reservations[].Instances[].{Id:InstanceId,State:State.Name,Name:Tags[?Key==`Name`]|[0].Value}' --output table || true
  # ECS
  CLUSTERS=$(aws ecs list-clusters --region "$region" --profile "$PROFILE" --query 'clusterArns[]' --output text || true)
  if [ -n "$CLUSTERS" ]; then
    echo "ECS Clusters: $CLUSTERS"
    for c in $CLUSTERS; do
      aws ecs list-services --cluster "$c" --region "$region" --profile "$PROFILE" --output table || true
    done
  fi
  # EKS
  aws eks list-clusters --region "$region" --profile "$PROFILE" --output table || true
  # Lambda
  aws lambda list-functions --region "$region" --profile "$PROFILE" --output table || true
  # API Gateway (REST & HTTP)
  aws apigateway get-rest-apis --region "$region" --profile "$PROFILE" --output table || true
  aws apigatewayv2 get-apis --region "$region" --profile "$PROFILE" --output table || true
  # Amplify
  aws amplify list-apps --region "$region" --profile "$PROFILE" --output table || true
  # Elastic Beanstalk
  aws elasticbeanstalk describe-environments --region "$region" --profile "$PROFILE" --output table || true
  # CloudFront (global, but show once)
  if [ "$region" = "us-east-1" ]; then
    aws cloudfront list-distributions --profile "$PROFILE" --output table || true
  fi
  # S3 (global list once)
  if [ "$region" = "us-east-1" ]; then
    aws s3api list-buckets --profile "$PROFILE" --output table || true
  fi
  # RDS
  aws rds describe-db-instances --region "$region" --profile "$PROFILE" --output table || true
  # DynamoDB
  aws dynamodb list-tables --region "$region" --profile "$PROFILE" --output table || true
  # Load Balancers
  aws elbv2 describe-load-balancers --region "$region" --profile "$PROFILE" --output table || true
  # ECR
  aws ecr describe-repositories --region "$region" --profile "$PROFILE" --output table || true
  # EventBridge
  aws events list-event-buses --region "$region" --profile "$PROFILE" --output table || true
  # CloudWatch Logs
  aws logs describe-log-groups --region "$region" --profile "$PROFILE" --log-group-name-prefix "" --output table || true
  # CloudFormation
  aws cloudformation list-stacks --region "$region" --profile "$PROFILE" --output table || true
done

echo
echo "######## GLOBAL SERVICES ########"
# Route 53 (hosted zones)
aws route53 list-hosted-zones --profile "$PROFILE" --output table || true
# IAM (read-only summaries)
aws iam list-roles --profile "$PROFILE" --output table | head -n 100 || true
aws iam list-policies --scope Local --profile "$PROFILE" --output table | head -n 100 || true

echo
echo "######## COST & TRAIL (Optionally run with permissions) ########"
# Cost Explorer (requires ce: permissions)
# aws ce get-cost-and-usage --time-period Start=$(date -v-7d +%Y-%m-%d 2>/dev/null || date -d '7 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) --granularity DAILY --metrics UnblendedCost --profile "$PROFILE" --output table || true
# CloudTrail recent resource events (if enabled)
# aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=RunInstances --max-results 20 --profile "$PROFILE" --output table || true