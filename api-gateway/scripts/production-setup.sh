#!/bin/bash

# Serenity API Gateway Production Setup Script
# Configures the gateway for production deployment with enhanced security

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"; }
warn() { echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"; exit 1; }
info() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"; }

# Generate secure passwords
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Setup production environment
setup_production_env() {
    log "Setting up production environment configuration..."
    
    local prod_env_file="$PROJECT_DIR/.env.production"
    
    # Generate secure credentials
    local kong_db_password=$(generate_password)
    local redis_password=$(generate_password) 
    local grafana_password=$(generate_password)
    local webhook_token=$(openssl rand -hex 32)
    local jwt_secret=$(openssl rand -hex 32)
    local api_key=$(openssl rand -hex 32)
    
    cat > "$prod_env_file" << EOF
# Serenity API Gateway Production Environment
COMPOSE_PROJECT_NAME=serenity-gateway-prod
ENVIRONMENT=production

# Security Configuration
JWT_SECRET_KEY=${jwt_secret}
API_KEY_SECRET=${api_key}

# Database Configuration
KONG_PG_HOST=kong-database
KONG_PG_USER=kong
KONG_PG_PASSWORD=${kong_db_password}
KONG_PG_DATABASE=kong
POSTGRES_USER=kong
POSTGRES_PASSWORD=${kong_db_password}
POSTGRES_DB=kong

# Redis Configuration  
KONG_REDIS_HOST=kong-redis
KONG_REDIS_PORT=6379
KONG_REDIS_PASSWORD=${redis_password}
REDIS_PASSWORD=${redis_password}

# Kong Configuration
KONG_DATABASE=postgres
KONG_PROXY_LISTEN=0.0.0.0:8000
KONG_PROXY_LISTEN_SSL=0.0.0.0:8443 ssl
KONG_ADMIN_LISTEN=0.0.0.0:8001
KONG_ADMIN_GUI_LISTEN=0.0.0.0:8002
KONG_PLUGINS=bundled,jwt-auth-extended,rate-limit-extended,security-headers
KONG_LOG_LEVEL=warn
KONG_WORKER_PROCESSES=auto

# Grafana Configuration
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=${grafana_password}
GF_USERS_ALLOW_SIGN_UP=false
GF_SECURITY_SECRET_KEY=${webhook_token}

# Monitoring Configuration
PROMETHEUS_RETENTION_TIME=365d
GRAFANA_PLUGINS=grafana-clock-panel,grafana-simple-json-datasource

# Logging Configuration
ELASTICSEARCH_JAVA_OPTS=-Xms2g -Xmx2g
LOGSTASH_JAVA_OPTS=-Xms1g -Xmx1g

# Alert Configuration
ALERT_WEBHOOK_TOKEN=${webhook_token}
SMTP_HOST=smtp.serenity.app
SMTP_PORT=587
SMTP_USER=alerts@serenity.app
SMTP_FROM=alerts@serenity.app

# Network Configuration
KONG_PROXY_HTTP_PORT=8000
KONG_PROXY_HTTPS_PORT=8443
KONG_ADMIN_PORT=8001
KONG_MANAGER_PORT=8002
KONGA_PORT=1337
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
KIBANA_PORT=5601
ELASTICSEARCH_PORT=9200
HEALTH_CHECKER_PORT=8090

# HIPAA Compliance
AUDIT_LOG_ENABLED=true
ENCRYPTION_AT_REST=true
SESSION_TIMEOUT=900
DATA_RETENTION_DAYS=2555

# Performance Tuning
WORKER_CONNECTIONS=4096
MAX_BODY_SIZE=10m
PROXY_CACHE_TTL=300

# SSL/TLS Configuration
SSL_CERT_PATH=/etc/ssl/certs/serenity.crt
SSL_KEY_PATH=/etc/ssl/private/serenity.key
SSL_PROTOCOLS=TLSv1.2 TLSv1.3
SSL_CIPHERS=ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256

# Backup Configuration
BACKUP_RETENTION_DAYS=30
BACKUP_SCHEDULE="0 2 * * *"
EOF
    
    # Create secrets file for sensitive data
    local secrets_file="$PROJECT_DIR/.secrets"
    cat > "$secrets_file" << EOF
# Serenity API Gateway Secrets (Keep Secure!)
DB_PASSWORD=${kong_db_password}
REDIS_PASSWORD=${redis_password}
GRAFANA_PASSWORD=${grafana_password}
JWT_SECRET=${jwt_secret}
API_KEY=${api_key}
WEBHOOK_TOKEN=${webhook_token}
EOF
    
    # Secure the files
    chmod 600 "$prod_env_file" "$secrets_file"
    
    log "Production environment configuration created."
    info "Secrets stored in $secrets_file (keep secure!)"
    info "Grafana admin password: ${grafana_password}"
}

# Setup SSL certificates
setup_ssl_certificates() {
    log "Setting up SSL certificates..."
    
    local ssl_dir="$PROJECT_DIR/ssl"
    mkdir -p "$ssl_dir"
    
    # Check if certificates already exist
    if [ -f "$ssl_dir/serenity.crt" ] && [ -f "$ssl_dir/serenity.key" ]; then
        info "SSL certificates already exist."
        return
    fi
    
    # Generate self-signed certificates for development/testing
    # In production, replace with real certificates from CA
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$ssl_dir/serenity.key" \
        -out "$ssl_dir/serenity.crt" \
        -config <(
            echo '[dn]'
            echo 'CN=serenity.local'
            echo '[req]'
            echo 'distinguished_name = dn'
            echo '[EXT]'
            echo 'subjectAltName=DNS:serenity.local,DNS:*.serenity.local,DNS:localhost,IP:127.0.0.1'
            echo 'keyUsage=keyEncipherment,dataEncipherment'
            echo 'extendedKeyUsage=serverAuth'
        ) -extensions EXT
    
    chmod 600 "$ssl_dir/serenity.key"
    chmod 644 "$ssl_dir/serenity.crt"
    
    log "SSL certificates generated."
    warn "Using self-signed certificates. Replace with CA-signed certificates in production."
}

# Setup production Docker Compose override
setup_production_compose() {
    log "Creating production Docker Compose override..."
    
    cat > "$PROJECT_DIR/docker-compose.prod.yml" << 'EOF'
version: '3.8'

services:
  kong:
    environment:
      KONG_LOG_LEVEL: warn
      KONG_WORKER_PROCESSES: auto
      KONG_WORKER_CONNECTIONS: 4096
      KONG_PROXY_ACCESS_LOG: /dev/stdout
      KONG_ADMIN_ACCESS_LOG: /dev/stdout
      KONG_PROXY_ERROR_LOG: /dev/stderr
      KONG_ADMIN_ERROR_LOG: /dev/stderr
    volumes:
      - ./ssl:/etc/ssl/certs:ro
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2'
        reservations:
          memory: 1G
          cpus: '1'
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "kong", "health"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s

  kong-database:
    environment:
      POSTGRES_INITDB_ARGS: "--data-checksums"
    volumes:
      - kong-db-data:/var/lib/postgresql/data
      - ./backups:/backups
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2'
        reservations:
          memory: 512M
          cpus: '0.5'
    restart: unless-stopped
    command: >
      postgres 
      -c max_connections=200
      -c shared_buffers=256MB
      -c effective_cache_size=1GB
      -c maintenance_work_mem=64MB
      -c checkpoint_completion_target=0.9
      -c wal_buffers=16MB
      -c default_statistics_target=100
      -c random_page_cost=1.1
      -c effective_io_concurrency=200

  kong-redis:
    command: >
      redis-server 
      --requirepass ${REDIS_PASSWORD}
      --appendonly yes
      --appendfsync everysec
      --maxmemory 1gb
      --maxmemory-policy allkeys-lru
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1'
        reservations:
          memory: 256M
          cpus: '0.25'
    restart: unless-stopped

  prometheus:
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=365d'
      - '--web.enable-lifecycle'
      - '--storage.tsdb.retention.size=50GB'
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2'
        reservations:
          memory: 1G
          cpus: '0.5'
    restart: unless-stopped

  grafana:
    environment:
      GF_INSTALL_PLUGINS: grafana-clock-panel,grafana-simple-json-datasource
      GF_SECURITY_ADMIN_USER: ${GF_SECURITY_ADMIN_USER}
      GF_SECURITY_ADMIN_PASSWORD: ${GF_SECURITY_ADMIN_PASSWORD}
      GF_USERS_ALLOW_SIGN_UP: false
      GF_SECURITY_SECRET_KEY: ${GF_SECURITY_SECRET_KEY}
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1'
        reservations:
          memory: 512M
          cpus: '0.25'
    restart: unless-stopped

  elasticsearch:
    environment:
      ES_JAVA_OPTS: "-Xms2g -Xmx2g"
      discovery.type: single-node
      xpack.security.enabled: false
      cluster.routing.allocation.disk.threshold_enabled: false
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2'
        reservations:
          memory: 2G
          cpus: '1'
    restart: unless-stopped
    ulimits:
      memlock:
        soft: -1
        hard: -1
      nofile:
        soft: 65536
        hard: 65536

  logstash:
    environment:
      LS_JAVA_OPTS: "-Xms1g -Xmx1g"
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1'
        reservations:
          memory: 1G
          cpus: '0.5'
    restart: unless-stopped

  health-checker:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    restart: unless-stopped

volumes:
  kong-db-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ${PWD}/data/postgres
  kong-redis-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ${PWD}/data/redis
  prometheus-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ${PWD}/data/prometheus
  grafana-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ${PWD}/data/grafana
  elasticsearch-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ${PWD}/data/elasticsearch
EOF

    log "Production Docker Compose override created."
}

# Setup backup scripts
setup_backup_scripts() {
    log "Setting up backup scripts..."
    
    local backup_dir="$PROJECT_DIR/scripts/backup"
    mkdir -p "$backup_dir"
    
    # Database backup script
    cat > "$backup_dir/backup-database.sh" << 'EOF'
#!/bin/bash
# Database backup script

set -e

BACKUP_DIR="/backups/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

# Backup Kong PostgreSQL database
docker-compose exec -T kong-database pg_dump -U kong kong > "$BACKUP_DIR/kong-$(date +%H%M%S).sql"

# Backup Redis data
docker-compose exec -T kong-redis redis-cli --rdb /data/dump.rdb
docker cp serenity-gateway_kong-redis_1:/data/dump.rdb "$BACKUP_DIR/redis-$(date +%H%M%S).rdb"

# Compress backups
tar -czf "$BACKUP_DIR.tar.gz" -C "$(dirname $BACKUP_DIR)" "$(basename $BACKUP_DIR)"
rm -rf "$BACKUP_DIR"

# Clean up old backups (keep 30 days)
find /backups -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR.tar.gz"
EOF

    # Configuration backup script
    cat > "$backup_dir/backup-config.sh" << 'EOF'
#!/bin/bash
# Configuration backup script

set -e

BACKUP_DIR="/backups/config/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

# Backup Kong configuration
cp -r /kong/declarative "$BACKUP_DIR/"

# Backup monitoring configuration
cp -r /etc/prometheus "$BACKUP_DIR/"
cp -r /etc/grafana "$BACKUP_DIR/"

# Backup SSL certificates
cp -r /etc/ssl "$BACKUP_DIR/"

# Compress backup
tar -czf "$BACKUP_DIR.tar.gz" -C "$(dirname $BACKUP_DIR)" "$(basename $BACKUP_DIR)"
rm -rf "$BACKUP_DIR"

echo "Configuration backup completed: $BACKUP_DIR.tar.gz"
EOF

    chmod +x "$backup_dir"/*.sh
    
    log "Backup scripts created."
}

# Setup monitoring alerts
setup_monitoring_alerts() {
    log "Setting up monitoring alerts..."
    
    # Create alertmanager configuration
    local alert_dir="$PROJECT_DIR/monitoring/alertmanager"
    mkdir -p "$alert_dir"
    
    cat > "$alert_dir/alertmanager.yml" << 'EOF'
global:
  smtp_smarthost: '${SMTP_HOST}:${SMTP_PORT}'
  smtp_from: '${SMTP_FROM}'
  smtp_auth_username: '${SMTP_USER}'
  smtp_auth_password: '${SMTP_PASSWORD}'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'
  routes:
  - match:
      severity: critical
    receiver: 'critical-alerts'
  - match:
      team: serenity-security
    receiver: 'security-alerts'

receivers:
- name: 'web.hook'
  webhook_configs:
  - url: 'http://kong:8000/api/v1/notifications/alerts'
    http_config:
      bearer_token: '${ALERT_WEBHOOK_TOKEN}'

- name: 'critical-alerts'
  email_configs:
  - to: 'ops-critical@serenity.app'
    subject: 'CRITICAL: {{ .GroupLabels.alertname }}'
    body: |
      Alert: {{ .GroupLabels.alertname }}
      Description: {{ range .Alerts }}{{ .Annotations.description }}{{ end }}
      Time: {{ .CommonAnnotations.runbook_url }}
  webhook_configs:
  - url: 'http://kong:8000/api/v1/notifications/critical-alerts'
    http_config:
      bearer_token: '${ALERT_WEBHOOK_TOKEN}'

- name: 'security-alerts'
  email_configs:
  - to: 'security@serenity.app'
    subject: 'SECURITY: {{ .GroupLabels.alertname }}'
    body: |
      Security Alert: {{ .GroupLabels.alertname }}
      Description: {{ range .Alerts }}{{ .Annotations.description }}{{ end }}
      Time: {{ .CommonAnnotations.runbook_url }}
EOF
    
    log "Monitoring alerts configured."
}

# Setup log rotation
setup_log_rotation() {
    log "Setting up log rotation..."
    
    cat > "$PROJECT_DIR/logrotate.conf" << 'EOF'
/var/log/serenity/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
    postrotate
        docker-compose restart logstash
    endscript
}

/var/log/kong/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
    postrotate
        docker-compose restart kong
    endscript
}
EOF
    
    log "Log rotation configured."
}

# Setup system monitoring
setup_system_monitoring() {
    log "Setting up system monitoring..."
    
    # Add system metrics collection
    cat >> "$PROJECT_DIR/docker-compose.prod.yml" << 'EOF'

  node-exporter:
    image: prom/node-exporter:latest
    container_name: serenity-node-exporter
    command:
      - '--path.rootfs=/host'
      - '--collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc)($$|/)'
    ports:
      - "9100:9100"
    volumes:
      - '/:/host:ro'
    networks:
      - kong-net
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.25'

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: serenity-cadvisor
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:rw
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    networks:
      - kong-net
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
EOF
    
    log "System monitoring configured."
}

# Main execution
main() {
    log "Setting up Serenity API Gateway for production..."
    
    # Create necessary directories
    mkdir -p "$PROJECT_DIR/data/postgres"
    mkdir -p "$PROJECT_DIR/data/redis"
    mkdir -p "$PROJECT_DIR/data/prometheus"
    mkdir -p "$PROJECT_DIR/data/grafana"
    mkdir -p "$PROJECT_DIR/data/elasticsearch"
    mkdir -p "$PROJECT_DIR/backups"
    
    setup_production_env
    setup_ssl_certificates
    setup_production_compose
    setup_backup_scripts
    setup_monitoring_alerts
    setup_log_rotation
    setup_system_monitoring
    
    # Set proper permissions
    chmod -R 755 "$PROJECT_DIR/data"
    chmod -R 755 "$PROJECT_DIR/backups"
    
    log "Production setup completed successfully!"
    
    cat << EOF

${GREEN}=== Production Setup Complete ===${NC}

${BLUE}Next Steps:${NC}
1. Review and customize .env.production file
2. Replace self-signed certificates with CA-signed certificates
3. Configure SMTP settings for alerts
4. Set up automated backups with cron
5. Configure firewall rules for security
6. Start services with: docker-compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d

${YELLOW}Security Reminders:${NC}
- Change default passwords in .secrets file
- Restrict access to admin interfaces
- Enable firewall on production servers
- Set up VPN access for admin operations
- Regular security updates and patches

${BLUE}Files Created:${NC}
- .env.production (production environment)
- .secrets (sensitive credentials)
- docker-compose.prod.yml (production overrides)
- ssl/serenity.crt & ssl/serenity.key (SSL certificates)
- scripts/backup/ (backup scripts)
- monitoring/alertmanager/alertmanager.yml (alert configuration)

EOF
}

# Execute main function
main "$@"