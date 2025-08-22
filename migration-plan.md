# Serenity Platform: Monolith to Microservices Migration Plan

## Executive Summary
Migration strategy for running Serenity Sober Pathways in parallel across Vercel (monolith) and AWS (microservices) with zero downtime and gradual transition.

## Current State Analysis

### Monolithic Application (Vercel)
- **Technology**: React 19, TypeScript, Vite, Supabase
- **Deployment**: Vercel with HIPAA-compliant security headers
- **Database**: Supabase (PostgreSQL with RLS)
- **Authentication**: Supabase Auth with PKCE
- **Real-time**: Supabase Realtime channels

### Microservices Architecture (AWS Target)
- **Services**: 11 bounded contexts identified
- **Container**: Docker/Kubernetes (EKS)
- **Database**: AWS RDS PostgreSQL (migrated from Supabase)
- **Message Queue**: Amazon MQ (RabbitMQ)
- **Cache**: ElastiCache (Redis)
- **API Gateway**: AWS API Gateway + ALB

## Migration Strategy: Strangler Fig Pattern

### Phase 1: Infrastructure Setup (Week 1-2)

#### AWS Infrastructure
```yaml
Resources:
  - EKS Cluster (us-east-1, HIPAA compliance zone)
  - RDS PostgreSQL (Multi-AZ, encrypted)
  - ElastiCache Redis cluster
  - Amazon MQ (RabbitMQ managed)
  - S3 buckets (PHI storage, encrypted)
  - CloudFront CDN
  - Route 53 DNS
  - AWS WAF
  - AWS Secrets Manager
  - CloudWatch logging
```

#### Terraform Configuration
```hcl
# terraform/aws-infrastructure.tf
module "eks_cluster" {
  source = "./modules/eks"
  cluster_name = "serenity-prod"
  node_groups = {
    main = {
      desired_capacity = 3
      max_capacity     = 10
      min_capacity     = 2
      instance_types   = ["t3.large"]
    }
  }
}

module "rds_postgresql" {
  source = "./modules/rds"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"
  multi_az = true
  encryption = true
  backup_retention = 30
}
```

### Phase 2: Data Layer Migration (Week 2-3)

#### Database Migration Strategy
1. **Supabase to AWS RDS Migration**
   ```bash
   # Export from Supabase
   pg_dump $SUPABASE_DB_URL > serenity_backup.sql
   
   # Import to RDS with encryption
   psql $RDS_URL < serenity_backup.sql
   ```

2. **Dual-Write Pattern Implementation**
   ```typescript
   // services/data-sync/dual-write.ts
   class DualWriteService {
     async write(table: string, data: any) {
       const [supabaseResult, rdsResult] = await Promise.allSettled([
         this.supabaseClient.from(table).insert(data),
         this.rdsClient.query(`INSERT INTO ${table}...`)
       ]);
       
       if (supabaseResult.status === 'rejected') {
         await this.rollback(rdsResult);
       }
     }
   }
   ```

### Phase 3: Service Migration Order (Week 3-8)

#### Migration Sequence (Risk-Based)
1. **Security Service** (Week 3)
   - Lowest risk, shared infrastructure
   - Deploy to AWS EKS
   - Route audit logs to both systems

2. **Notification Service** (Week 4)
   - Independent service
   - Easy rollback
   - Test with non-critical notifications first

3. **Files Service** (Week 4)
   - Migrate from Supabase Storage to S3
   - Implement signed URL compatibility

4. **Analytics Service** (Week 5)
   - Read-only service
   - Low impact on core functionality

5. **Identity Service** (Week 6)
   - Critical path - careful migration
   - Maintain session compatibility
   - JWT token sharing between systems

6. **Crisis Service** (Week 7)
   - High priority, careful testing
   - Parallel operation mandatory
   - Real-time sync required

7. **Remaining Services** (Week 8)
   - Checkins, Communication, Clinical, Support Network

### Phase 4: Routing and Load Balancing (Week 4-8)

#### API Gateway Configuration
```yaml
# api-gateway-config.yaml
routes:
  - path: /api/auth/*
    target: 
      primary: vercel.serenity.com
      canary: alb.serenity.aws.com
      weight: 90/10  # Start with 10% to AWS
  
  - path: /api/notifications/*
    target:
      primary: alb.serenity.aws.com
      fallback: vercel.serenity.com
  
  - path: /api/security/*
    target: alb.serenity.aws.com  # Fully migrated
```

#### Intelligent Routing with AWS Lambda@Edge
```javascript
// lambda-edge-router.js
exports.handler = async (event) => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;
  
  // Feature flag based routing
  const userFeatures = await getFeatureFlags(headers['x-user-id']);
  
  if (userFeatures.useNewArchitecture) {
    request.origin = {
      custom: {
        domainName: 'alb.serenity.aws.com',
        port: 443,
        protocol: 'https'
      }
    };
  }
  
  return request;
};
```

### Phase 5: Deployment Pipeline (Continuous)

#### GitHub Actions Workflow
```yaml
# .github/workflows/deploy-parallel.yml
name: Parallel Deployment

on:
  push:
    branches: [main]

jobs:
  deploy-vercel:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy Monolith to Vercel
        run: |
          npm ci --legacy-peer-deps
          npm run build
          vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
  
  deploy-aws:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [security, notifications, gateway, identity]
    steps:
      - uses: actions/checkout@v3
      - name: Build and Push to ECR
        run: |
          cd serenity-microservices/services/${{ matrix.service }}
          docker build -t ${{ matrix.service }}:${{ github.sha }} .
          aws ecr get-login-password | docker login --username AWS
          docker push $ECR_REPO/${{ matrix.service }}:${{ github.sha }}
      
      - name: Deploy to EKS
        run: |
          kubectl set image deployment/${{ matrix.service }} \
            app=$ECR_REPO/${{ matrix.service }}:${{ github.sha }}
```

### Phase 6: Monitoring and Rollback (Continuous)

#### Observability Stack
```yaml
# monitoring-stack.yaml
monitoring:
  - service: Datadog
    integrations:
      - Vercel logs
      - AWS CloudWatch
      - EKS metrics
      - RDS performance
    
  - service: PagerDuty
    alerts:
      - Error rate > 1%
      - Latency p99 > 1000ms
      - Failed health checks
```

#### Automated Rollback
```typescript
// rollback-controller.ts
class RollbackController {
  async checkHealth() {
    const metrics = await this.getMetrics();
    
    if (metrics.errorRate > 0.01 || metrics.p99Latency > 1000) {
      await this.initiateRollback();
      await this.notifyTeam('Automatic rollback initiated');
    }
  }
  
  async initiateRollback() {
    // Revert traffic to Vercel
    await this.updateRoute53({
      primary: 'vercel.serenity.com',
      weight: 100
    });
    
    // Scale down AWS services
    await this.scaleEKS(0);
  }
}
```

## Migration Timeline

### Week 1-2: Infrastructure
- [ ] Provision AWS resources via Terraform
- [ ] Set up monitoring and alerting
- [ ] Configure CI/CD pipelines
- [ ] Security audit and compliance check

### Week 2-3: Data Migration
- [ ] Set up database replication
- [ ] Implement dual-write pattern
- [ ] Verify data consistency
- [ ] Test rollback procedures

### Week 3-8: Service Migration
- [ ] Migrate services per schedule
- [ ] Implement feature flags
- [ ] Progressive traffic shifting
- [ ] Performance testing at each stage

### Week 9-10: Optimization
- [ ] Performance tuning
- [ ] Cost optimization
- [ ] Documentation update
- [ ] Team training

### Week 11-12: Cutover
- [ ] Final traffic migration
- [ ] Decommission unused resources
- [ ] Post-migration audit
- [ ] Celebrate! 🎉

## Risk Mitigation

### Technical Risks
1. **Data Consistency**
   - Solution: Event sourcing + CQRS
   - Dual-write with reconciliation

2. **Session Management**
   - Solution: Shared Redis session store
   - JWT tokens with same signing key

3. **Real-time Features**
   - Solution: WebSocket proxy layer
   - Gradual migration of channels

### Operational Risks
1. **Team Knowledge**
   - Solution: Pair programming
   - Comprehensive documentation
   - Runbooks for each service

2. **Compliance (HIPAA)**
   - Solution: Maintain encryption throughout
   - Audit logging in both systems
   - BAA agreements with AWS

## Cost Analysis

### Current (Vercel + Supabase)
- Vercel Pro: $20/user/month
- Supabase Pro: $25/month
- **Total**: ~$200/month

### Target (AWS)
- EKS Cluster: ~$73/month
- RDS PostgreSQL: ~$200/month
- ElastiCache: ~$50/month
- Load Balancer: ~$25/month
- Data Transfer: ~$100/month
- **Total**: ~$450/month

### Parallel Running (3 months)
- Both systems: ~$650/month
- After migration: ~$450/month
- **ROI**: Better scalability, control, compliance

## Success Criteria

### Technical Metrics
- [ ] Zero downtime during migration
- [ ] Response time < 200ms (p95)
- [ ] Error rate < 0.1%
- [ ] 99.9% uptime maintained

### Business Metrics
- [ ] No user-facing disruptions
- [ ] All HIPAA compliance maintained
- [ ] Cost within 20% of budget
- [ ] Team satisfaction score > 8/10

## Rollback Plan

### Immediate Rollback (< 5 minutes)
```bash
# DNS failover to Vercel
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch file://rollback-dns.json

# Stop AWS services
kubectl scale deployment --all --replicas=0
```

### Data Rollback
```sql
-- Restore from Supabase backup
pg_restore -d $SUPABASE_URL backup_pre_migration.dump

-- Replay missed transactions
SELECT replay_transactions(start_time, end_time);
```

## Conclusion

This migration plan enables:
1. **Zero-downtime migration** using parallel deployment
2. **Gradual risk mitigation** through phased approach
3. **Instant rollback** capability at any stage
4. **HIPAA compliance** maintained throughout
5. **Cost-effective** transition with clear ROI

The Strangler Fig pattern ensures the monolith continues serving users while microservices are gradually introduced, tested, and validated in production.