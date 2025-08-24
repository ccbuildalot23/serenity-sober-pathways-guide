# 🐝 Serenity AWS Lambda Swarm Architecture

## Overview

This directory contains the complete AWS Lambda swarm microservices architecture for the Serenity Sober Pathways platform. The system implements Byzantine fault-tolerant consensus, adaptive swarm intelligence, and MCP server integration for a fully autonomous healthcare platform.

## 🏗️ Architecture Components

### 1. PeerSupport Swarm
- **Purpose**: Peer support and motivational messaging
- **Agents**: 5 specialized workers (emotional, motivational, personalization, cultural, peer-connection)
- **Features**: Hierarchical coordination, crisis detection, cultural adaptation

### 2. Clinical Swarm
- **Purpose**: Clinical decision support with Byzantine consensus
- **Agents**: 9 Byzantine nodes for fault tolerance
- **Features**: ICD-10 diagnosis, treatment planning, FHIR integration

### 3. Security Swarm
- **Purpose**: Zero-trust security and RBAC
- **Agents**: 5 security workers (access, threat, audit, encryption, compliance)
- **Features**: KMS encryption, HIPAA compliance, threat detection

### 4. Emergency Swarm
- **Purpose**: Crisis response and escalation
- **Agents**: 5 emergency workers with Step Functions orchestration
- **Features**: Multi-tier escalation, resource location, intervention coordination

## 🚀 Quick Start Deployment

### Prerequisites

1. **AWS Account** with appropriate permissions
2. **Node.js 20.x** or higher
3. **AWS CLI** configured with credentials
4. **Git** for version control

### Step 1: Initial Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/serenity-sober-pathways-guide.git
cd serenity-sober-pathways-guide/services/aws-lambda

# Run the setup script
./setup-aws.sh

# This will:
# - Check requirements
# - Configure AWS credentials
# - Install AWS CDK
# - Bootstrap CDK
# - Create S3 buckets
# - Create IAM roles
# - Create Secrets Manager entries
# - Create DynamoDB tables
# - Install all dependencies
```

### Step 2: Configure Environment

```bash
# Copy environment template
cp .env.staging .env

# Edit .env file with your configuration
nano .env

# Required configurations:
# - AWS_REGION (default: us-east-1)
# - ALERT_EMAIL (for monitoring alerts)
# - EMERGENCY_PHONE (for crisis escalation)
```

### Step 3: Update Secrets

```bash
# Update AWS Secrets Manager with actual values
aws secretsmanager put-secret-value \
  --secret-id /serenity/staging/api-keys \
  --secret-string '{"apiKey":"your-api-key","jwtSecret":"your-jwt-secret"}'
```

### Step 4: Deploy to AWS

```bash
# Deploy all swarms to staging
./deploy-all-swarms.sh staging

# Or deploy individual swarms
cd peer-support-swarm
cdk deploy PeerSupportSwarmStack --context environment=staging
```

### Step 5: Verify Deployment

```bash
# Check deployment status
aws cloudformation describe-stacks --stack-name PeerSupportSwarmStack

# Test health endpoints
curl https://your-api-endpoint/peer/health
curl https://your-api-endpoint/clinical/health
curl https://your-api-endpoint/security/health
curl https://your-api-endpoint/emergency/health
```

## 📊 Monitoring & Operations

### CloudWatch Dashboards

Each swarm creates its own CloudWatch dashboard:
- `PeerSupportSwarm-staging`
- `ClinicalSwarm-staging`
- `SecuritySwarm-staging`
- `EmergencySwarm-staging`

Access dashboards:
```bash
# Get dashboard URL
aws cloudwatch get-dashboard --dashboard-name PeerSupportSwarm-staging
```

### Viewing Logs

```bash
# View Lambda logs
aws logs tail /aws/lambda/PeerSupportQueen-staging --follow

# View specific time range
aws logs filter-log-events \
  --log-group-name /aws/lambda/PeerSupportQueen-staging \
  --start-time 1609459200000
```

### Monitoring Alarms

```bash
# List all alarms
aws cloudwatch describe-alarms --alarm-name-prefix Serenity

# Check alarm history
aws cloudwatch describe-alarm-history --alarm-name Serenity-AllSwarms-Health-staging
```

## 🔧 Development

### Local Testing

```bash
# Run TypeScript compilation
npm run build

# Run unit tests
npm test

# Test Lambda function locally
sam local invoke PeerSupportQueen -e events/test-event.json
```

### Adding New Workers

1. Create worker handler in appropriate directory:
```typescript
// worker-handlers/new-worker.ts
export const handler = async (event, context) => {
  // Worker logic
};
```

2. Add to CDK stack:
```typescript
const newWorker = new NodejsFunction(this, 'NewWorker', {
  entry: 'worker-handlers/new-worker.ts',
  // ... configuration
});
```

3. Deploy changes:
```bash
cdk deploy
```

## 🚨 Troubleshooting

### Common Issues

#### 1. CDK Bootstrap Error
```bash
# Re-run bootstrap with admin permissions
cdk bootstrap --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess
```

#### 2. Lambda Timeout
```bash
# Increase timeout in CDK stack
timeout: cdk.Duration.seconds(60)
```

#### 3. Permission Errors
```bash
# Check IAM role policies
aws iam get-role-policy --role-name SerenityLambdaExecutionRole --policy-name ExecutionPolicy
```

#### 4. DynamoDB Throttling
```bash
# Switch to on-demand billing
aws dynamodb update-table --table-name YourTable --billing-mode PAY_PER_REQUEST
```

## 🔐 Security Best Practices

1. **Never commit secrets** - Use AWS Secrets Manager
2. **Enable encryption** - All data at rest and in transit
3. **Use least privilege** - Minimal IAM permissions
4. **Enable logging** - CloudTrail for audit
5. **Regular updates** - Keep dependencies current

## 📈 Performance Optimization

### Lambda Cold Starts
- Use provisioned concurrency for production
- Minimize package size
- Use Lambda layers for shared dependencies

### DynamoDB Optimization
- Use proper indexes
- Enable auto-scaling
- Implement caching where appropriate

### API Gateway
- Enable caching
- Use CloudFront for global distribution
- Implement rate limiting

## 🌍 Production Deployment

### Pre-Production Checklist

- [ ] All secrets configured in Secrets Manager
- [ ] VPC configured for Lambda functions
- [ ] KMS keys created for encryption
- [ ] WAF rules enabled
- [ ] CloudTrail enabled for audit logging
- [ ] Backup strategy implemented
- [ ] Disaster recovery plan documented
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] HIPAA compliance verified

### Production Deployment

```bash
# Deploy to production
./deploy-all-swarms.sh prod

# Enable monitoring
aws cloudwatch put-metric-alarm \
  --alarm-name Production-Critical \
  --alarm-actions arn:aws:sns:us-east-1:xxx:production-alerts
```

## 📝 API Documentation

### PeerSupport Swarm Endpoints

- `POST /peer/message` - Send peer support message
- `POST /peer/connect` - Find peer connections
- `POST /peer/crisis` - Trigger crisis support
- `GET /peer/health` - Health check

### Clinical Swarm Endpoints

- `POST /clinical/diagnosis` - Get diagnosis recommendations
- `POST /clinical/treatment` - Get treatment plan
- `POST /clinical/medication` - Check medications
- `POST /clinical/consensus` - Request Byzantine consensus
- `GET /clinical/health` - Health check

### Security Swarm Endpoints

- `POST /security/validate` - Validate access
- `POST /security/audit` - Log audit event
- `POST /security/threat` - Report threat
- `POST /security/session` - Manage session
- `GET /security/compliance` - Check compliance
- `GET /security/health` - Health check

### Emergency Swarm Endpoints

- `POST /emergency/alert` - Trigger emergency alert
- `GET /emergency/status` - Check emergency status
- `POST /emergency/escalate` - Escalate emergency
- `GET /emergency/resources` - Get emergency resources
- `GET /emergency/health` - Health check

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request
5. Await swarm consensus (CI/CD)

## 📄 License

Copyright (c) 2024 Serenity Sober Pathways. All rights reserved.

## 🆘 Support

For issues or questions:
- GitHub Issues: [Create Issue](https://github.com/yourusername/serenity-sober-pathways-guide/issues)
- Email: support@serenity-sober-pathways.com
- Slack: #serenity-dev

---

Built with 🐝 Swarm Intelligence by the Serenity Team