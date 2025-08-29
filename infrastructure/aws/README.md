# Serenity Healthcare Platform - AWS Infrastructure

This directory contains the complete AWS infrastructure configuration for the Serenity Healthcare Platform, designed to be HIPAA-compliant, scalable, and secure.

## Architecture Overview

The infrastructure is built using Terraform and includes:

### Core Infrastructure
- **VPC**: Multi-AZ VPC with public/private subnets and NAT Gateways
- **EKS**: Kubernetes cluster with auto-scaling node groups
- **RDS**: Aurora PostgreSQL with encryption and high availability
- **ElastiCache**: Redis cluster for caching and session storage
- **DocumentDB**: MongoDB-compatible database for document storage

### Security & Compliance
- **WAF**: Web Application Firewall with OWASP rules
- **CloudTrail**: Audit logging for all API calls
- **Config**: Configuration compliance monitoring
- **GuardDuty**: Threat detection and security monitoring
- **Macie**: Data classification and PII discovery
- **Shield**: DDoS protection
- **KMS**: Encryption key management

### Networking & Load Balancing
- **ALB**: Application Load Balancer with SSL termination
- **CloudFront**: CDN with security headers
- **Route 53**: DNS management and health checks
- **VPC Endpoints**: Private connectivity to AWS services

### Monitoring & Observability
- **CloudWatch**: Comprehensive monitoring and alerting
- **X-Ray**: Distributed tracing
- **Container Insights**: EKS cluster monitoring
- **Performance Insights**: Database performance monitoring

### CI/CD & Deployment
- **CodePipeline**: Continuous integration and deployment
- **CodeBuild**: Container builds and tests
- **ECR**: Container registry
- **CodeDeploy**: Blue-green deployments

### Backup & Disaster Recovery
- **AWS Backup**: Automated backup management
- **Cross-region replication**: Multi-region data replication
- **Point-in-time recovery**: Database recovery capabilities

## Directory Structure

```
aws/
├── main.tf                 # Main Terraform configuration
├── variables.tf           # Input variables
├── outputs.tf             # Output values
├── terraform.tfvars.example  # Example variables file
├── deploy.sh              # Bash deployment script
├── deploy.ps1             # PowerShell deployment script
├── README.md              # This file
└── modules/               # Terraform modules
    ├── networking/        # VPC and networking resources
    ├── security/          # Security groups and WAF
    ├── eks/              # EKS cluster and node groups
    ├── rds/              # Aurora PostgreSQL database
    ├── elasticache/      # Redis cache cluster
    ├── documentdb/       # MongoDB-compatible database
    ├── load_balancer/    # Application Load Balancer
    ├── cloudfront/       # CloudFront CDN
    ├── s3/               # S3 buckets and policies
    ├── compliance/       # HIPAA compliance resources
    ├── monitoring/       # CloudWatch and alerting
    ├── cicd/             # CI/CD pipeline
    └── disaster_recovery/ # Backup and DR
```

## Prerequisites

### Tools Required
- [Terraform](https://www.terraform.io/downloads.html) >= 1.0
- [AWS CLI](https://aws.amazon.com/cli/) v2
- [kubectl](https://kubernetes.io/docs/tasks/tools/) (for EKS management)
- [jq](https://stedolan.github.io/jq/) (optional, for JSON processing)

### AWS Permissions
Your AWS user/role needs the following permissions:
- Administrator access (recommended for initial setup)
- Or specific permissions for all services being deployed

### Environment Setup
1. Configure AWS credentials:
   ```bash
   aws configure
   ```

2. Set up required environment variables (optional):
   ```bash
   export AWS_REGION=us-east-1
   export TF_VAR_notification_email=alerts@your-domain.com
   ```

## Quick Start

### 1. Configuration
Copy the example variables file and customize it:
```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your specific values:
- Domain names and SSL certificate ARNs
- Email addresses for notifications
- Instance sizes and scaling parameters
- Security and compliance settings

### 2. Deployment

#### Using the deployment script (recommended):

**Linux/macOS/WSL:**
```bash
# Plan deployment
./deploy.sh -e production -a plan

# Deploy infrastructure
./deploy.sh -e production -a apply

# Deploy with auto-approval
./deploy.sh -e production -a apply -y
```

**Windows PowerShell:**
```powershell
# Plan deployment
.\deploy.ps1 -Environment production -Action plan

# Deploy infrastructure
.\deploy.ps1 -Environment production -Action apply

# Deploy with auto-approval
.\deploy.ps1 -Environment production -Action apply -AutoApprove
```

#### Manual Terraform commands:
```bash
# Initialize
terraform init

# Select/create workspace
terraform workspace select production || terraform workspace new production

# Plan
terraform plan -var-file="terraform.tfvars"

# Apply
terraform apply -var-file="terraform.tfvars"
```

### 3. Post-Deployment

After successful deployment:

1. **Configure kubectl** for EKS access:
   ```bash
   aws eks update-kubeconfig --region us-east-1 --name serenity-production
   ```

2. **Verify cluster access**:
   ```bash
   kubectl get nodes
   kubectl get pods --all-namespaces
   ```

3. **Install additional EKS add-ons** (if needed):
   ```bash
   # AWS Load Balancer Controller
   # Cluster Autoscaler
   # Metrics Server
   ```

## Environment Configuration

### Development Environment
- Smaller instance sizes
- Single AZ deployment (cost optimization)
- Reduced backup retention
- Development-specific security settings

### Staging Environment
- Production-like configuration
- Multi-AZ deployment
- Extended monitoring
- Blue-green deployment testing

### Production Environment
- High availability across multiple AZs
- Enhanced security and compliance
- Comprehensive monitoring and alerting
- Full backup and disaster recovery

## Security Features

### HIPAA Compliance
- **Encryption at rest**: All data encrypted using KMS
- **Encryption in transit**: TLS/SSL for all connections
- **Audit logging**: CloudTrail logs all API calls
- **Access control**: IAM roles and security groups
- **Network isolation**: Private subnets and VPC endpoints
- **Data classification**: Macie for PII discovery

### Security Best Practices
- **Least privilege access**: Minimal IAM permissions
- **Network segmentation**: Isolated subnets and security groups
- **WAF protection**: Application-level security rules
- **DDoS protection**: AWS Shield integration
- **Vulnerability scanning**: Regular security assessments

## Monitoring and Alerting

### CloudWatch Dashboards
- Infrastructure health overview
- Application performance metrics
- Security and compliance monitoring
- Cost optimization insights

### Alerting Rules
- High CPU/memory utilization
- Database performance issues
- Security events and anomalies
- Cost threshold breaches
- Service health checks

### Log Aggregation
- Application logs from EKS
- Database query logs
- Security audit logs
- Network flow logs

## Scaling Configuration

### Auto Scaling
- **EKS Cluster Autoscaler**: Automatically scales worker nodes
- **Horizontal Pod Autoscaler**: Scales application pods
- **RDS Aurora Auto Scaling**: Scales read replicas
- **ElastiCache Auto Discovery**: Dynamic cache node management

### Scaling Policies
- Target tracking based on CPU/memory
- Predictive scaling for known patterns
- Step scaling for rapid changes
- Scheduled scaling for planned events

## Cost Optimization

### Reserved Instances
- RDS Reserved Instances for predictable workloads
- ElastiCache Reserved Nodes for cost savings
- EC2 Reserved Instances for EKS nodes

### Spot Instances
- Optional spot instances for non-critical workloads
- Mixed instance types for cost optimization
- Graceful handling of spot interruptions

### Resource Optimization
- Right-sizing recommendations
- Unused resource identification
- Storage lifecycle policies
- Cost allocation tags

## Disaster Recovery

### Backup Strategy
- **RDS**: Automated backups with 30-day retention
- **EKS**: Persistent volume snapshots
- **S3**: Cross-region replication
- **Configuration**: Infrastructure as Code backup

### Recovery Procedures
- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 1 hour
- **Multi-region failover**: Automated with manual trigger
- **Data recovery**: Point-in-time restoration

## Troubleshooting

### Common Issues

#### Terraform State Lock
```bash
# Release state lock
terraform force-unlock <LOCK_ID>
```

#### EKS Access Issues
```bash
# Update kubeconfig
aws eks update-kubeconfig --region <region> --name <cluster-name>

# Check IAM permissions
aws sts get-caller-identity
```

#### RDS Connection Issues
- Verify security groups allow access
- Check VPC and subnet configuration
- Validate credentials in Secrets Manager

#### Application Load Balancer Issues
- Check target group health
- Verify security group rules
- Review ALB logs in S3

### Logs and Debugging
- CloudWatch Logs: `/aws/eks/`, `/aws/rds/`, `/aws/lambda/`
- VPC Flow Logs: Network traffic analysis
- CloudTrail: API call auditing
- Application logs: EKS pod logs

## Maintenance

### Regular Tasks
- **Security patches**: Monthly OS and application updates
- **Backup verification**: Weekly backup restoration tests
- **Performance review**: Monthly performance analysis
- **Cost optimization**: Quarterly resource review
- **Compliance audit**: Annual HIPAA compliance review

### Update Procedures
1. Test changes in development environment
2. Apply to staging for validation
3. Schedule production deployment
4. Monitor post-deployment metrics
5. Document changes and rollback procedures

## Support and Documentation

### Additional Resources
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [HIPAA on AWS](https://aws.amazon.com/compliance/hipaa-compliance/)
- [EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest)

### Contact Information
- **Platform Team**: platform-team@serenity.com
- **Security Team**: security@serenity.com
- **On-call Support**: +1-xxx-xxx-xxxx

## License

This infrastructure configuration is proprietary to Serenity Healthcare Platform.
All rights reserved.