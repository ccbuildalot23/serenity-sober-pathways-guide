# Serenity API Gateway Deployment Guide

This document provides comprehensive deployment instructions for the Serenity API Gateway in various environments.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Staging Environment](#staging-environment)
- [Production Deployment](#production-deployment)
- [AWS Deployment](#aws-deployment)
- [Azure Deployment](#azure-deployment)
- [Docker Swarm](#docker-swarm)
- [Kubernetes](#kubernetes)
- [Monitoring Setup](#monitoring-setup)
- [Backup Configuration](#backup-configuration)
- [Security Hardening](#security-hardening)
- [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

### System Requirements

| Environment | CPU | RAM | Storage | Network |
|-------------|-----|-----|---------|---------|
| Development | 2 cores | 8GB | 20GB | 100Mbps |
| Staging | 4 cores | 16GB | 100GB | 1Gbps |
| Production | 8+ cores | 32GB+ | 500GB+ | 10Gbps |

### Software Dependencies

- Docker Engine 20.10+
- Docker Compose 2.0+
- OpenSSL 1.1.1+
- curl, jq, nc (netcat)
- Git 2.30+

### Network Requirements

#### Required Ports

| Port | Service | Protocol | Access Level |
|------|---------|----------|--------------|
| 8000 | Kong Proxy | HTTP/HTTPS | Public |
| 8001 | Kong Admin | HTTP | Internal |
| 8002 | Kong Manager | HTTP | Admin |
| 8443 | Kong Proxy SSL | HTTPS | Public |
| 1337 | Konga UI | HTTP | Admin |
| 9090 | Prometheus | HTTP | Internal |
| 3001 | Grafana | HTTP | Admin |
| 5601 | Kibana | HTTP | Admin |
| 9200 | Elasticsearch | HTTP | Internal |
| 8090 | Health Checker | HTTP | Internal |

## 🏠 Local Development

### Quick Start

```bash
# Clone repository
git clone <repository-url>
cd serenity/api-gateway

# Start services (Windows)
scripts\start-gateway.bat

# Start services (Linux/macOS)
chmod +x scripts/start-gateway.sh
./scripts/start-gateway.sh
```

### Manual Setup

```bash
# 1. Create environment file
cp .env.example .env

# 2. Generate secrets
openssl rand -hex 32 > .secrets

# 3. Start infrastructure
docker-compose up -d kong-database kong-redis elasticsearch

# 4. Wait for services
sleep 30

# 5. Run Kong migrations
docker-compose run --rm kong-migration

# 6. Start Kong
docker-compose up -d kong

# 7. Start monitoring
docker-compose up -d prometheus grafana logstash kibana

# 8. Start supporting services
docker-compose up -d health-checker konga circuit-breaker
```

### Development Configuration

Create `.env.development`:

```bash
COMPOSE_PROJECT_NAME=serenity-gateway-dev
ENVIRONMENT=development
LOG_LEVEL=debug

# Use weak passwords for development
KONG_PG_PASSWORD=kong123
KONG_REDIS_PASSWORD=redis123
GF_SECURITY_ADMIN_PASSWORD=admin123

# Enable debug features
KONG_LOG_LEVEL=debug
GRAFANA_LOG_LEVEL=debug
```

## 🧪 Staging Environment

### Setup Staging Environment

```bash
# 1. Clone production environment template
cp .env.production .env.staging

# 2. Modify for staging
sed -i 's/production/staging/g' .env.staging
sed -i 's/serenity-gateway-prod/serenity-gateway-staging/g' .env.staging

# 3. Generate staging secrets
./scripts/generate-secrets.sh staging

# 4. Start with staging configuration
docker-compose -f docker-compose.yml -f docker-compose.staging.yml --env-file .env.staging up -d
```

### Staging-specific Configuration

Create `docker-compose.staging.yml`:

```yaml
version: '3.8'

services:
  kong:
    environment:
      KONG_LOG_LEVEL: info
      KONG_ADMIN_GUI_URL: http://staging-admin.serenity.local:8002
    labels:
      - "environment=staging"
      - "backup=required"

  kong-database:
    environment:
      POSTGRES_DB: kong_staging
    volumes:
      - staging-db-data:/var/lib/postgresql/data

  prometheus:
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=90d'
      - '--web.external-url=http://staging-metrics.serenity.local:9090'

  grafana:
    environment:
      GF_SERVER_ROOT_URL: http://staging-grafana.serenity.local:3001
      GF_SECURITY_ADMIN_PASSWORD: ${STAGING_GRAFANA_PASSWORD}

volumes:
  staging-db-data:
    driver: local
```

## 🚀 Production Deployment

### Production Setup

```bash
# 1. Run production setup script
./scripts/production-setup.sh

# 2. Review generated configuration
cat .env.production
cat .secrets

# 3. Configure SSL certificates
# Replace self-signed certificates with CA-signed certificates
cp /path/to/production.crt ssl/serenity.crt
cp /path/to/production.key ssl/serenity.key

# 4. Set proper file permissions
chmod 600 ssl/serenity.key .secrets
chmod 644 ssl/serenity.crt .env.production

# 5. Start production services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d
```

### Production Environment Variables

```bash
# .env.production
COMPOSE_PROJECT_NAME=serenity-gateway
ENVIRONMENT=production

# Security
JWT_SECRET_KEY=<generated-secret>
API_KEY_SECRET=<generated-secret>
ALERT_WEBHOOK_TOKEN=<generated-token>

# Database (use strong passwords)
KONG_PG_PASSWORD=<strong-password>
POSTGRES_PASSWORD=<strong-password>

# Redis
KONG_REDIS_PASSWORD=<strong-password>
REDIS_PASSWORD=<strong-password>

# Monitoring
GF_SECURITY_ADMIN_PASSWORD=<strong-password>
GF_SECURITY_SECRET_KEY=<generated-secret>

# Performance
KONG_WORKER_PROCESSES=auto
KONG_WORKER_CONNECTIONS=4096

# SSL/TLS
SSL_CERT_PATH=/etc/ssl/certs/serenity.crt
SSL_KEY_PATH=/etc/ssl/private/serenity.key
SSL_PROTOCOLS=TLSv1.2 TLSv1.3

# Monitoring retention
PROMETHEUS_RETENTION_TIME=365d
ELASTICSEARCH_RETENTION_DAYS=90

# HIPAA Compliance
AUDIT_LOG_ENABLED=true
SESSION_TIMEOUT=900
DATA_RETENTION_DAYS=2555
```

### Production Health Check

```bash
# Verify all services are running
docker-compose ps

# Check Kong health
curl -f http://localhost:8001/status

# Check proxy functionality
curl -f http://localhost:8000/health

# Verify SSL
openssl s_client -connect localhost:8443 -servername serenity.local

# Check monitoring stack
curl -f http://localhost:9090/-/healthy
curl -f http://localhost:3001/api/health
```

## ☁️ AWS Deployment

### EC2 Deployment

#### 1. Launch EC2 Instance

```bash
# Launch Ubuntu 20.04 LTS instance
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --instance-type c5.2xlarge \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx \
  --block-device-mappings '[{
    "DeviceName":"/dev/sda1",
    "Ebs":{
      "VolumeSize":100,
      "VolumeType":"gp3",
      "DeleteOnTermination":true
    }
  }]' \
  --tag-specifications 'ResourceType=instance,Tags=[
    {Key=Name,Value=serenity-api-gateway},
    {Key=Environment,Value=production}
  ]'
```

#### 2. Instance Setup

```bash
# Connect to instance
ssh -i your-key.pem ubuntu@<instance-ip>

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.12.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Clone repository
git clone <repository-url>
cd serenity/api-gateway
```

#### 3. Configure AWS-specific Settings

```bash
# Create AWS-specific environment
cat > .env.aws << 'EOF'
# AWS-specific configuration
COMPOSE_PROJECT_NAME=serenity-gateway-aws
ENVIRONMENT=production-aws

# Use AWS RDS for database
KONG_PG_HOST=serenity-rds.cluster-xxxxx.us-east-1.rds.amazonaws.com
KONG_PG_USER=kong_user
KONG_PG_PASSWORD=${AWS_RDS_PASSWORD}
KONG_PG_DATABASE=kong_production

# Use AWS ElastiCache for Redis
KONG_REDIS_HOST=serenity-redis.xxxxx.cache.amazonaws.com
KONG_REDIS_PORT=6379

# Use AWS CloudWatch for logging
AWS_REGION=us-east-1
CLOUDWATCH_LOG_GROUP=/aws/ecs/serenity-gateway

# Load balancer configuration
KONG_PROXY_LISTEN=0.0.0.0:8000
KONG_ADMIN_LISTEN=127.0.0.1:8001

# SSL termination at ALB
KONG_TRUSTED_IPS=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16

EOF
```

#### 4. AWS-specific Docker Compose

Create `docker-compose.aws.yml`:

```yaml
version: '3.8'

services:
  kong:
    environment:
      # Use external RDS and ElastiCache
      KONG_PG_HOST: ${KONG_PG_HOST}
      KONG_PG_USER: ${KONG_PG_USER}
      KONG_PG_PASSWORD: ${KONG_PG_PASSWORD}
      KONG_REDIS_HOST: ${KONG_REDIS_HOST}
      KONG_REDIS_PORT: ${KONG_REDIS_PORT}
      
      # CloudWatch logging
      KONG_PROXY_ACCESS_LOG: /dev/stdout
      KONG_ADMIN_ACCESS_LOG: /dev/stdout
      KONG_PROXY_ERROR_LOG: /dev/stderr
      KONG_ADMIN_ERROR_LOG: /dev/stderr
    
    # Remove database and redis services (using AWS managed services)
  
  # Add CloudWatch logging driver
  logstash:
    logging:
      driver: awslogs
      options:
        awslogs-group: /aws/ecs/serenity-gateway
        awslogs-region: us-east-1
        awslogs-stream-prefix: logstash

  prometheus:
    logging:
      driver: awslogs
      options:
        awslogs-group: /aws/ecs/serenity-gateway
        awslogs-region: us-east-1
        awslogs-stream-prefix: prometheus

# Remove managed service volumes
volumes: {}
```

### ECS Deployment

#### 1. Create ECS Cluster

```bash
# Create ECS cluster
aws ecs create-cluster \
  --cluster-name serenity-api-gateway \
  --capacity-providers EC2 FARGATE \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1

# Create task execution role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document file://ecs-trust-policy.json

aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

#### 2. ECS Task Definition

Create `ecs-task-definition.json`:

```json
{
  "family": "serenity-api-gateway",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "4096",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "kong",
      "image": "kong:3.4-alpine",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        },
        {
          "containerPort": 8001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "KONG_DATABASE",
          "value": "postgres"
        },
        {
          "name": "KONG_PG_HOST",
          "value": "your-rds-endpoint"
        }
      ],
      "secrets": [
        {
          "name": "KONG_PG_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:kong-db-password"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/serenity-api-gateway",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "kong"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "kong health"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

## 🐳 Docker Swarm Deployment

### 1. Initialize Swarm

```bash
# Initialize Docker Swarm
docker swarm init --advertise-addr <manager-ip>

# Add worker nodes
docker swarm join --token <worker-token> <manager-ip>:2377
```

### 2. Create Docker Stack

Create `docker-stack.yml`:

```yaml
version: '3.8'

services:
  kong:
    image: kong:3.4-alpine
    ports:
      - "8000:8000"
      - "8001:8001"
      - "8443:8443"
    environment:
      KONG_DATABASE: postgres
      KONG_PG_HOST: postgres
      KONG_PG_USER: kong
      KONG_PG_PASSWORD_FILE: /run/secrets/postgres_password
    secrets:
      - postgres_password
    deploy:
      replicas: 3
      placement:
        constraints:
          - node.role == worker
      resources:
        limits:
          memory: 2G
          cpus: '1'
        reservations:
          memory: 1G
          cpus: '0.5'
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
    networks:
      - gateway-network
      
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: kong
      POSTGRES_DB: kong
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
    secrets:
      - postgres_password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
    networks:
      - gateway-network

secrets:
  postgres_password:
    external: true

volumes:
  postgres-data:
    driver: local

networks:
  gateway-network:
    driver: overlay
    attachable: true
```

### 3. Deploy Stack

```bash
# Create secrets
echo "your-strong-password" | docker secret create postgres_password -

# Deploy stack
docker stack deploy -c docker-stack.yml serenity-gateway

# Check deployment
docker stack services serenity-gateway
docker stack ps serenity-gateway
```

## ☸️ Kubernetes Deployment

### 1. Create Namespace

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: serenity-gateway
  labels:
    name: serenity-gateway
    environment: production
```

### 2. ConfigMap and Secrets

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kong-config
  namespace: serenity-gateway
data:
  kong.yml: |
    # Kong configuration content here
---
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: kong-secrets
  namespace: serenity-gateway
type: Opaque
data:
  postgres-password: <base64-encoded-password>
  redis-password: <base64-encoded-password>
```

### 3. PostgreSQL Deployment

```yaml
# postgres.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: serenity-gateway
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_USER
          value: "kong"
        - name: POSTGRES_DB
          value: "kong"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: kong-secrets
              key: postgres-password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: serenity-gateway
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
```

### 4. Kong Deployment

```yaml
# kong.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kong
  namespace: serenity-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kong
  template:
    metadata:
      labels:
        app: kong
    spec:
      initContainers:
      - name: kong-migration
        image: kong:3.4-alpine
        command: ["kong", "migrations", "bootstrap"]
        env:
        - name: KONG_DATABASE
          value: "postgres"
        - name: KONG_PG_HOST
          value: "postgres"
        - name: KONG_PG_USER
          value: "kong"
        - name: KONG_PG_PASSWORD
          valueFrom:
            secretKeyRef:
              name: kong-secrets
              key: postgres-password
      containers:
      - name: kong
        image: kong:3.4-alpine
        env:
        - name: KONG_DATABASE
          value: "postgres"
        - name: KONG_PG_HOST
          value: "postgres"
        - name: KONG_PG_USER
          value: "kong"
        - name: KONG_PG_PASSWORD
          valueFrom:
            secretKeyRef:
              name: kong-secrets
              key: postgres-password
        - name: KONG_PROXY_LISTEN
          value: "0.0.0.0:8000"
        - name: KONG_ADMIN_LISTEN
          value: "0.0.0.0:8001"
        ports:
        - containerPort: 8000
        - containerPort: 8001
        volumeMounts:
        - name: kong-config
          mountPath: /kong/declarative
        livenessProbe:
          httpGet:
            path: /status
            port: 8001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /status
            port: 8001
          initialDelaySeconds: 10
          periodSeconds: 5
      volumes:
      - name: kong-config
        configMap:
          name: kong-config
---
apiVersion: v1
kind: Service
metadata:
  name: kong-proxy
  namespace: serenity-gateway
spec:
  type: LoadBalancer
  selector:
    app: kong
  ports:
  - name: proxy
    port: 80
    targetPort: 8000
  - name: proxy-ssl
    port: 443
    targetPort: 8443
---
apiVersion: v1
kind: Service
metadata:
  name: kong-admin
  namespace: serenity-gateway
spec:
  selector:
    app: kong
  ports:
  - name: admin
    port: 8001
    targetPort: 8001
```

### 5. Deploy to Kubernetes

```bash
# Apply configurations
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
kubectl apply -f postgres.yaml
kubectl apply -f kong.yaml

# Check deployment status
kubectl get pods -n serenity-gateway
kubectl get services -n serenity-gateway

# View logs
kubectl logs -f deployment/kong -n serenity-gateway
```

## 📊 Monitoring Setup

### Prometheus Configuration

```yaml
# prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: serenity-gateway
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
    
    rule_files:
      - "/etc/prometheus/rules/*.yml"
    
    scrape_configs:
    - job_name: 'kong'
      static_configs:
      - targets: ['kong-admin:8001']
      metrics_path: /metrics
      scrape_interval: 10s
    
    - job_name: 'health-checker'
      static_configs:
      - targets: ['health-checker:8090']
      scrape_interval: 30s
```

### Grafana Configuration

```yaml
# grafana-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: serenity-gateway
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:latest
        env:
        - name: GF_SECURITY_ADMIN_PASSWORD
          valueFrom:
            secretKeyRef:
              name: kong-secrets
              key: grafana-password
        ports:
        - containerPort: 3000
        volumeMounts:
        - name: grafana-storage
          mountPath: /var/lib/grafana
        - name: grafana-config
          mountPath: /etc/grafana/provisioning
      volumes:
      - name: grafana-storage
        persistentVolumeClaim:
          claimName: grafana-pvc
      - name: grafana-config
        configMap:
          name: grafana-config
```

## 💾 Backup Configuration

### Automated Backup Script

```bash
#!/bin/bash
# backup-production.sh

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/$BACKUP_DATE"
S3_BUCKET="serenity-backups"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL database
docker-compose exec -T kong-database pg_dump -U kong kong > "$BACKUP_DIR/kong_$BACKUP_DATE.sql"

# Backup Redis data
docker-compose exec -T kong-redis redis-cli BGSAVE
docker cp serenity-gateway_kong-redis_1:/data/dump.rdb "$BACKUP_DIR/redis_$BACKUP_DATE.rdb"

# Backup Kong configuration
cp -r config/ "$BACKUP_DIR/"

# Backup SSL certificates
cp -r ssl/ "$BACKUP_DIR/"

# Backup environment files
cp .env.production "$BACKUP_DIR/"
cp .secrets "$BACKUP_DIR/"

# Compress backup
tar -czf "$BACKUP_DIR.tar.gz" -C "$(dirname $BACKUP_DIR)" "$(basename $BACKUP_DIR)"

# Upload to S3 (if configured)
if command -v aws &> /dev/null; then
    aws s3 cp "$BACKUP_DIR.tar.gz" "s3://$S3_BUCKET/gateway-backups/"
fi

# Cleanup local backup
rm -rf "$BACKUP_DIR"

# Cleanup old backups (keep 30 days)
find /backups -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR.tar.gz"
```

### Restore Procedure

```bash
#!/bin/bash
# restore-production.sh

BACKUP_FILE="$1"
RESTORE_DIR="/tmp/restore_$(date +%s)"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file.tar.gz>"
    exit 1
fi

# Extract backup
mkdir -p "$RESTORE_DIR"
tar -xzf "$BACKUP_FILE" -C "$RESTORE_DIR"

# Stop services
docker-compose down

# Restore database
docker-compose up -d kong-database
sleep 10
cat "$RESTORE_DIR"/*/kong_*.sql | docker-compose exec -T kong-database psql -U kong kong

# Restore Redis
docker-compose up -d kong-redis
sleep 5
docker cp "$RESTORE_DIR"/*/redis_*.rdb serenity-gateway_kong-redis_1:/data/dump.rdb
docker-compose restart kong-redis

# Restore configuration
cp -r "$RESTORE_DIR"/*/config/* config/
cp -r "$RESTORE_DIR"/*/ssl/* ssl/

# Start all services
docker-compose up -d

# Cleanup
rm -rf "$RESTORE_DIR"

echo "Restore completed"
```

## 🔒 Security Hardening

### System-level Security

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Configure firewall
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow only required ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 8000/tcp  # Kong Proxy

# Install fail2ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Configure SSH hardening
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# Set up log monitoring
sudo apt install auditd -y
sudo systemctl enable auditd
sudo systemctl start auditd
```

### Docker Security

```bash
# Run Docker rootless
curl -fsSL https://get.docker.com/rootless | sh

# Configure Docker daemon security
sudo tee /etc/docker/daemon.json << EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true,
  "userland-proxy": false,
  "no-new-privileges": true,
  "seccomp-profile": "/etc/docker/seccomp.json"
}
EOF

sudo systemctl restart docker

# Scan images for vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image kong:3.4-alpine
```

### Application Security

```yaml
# security-hardening.yml
version: '3.8'

services:
  kong:
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    read_only: true
    tmpfs:
      - /tmp
      - /var/run
    security_opt:
      - no-new-privileges:true
    user: "kong:kong"
    
  kong-database:
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - DAC_OVERRIDE
      - FOWNER
      - SETGID
      - SETUID
    read_only: true
    tmpfs:
      - /tmp
      - /var/run/postgresql
    security_opt:
      - no-new-privileges:true
    user: "postgres:postgres"
```

## 🔍 Troubleshooting

### Common Issues

#### Kong Won't Start

**Symptoms:**
- Kong container exits immediately
- Error: "Database not ready"

**Solutions:**
```bash
# Check database connectivity
docker-compose exec kong-database psql -U kong -d kong -c "SELECT version();"

# Check Kong configuration
docker-compose run --rm kong kong config parse /kong/declarative/kong.yml

# Check logs
docker-compose logs kong

# Restart with fresh database
docker-compose down
docker volume rm serenity-gateway_kong-db-data
docker-compose up -d kong-database
sleep 30
docker-compose run --rm kong-migration
docker-compose up -d kong
```

#### High Memory Usage

**Symptoms:**
- Out of memory errors
- Slow response times
- Container restarts

**Solutions:**
```bash
# Monitor resource usage
docker stats

# Adjust memory limits in production compose file
# Add to service configuration:
deploy:
  resources:
    limits:
      memory: 2G
    reservations:
      memory: 1G

# Optimize PostgreSQL settings
# Add to postgres service:
command: >
  postgres
  -c shared_buffers=256MB
  -c max_connections=100
  -c effective_cache_size=1GB

# Clean up unused Docker resources
docker system prune -af
docker volume prune -f
```

#### SSL Certificate Issues

**Symptoms:**
- SSL handshake failures
- Certificate warnings
- HTTPS not working

**Solutions:**
```bash
# Check certificate validity
openssl x509 -in ssl/serenity.crt -text -noout

# Test SSL connection
openssl s_client -connect localhost:8443 -servername serenity.local

# Regenerate self-signed certificates
rm ssl/serenity.*
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/serenity.key -out ssl/serenity.crt \
  -subj "/CN=serenity.local"

# Restart Kong
docker-compose restart kong
```

#### Performance Issues

**Symptoms:**
- High response times
- Low throughput
- Resource bottlenecks

**Solutions:**
```bash
# Enable Kong performance mode
# Add to Kong environment:
KONG_WORKER_PROCESSES: auto
KONG_WORKER_CONNECTIONS: 4096

# Optimize database connections
# Add to postgres:
command: >
  postgres
  -c max_connections=200
  -c shared_buffers=512MB
  -c effective_cache_size=2GB

# Increase file limits
# Add to service:
ulimits:
  nofile:
    soft: 65536
    hard: 65536

# Monitor with performance tools
docker exec -it <container> top
docker exec -it <container> iostat -x 1
```

### Log Analysis

```bash
# View Kong access logs
docker-compose logs kong | grep "access"

# Check error patterns
docker-compose logs kong | grep -i error

# Monitor real-time logs
docker-compose logs -f --tail=100

# Export logs for analysis
docker-compose logs kong > kong-logs.txt

# Search for specific patterns
grep "rate limit" kong-logs.txt
grep "502\|503\|504" kong-logs.txt
```

### Health Check Debugging

```bash
# Test individual service health
curl -v http://localhost:8090/health/auth-service
curl -v http://localhost:8090/health/crisis-service

# Check Kong status
curl -v http://localhost:8001/status

# Verify upstream connectivity
docker-compose exec kong curl -v http://host.docker.internal:3000/health

# Test from within container
docker-compose exec kong nslookup host.docker.internal
docker-compose exec kong ping -c 3 host.docker.internal
```

## 📞 Support and Maintenance

### Regular Maintenance Tasks

```bash
# Weekly tasks
./scripts/weekly-maintenance.sh

# Monthly tasks
./scripts/monthly-maintenance.sh

# Quarterly tasks
./scripts/quarterly-maintenance.sh
```

### Monitoring Checklist

- [ ] Check service health status
- [ ] Review error rates and performance metrics
- [ ] Verify backup completion
- [ ] Check disk space and resource usage
- [ ] Review security logs
- [ ] Update dependencies
- [ ] Test disaster recovery procedures

### Emergency Contacts

- **Technical Lead**: tech-lead@serenity.app
- **Operations Team**: ops@serenity.app
- **Security Team**: security@serenity.app
- **On-call Engineer**: +1-555-SERENITY

---

**For additional support, please refer to the main README.md or contact the operations team.**