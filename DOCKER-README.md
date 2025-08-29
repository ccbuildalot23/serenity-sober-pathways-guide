# Serenity Docker Containerization

Comprehensive Docker containerization for the Serenity HIPAA-compliant mental health platform, featuring microservices architecture with full infrastructure support.

## 🏗️ Architecture Overview

### Microservices
- **API Gateway** (Node.js) - Request routing and rate limiting
- **Auth Service** (Node.js) - Authentication and authorization 
- **Notification Service** (Python/FastAPI) - Multi-channel notifications
- **Crisis Service** (Node.js) - Crisis management and real-time alerts
- **Patient Portal** (React Native Web) - Mobile-optimized patient interface
- **Frontend App** (React/Vite) - Main web application

### Infrastructure
- **PostgreSQL** - Primary database with replication
- **Redis** - Caching and session management
- **MongoDB** - Document storage for notifications
- **RabbitMQ** - Message queuing and pub/sub
- **Nginx** - Reverse proxy and load balancer
- **Elasticsearch/Logstash/Kibana** - Centralized logging
- **Prometheus/Grafana** - Monitoring and metrics

### Development Tools
- **Adminer** - Database administration
- **Redis Commander** - Redis GUI
- **Mongo Express** - MongoDB GUI
- **RabbitMQ Management** - Message queue monitoring

## 🚀 Quick Start

### Prerequisites
- Docker Desktop 4.0+
- Docker Compose v2.0+
- PowerShell 7+ (Windows) or Bash (Linux/macOS)
- 16GB+ RAM recommended
- 20GB+ available disk space

### Development Environment

1. **Clone and setup**:
   ```bash
   git clone <repository>
   cd serenity
   ```

2. **Create environment file**:
   ```bash
   cp .env.example .env.dev
   # Edit .env.dev with your configuration
   ```

3. **Start development environment**:
   ```bash
   # Using Make (recommended)
   make dev

   # Or using Docker Compose directly
   docker-compose -f docker-compose.dev.yml up -d --build

   # Or using PowerShell script
   ./scripts/deploy.ps1 -Environment dev -Build -Migrate -Seed
   ```

4. **Access services**:
   - Main App: http://localhost:8080
   - Patient Portal: http://localhost:8081
   - API Gateway: http://localhost:3003
   - Adminer: http://localhost:8090
   - Redis Commander: http://localhost:8091
   - RabbitMQ Management: http://localhost:15672

## 📋 Available Commands

### Make Commands (Cross-platform)
```bash
make help              # Show all available commands
make dev               # Start development environment
make test              # Run complete test suite
make prod              # Deploy production (with confirmation)
make build             # Build all Docker images
make security          # Run security scans
make clean             # Remove all containers and volumes
make logs              # View logs for all services
make health            # Check service health
```

### PowerShell Scripts (Windows)
```powershell
# Build images
./scripts/docker-build.ps1 -Environment dev
./scripts/docker-build.ps1 -Environment prod -SecurityScan -Push

# Deploy environments
./scripts/deploy.ps1 -Environment dev -Build -Migrate -Seed
./scripts/deploy.ps1 -Environment test -Build
./scripts/deploy.ps1 -Environment prod -Build -Monitor
```

### Docker Compose Commands
```bash
# Development
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml logs -f
docker-compose -f docker-compose.dev.yml down

# Testing
docker-compose -f docker-compose.test.yml --profile test up
docker-compose -f docker-compose.test.yml --profile performance up

# Production
docker-compose -f docker-compose.prod.yml up -d
```

## 🧪 Testing

### Unit Tests
```bash
make test-unit
# OR
docker-compose -f docker-compose.test.yml run --rm unit-tests
```

### Integration Tests
```bash
make test-integration
# OR
docker-compose -f docker-compose.test.yml run --rm integration-tests
```

### End-to-End Tests
```bash
make test-e2e
# OR
docker-compose -f docker-compose.test.yml run --rm e2e-tests
```

### Performance Tests
```bash
make test-performance
# OR
docker-compose -f docker-compose.test.yml --profile performance up
```

## 🏭 Production Deployment

### Prerequisites
- Valid SSL certificates in `infrastructure/nginx/ssl/`
- Secure environment variables in `.env.prod`
- Docker secrets configured
- Container registry access

### Deployment Steps

1. **Create production secrets**:
   ```bash
   echo "secure_password" | docker secret create postgres_password -
   echo "secure_jwt_key" | docker secret create jwt_secret -
   # ... create all required secrets
   ```

2. **Build production images**:
   ```bash
   make build-prod
   # OR
   ./scripts/docker-build.ps1 -Environment prod -SecurityScan -Push
   ```

3. **Deploy to production**:
   ```bash
   make prod
   # OR
   ./scripts/deploy.ps1 -Environment prod -Build -Monitor
   ```

4. **Verify deployment**:
   ```bash
   make health
   docker-compose -f docker-compose.prod.yml ps
   ```

## 🔒 Security Features

### Container Security
- Non-root users in all containers
- Multi-stage builds for minimal attack surface
- Security scanning with Trivy
- Read-only file systems where possible
- Resource limits and constraints

### HIPAA Compliance
- PHI data encryption at rest and in transit
- Comprehensive audit logging
- Row Level Security (RLS) in PostgreSQL
- Secure secrets management
- Network isolation and segmentation

### Security Scanning
```bash
# Run security scans
make security

# View security summary
make security-summary

# Manual Trivy scan
trivy image serenity-auth-service:latest
```

## 📊 Monitoring & Logging

### Grafana Dashboards
- Access: http://localhost:3001 (admin/admin)
- Pre-configured dashboards for all services
- HIPAA-compliant metrics without PHI exposure

### Prometheus Metrics
- Access: http://localhost:9090
- Custom application metrics
- Infrastructure monitoring
- Alert rules for critical issues

### Centralized Logging
- ELK Stack (Elasticsearch, Logstash, Kibana)
- PHI data redaction in logs
- Structured logging with correlation IDs
- Alert integration for security events

### Health Checks
```bash
# Check all service health
make health

# Manual health checks
curl http://localhost:3003/health  # API Gateway
curl http://localhost:3000/health  # Auth Service
curl http://localhost:8000/health  # Notification Service
curl http://localhost:3002/health  # Crisis Service
```

## 🗄️ Database Management

### Migrations
```bash
# Run migrations
make db-migrate

# Manual migration
docker-compose -f docker-compose.dev.yml exec postgres psql -U serenity_user -d serenity_dev -f /docker-entrypoint-initdb.d/01-init-serenity.sql
```

### Backups
```bash
# Create backup
make db-backup

# Restore from backup
make db-restore BACKUP_FILE=backups/serenity_dev_20231215_143022.sql
```

### Database Access
```bash
# PostgreSQL shell
make psql

# Redis CLI
make redis-cli

# MongoDB shell
make mongo-shell
```

## 🔧 Configuration

### Environment Variables
Key configuration files:
- `.env.example` - Template with all available options
- `.env.dev` - Development configuration
- `.env.test` - Test environment configuration
- `.env.prod` - Production configuration (create manually)

### Docker Compose Files
- `docker-compose.dev.yml` - Development with hot reload
- `docker-compose.test.yml` - Testing with mock services
- `docker-compose.prod.yml` - Production with monitoring

### Infrastructure Configuration
- `infrastructure/nginx/` - Nginx configurations
- `infrastructure/database/` - Database initialization scripts
- `infrastructure/monitoring/` - Prometheus and Grafana config
- `infrastructure/logging/` - Logstash configuration

## 🐛 Troubleshooting

### Common Issues

1. **Port Conflicts**:
   ```bash
   # Check for port usage
   netstat -tulpn | grep :8080
   # Kill conflicting processes or change ports in compose files
   ```

2. **Memory Issues**:
   ```bash
   # Increase Docker memory allocation to 8GB+
   # Or run fewer services simultaneously
   docker-compose -f docker-compose.dev.yml up -d postgres redis auth-service
   ```

3. **Permission Denied**:
   ```bash
   # Fix Docker socket permissions (Linux/macOS)
   sudo usermod -aG docker $USER
   # Log out and back in
   ```

4. **Build Failures**:
   ```bash
   # Clean Docker cache
   docker system prune -f
   # Rebuild without cache
   docker-compose -f docker-compose.dev.yml build --no-cache
   ```

### Debugging

1. **View service logs**:
   ```bash
   make logs-auth-service
   docker-compose -f docker-compose.dev.yml logs -f auth-service
   ```

2. **Access container shell**:
   ```bash
   make shell-auth-service
   docker-compose -f docker-compose.dev.yml exec auth-service sh
   ```

3. **Inspect container**:
   ```bash
   docker inspect serenity-auth-service-dev
   ```

### Performance Optimization

1. **Enable BuildKit**:
   ```bash
   export DOCKER_BUILDKIT=1
   export COMPOSE_DOCKER_CLI_BUILD=1
   ```

2. **Use multi-platform builds**:
   ```bash
   docker buildx create --use
   docker buildx build --platform linux/amd64,linux/arm64 -t serenity-auth-service .
   ```

3. **Optimize images**:
   - Use Alpine base images
   - Multi-stage builds
   - Layer caching strategies

## 📚 Additional Resources

### Documentation
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [HIPAA Compliance Guide](docs/HIPAA_COMPLIANCE_CHECKLIST.md)

### Support
- Check existing GitHub issues
- Review service-specific README files
- Consult infrastructure documentation in `infrastructure/`

### Contributing
1. Follow the established Docker patterns
2. Update documentation for new services
3. Add health checks and monitoring
4. Include security scanning in builds
5. Test across all environments

---

**Security Notice**: This system processes Protected Health Information (PHI). Ensure all security measures are properly configured before production deployment.