# Serenity Healthcare Platform - Production Deployment Runbook

## Overview

This runbook provides step-by-step instructions for deploying the Serenity Healthcare Platform to production. It includes pre-deployment checks, deployment procedures, validation steps, and rollback procedures.

**⚠️ CRITICAL**: This is a HIPAA-compliant healthcare platform. All procedures must maintain data security and patient privacy.

## Prerequisites

### Team Requirements
- **Deployment Lead**: Authorized to execute production deployments
- **Security Officer**: Available for security validation (HIPAA requirement)
- **On-Call Engineer**: Available for immediate issue response
- **Database Administrator**: Available for database operations

### Access Requirements
- Production server SSH access
- Docker Hub/Container Registry access
- Database administrative access
- Monitoring system access
- DNS management access

### Environment Verification
```bash
# Verify required tools are installed
docker --version
docker-compose --version
kubectl version --client  # if using Kubernetes
terraform version          # if using Terraform

# Verify access to production systems
ssh production-server "echo 'SSH access confirmed'"
docker login registry.example.com
```

## Pre-Deployment Checklist

### 1. Code and Configuration Verification
- [ ] All code changes have been merged to `main` branch
- [ ] All tests pass in staging environment
- [ ] Security scan has been completed and passed
- [ ] Database migrations have been tested in staging
- [ ] Configuration files have been reviewed and approved
- [ ] SSL certificates are valid and not expiring within 30 days

### 2. Production Readiness Check
```powershell
# Run the automated production readiness checker
.\scripts\production-readiness-checker.ps1 -GenerateReport

# Verify deployment configuration
.\deployment\production-deploy.ps1 -Action validate -DryRun
```

### 3. Stakeholder Notifications
- [ ] Notify healthcare team of upcoming deployment
- [ ] Inform patient support team of potential brief service interruption
- [ ] Alert monitoring team to expect deployment-related notifications

### 4. Backup Verification
```bash
# Verify recent backups exist and are accessible
./scripts/verify-backups.sh

# Create deployment-specific backup
./scripts/create-deployment-backup.sh
```

## Deployment Procedure

### Phase 1: Infrastructure Preparation (Duration: 15-30 minutes)

#### Step 1: Start Monitoring
```bash
# Start enhanced monitoring during deployment
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Verify monitoring stack is healthy
./scripts/verify-monitoring-health.sh
```

#### Step 2: Put System in Maintenance Mode
```bash
# Enable maintenance mode (displays maintenance page to users)
./scripts/enable-maintenance-mode.sh

# Verify maintenance mode is active
curl -s https://app.serenity-pathways.com | grep -i "maintenance"
```

#### Step 3: Scale Down Non-Critical Services
```bash
# Scale down non-essential services to free resources
docker-compose scale patient-portal=1 notification-service=1
```

### Phase 2: Database Migration (Duration: 5-15 minutes)

#### Step 1: Database Backup
```bash
# Create pre-migration database backup
pg_dump $DATABASE_URL > backups/pre-migration-$(date +%Y%m%d_%H%M%S).sql

# Verify backup was created successfully
ls -la backups/pre-migration-*.sql
```

#### Step 2: Run Migrations
```bash
# Execute database migrations
npm run migrate:production

# Verify migration success
npm run migrate:status
```

### Phase 3: Service Deployment (Duration: 20-40 minutes)

#### Step 1: Deploy Core Services
```powershell
# Deploy using the orchestration script
.\deployment\production-deploy.ps1 -Action deploy -Environment production -Version $VERSION

# Monitor deployment progress
Get-Content logs\deployment-*.log -Wait
```

#### Step 2: Health Check Verification
```bash
# Wait for services to be healthy
./scripts/wait-for-services.sh

# Verify critical services
curl -s https://api.serenity-pathways.com/health | jq
curl -s https://api.serenity-pathways.com/crisis/health | jq
```

### Phase 4: Validation (Duration: 10-20 minutes)

#### Step 1: Automated Testing
```powershell
# Run production validation suite
.\testing\production-validation.ps1 -Environment production -GenerateReport

# Verify crisis response time (CRITICAL)
.\scripts\test-crisis-response-time.ps1
```

#### Step 2: Manual Validation
- [ ] Test user registration and login
- [ ] Verify crisis button functionality
- [ ] Test notification delivery
- [ ] Confirm HIPAA audit logging is working
- [ ] Validate SSL certificates and security headers

### Phase 5: Traffic Restoration (Duration: 5-10 minutes)

#### Step 1: Remove Maintenance Mode
```bash
# Disable maintenance mode
./scripts/disable-maintenance-mode.sh

# Verify application is accessible
curl -s https://app.serenity-pathways.com/health
```

#### Step 2: Scale Up Services
```bash
# Scale services to full capacity
docker-compose scale patient-portal=3 notification-service=2
```

#### Step 3: Monitor Traffic
```bash
# Monitor application metrics
./scripts/monitor-post-deployment.sh
```

## Post-Deployment Verification

### Immediate Checks (0-15 minutes)
- [ ] All services reporting healthy status
- [ ] Error rates within normal thresholds (< 0.1%)
- [ ] Crisis response time < 500ms
- [ ] Database connections stable
- [ ] No alerts firing in monitoring system

### Extended Monitoring (15-60 minutes)
- [ ] Application performance metrics normal
- [ ] No increase in error logs
- [ ] Memory and CPU usage within expected ranges
- [ ] Patient and provider workflows functioning correctly

### 24-Hour Follow-up
- [ ] Review deployment metrics and reports
- [ ] Check for any delayed issues or regressions
- [ ] Verify backup processes completed successfully
- [ ] Document lessons learned and improvements

## Rollback Procedures

### Automatic Rollback Triggers
The deployment will automatically rollback if:
- Crisis response time > 1000ms for more than 2 minutes
- Error rate > 5% for more than 5 minutes
- Any critical service is down for more than 3 minutes
- HIPAA compliance violations detected

### Manual Rollback Procedure

#### Step 1: Immediate Actions
```bash
# Put system in maintenance mode
./scripts/enable-maintenance-mode.sh

# Notify stakeholders
./scripts/send-rollback-notification.sh
```

#### Step 2: Service Rollback
```powershell
# Execute service rollback
.\deployment\production-deploy.ps1 -Action rollback -Version $PREVIOUS_VERSION

# Monitor rollback progress
Get-Content logs\deployment-*.log -Wait
```

#### Step 3: Database Rollback (if needed)
```bash
# Restore database from backup (ONLY if schema changes were made)
pg_restore -d $DATABASE_URL backups/pre-migration-*.sql

# Verify database restoration
psql $DATABASE_URL -c "SELECT version();"
```

#### Step 4: Validation
```bash
# Run validation tests
./testing/production-validation.ps1 -Environment production

# Verify system functionality
./scripts/verify-rollback-success.sh
```

## Emergency Procedures

### Crisis Service Failure
If the crisis response service fails:

1. **Immediate Response** (< 2 minutes)
   ```bash
   # Activate emergency crisis hotline redirect
   ./scripts/activate-emergency-hotline.sh
   
   # Send immediate notifications to crisis response team
   ./scripts/notify-crisis-team.sh
   ```

2. **Service Recovery**
   ```bash
   # Restart crisis service
   docker-compose restart crisis-service
   
   # If restart fails, rollback entire deployment
   ./deployment/production-deploy.ps1 -Action rollback
   ```

### Complete System Failure
If multiple services fail:

1. **Activate Disaster Recovery**
   ```bash
   # Switch to backup data center (if available)
   ./scripts/activate-dr-site.sh
   
   # Restore from backups
   ./scripts/restore-full-system.sh
   ```

2. **Emergency Communications**
   - Notify all stakeholders immediately
   - Activate incident response procedures
   - Document all actions taken

## Security Considerations

### HIPAA Requirements During Deployment
- All deployment activities must be logged for audit purposes
- PHI access must be monitored throughout the process
- Any data exposure must be reported immediately
- Encryption must remain active at all times

### Security Validation
```bash
# Verify encryption is active
./scripts/verify-encryption-status.sh

# Check for security vulnerabilities
./scripts/security-scan.sh

# Validate HIPAA compliance
./scripts/hipaa-compliance-check.sh
```

## Monitoring and Alerting

### Key Metrics to Monitor
- **Crisis Response Time**: Must remain < 500ms
- **Service Availability**: Must maintain > 99.9%
- **Error Rates**: Must stay < 0.1%
- **Database Performance**: Query response times
- **SSL Certificate Status**: Expiration dates

### Alert Escalation
1. **Level 1**: Email alerts to operations team
2. **Level 2**: Slack notifications + email to management
3. **Level 3**: SMS/phone alerts to on-call engineer + security team

## Contact Information

### Primary Contacts
- **Deployment Lead**: [Name] - [Phone] - [Email]
- **Security Officer**: [Name] - [Phone] - [Email]
- **Database Administrator**: [Name] - [Phone] - [Email]
- **On-Call Engineer**: [Rotation] - [Phone] - [Slack]

### Emergency Contacts
- **Crisis Response Team**: [Emergency Number]
- **HIPAA Compliance Officer**: [Phone] - [Email]
- **System Administrator**: [Phone] - [Email]

## Documentation Updates

After each deployment:
- [ ] Update this runbook with lessons learned
- [ ] Document any new procedures or changes
- [ ] Update contact information if changed
- [ ] Review and update emergency procedures
- [ ] Submit runbook changes for approval

## Appendix

### A. Command Reference
```bash
# Common deployment commands
./deployment/production-deploy.ps1 -Action deploy
./deployment/production-deploy.ps1 -Action validate  
./deployment/production-deploy.ps1 -Action rollback -Version X.Y.Z

# Health check commands
curl https://api.serenity-pathways.com/health
curl https://api.serenity-pathways.com/crisis/health
curl https://api.serenity-pathways.com/auth/health

# Monitoring commands
docker-compose -f monitoring/docker-compose.monitoring.yml ps
./scripts/check-service-status.sh
./scripts/monitor-deployment.sh
```

### B. Configuration Files
- `deployment/config/production.json` - Main deployment configuration
- `monitoring/prometheus/prometheus.yml` - Monitoring configuration
- `deployment/docker-compose.prod.yml` - Production docker compose

### C. Log Locations
- Deployment logs: `logs/deployment-*.log`
- Application logs: `/var/log/serenity/`
- System logs: `/var/log/syslog`
- Audit logs: `/var/log/serenity/audit/`

---

**Document Version**: 1.0  
**Last Updated**: $(Get-Date -Format "yyyy-MM-dd")  
**Next Review Date**: $(Get-Date -Format "yyyy-MM-dd" -Date (Get-Date).AddMonths(3))  
**Approved By**: [Security Officer] - [Deployment Lead]