#!/bin/bash

# Serenity API Gateway Startup Script
# This script initializes and starts the Kong API Gateway with all dependencies

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"
ENV_FILE="$PROJECT_DIR/.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker is not running. Please start Docker first."
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not available. Please install Docker Compose."
    fi
    
    # Check if required ports are available
    local ports=(8000 8001 8002 8443 1337 9090 3001 5601 9200)
    for port in "${ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null; then
            warn "Port $port is already in use. This may cause conflicts."
        fi
    done
    
    log "Prerequisites check completed."
}

# Setup environment
setup_environment() {
    log "Setting up environment..."
    
    # Create .env file if it doesn't exist
    if [ ! -f "$ENV_FILE" ]; then
        info "Creating environment file..."
        cat > "$ENV_FILE" << EOF
# Serenity API Gateway Environment Configuration
COMPOSE_PROJECT_NAME=serenity-gateway

# Kong Configuration
KONG_PG_PASSWORD=kong_password_$(openssl rand -hex 16)
KONG_REDIS_PASSWORD=redis_password_$(openssl rand -hex 16)

# Grafana Configuration
GF_SECURITY_ADMIN_PASSWORD=admin_password_$(openssl rand -hex 16)

# Alert Webhook Token
ALERT_WEBHOOK_TOKEN=$(openssl rand -hex 32)

# Environment
ENVIRONMENT=production
LOG_LEVEL=info

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
EOF
        log "Environment file created at $ENV_FILE"
    else
        info "Using existing environment file."
    fi
    
    # Create necessary directories
    mkdir -p "$PROJECT_DIR/logs"
    mkdir -p "$PROJECT_DIR/data"
    
    # Set proper permissions
    chmod 755 "$PROJECT_DIR/logs"
    chmod 755 "$PROJECT_DIR/data"
    
    log "Environment setup completed."
}

# Validate configuration
validate_configuration() {
    log "Validating configuration..."
    
    # Check if Kong configuration exists
    if [ ! -f "$PROJECT_DIR/config/kong.yml" ]; then
        error "Kong configuration file not found at $PROJECT_DIR/config/kong.yml"
    fi
    
    # Validate Kong configuration syntax
    if command -v kong &> /dev/null; then
        info "Validating Kong configuration syntax..."
        # This would require Kong CLI to be installed locally
        # kong config parse "$PROJECT_DIR/config/kong.yml"
    fi
    
    # Check if required configuration files exist
    local required_files=(
        "$PROJECT_DIR/monitoring/prometheus.yml"
        "$PROJECT_DIR/logging/logstash.conf"
        "$PROJECT_DIR/health-checker/package.json"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            error "Required configuration file not found: $file"
        fi
    done
    
    log "Configuration validation completed."
}

# Start services
start_services() {
    log "Starting Serenity API Gateway services..."
    
    cd "$PROJECT_DIR"
    
    # Check if services are already running
    if docker-compose ps | grep -q "Up"; then
        warn "Some services are already running. Stopping them first..."
        docker-compose down
    fi
    
    # Pull latest images
    info "Pulling latest Docker images..."
    docker-compose pull
    
    # Start infrastructure services first
    info "Starting infrastructure services (databases, cache)..."
    docker-compose up -d kong-database kong-redis elasticsearch
    
    # Wait for databases to be ready
    info "Waiting for databases to initialize..."
    sleep 30
    
    # Run Kong migrations
    info "Running Kong database migrations..."
    docker-compose run --rm kong-migration
    
    # Start Kong
    info "Starting Kong API Gateway..."
    docker-compose up -d kong
    
    # Wait for Kong to be ready
    info "Waiting for Kong to be ready..."
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:8001/status > /dev/null; then
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        error "Kong failed to start within expected time"
    fi
    
    # Start remaining services
    info "Starting monitoring and logging services..."
    docker-compose up -d prometheus grafana logstash kibana
    
    # Start health checker
    info "Starting health checker service..."
    docker-compose up -d health-checker
    
    # Start admin UI
    info "Starting Kong admin UI..."
    docker-compose up -d konga
    
    # Start circuit breaker
    info "Starting circuit breaker..."
    docker-compose up -d circuit-breaker
    
    log "All services started successfully!"
}

# Health check
health_check() {
    log "Performing health check..."
    
    local services=(
        "Kong Gateway:http://localhost:8001/status:Kong is running"
        "Kong Proxy:http://localhost:8000:should return service response"
        "Konga UI:http://localhost:1337:Web UI should be accessible"
        "Prometheus:http://localhost:9090/-/healthy:Prometheus should be ready"
        "Grafana:http://localhost:3001/api/health:Grafana should be healthy"
        "Health Checker:http://localhost:8090/health:Health aggregator should be running"
    )
    
    local failed=0
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r name url description <<< "$service_info"
        
        info "Checking $name..."
        if curl -s -f "$url" > /dev/null; then
            log "$name is healthy"
        else
            error_msg="$name failed health check"
            warn "$error_msg"
            failed=$((failed + 1))
        fi
    done
    
    if [ $failed -eq 0 ]; then
        log "All services are healthy!"
    else
        warn "$failed service(s) failed health check"
    fi
    
    # Display service URLs
    cat << EOF

${GREEN}=== Serenity API Gateway Services ===${NC}
${BLUE}Kong Proxy:${NC}         http://localhost:8000
${BLUE}Kong Admin API:${NC}     http://localhost:8001
${BLUE}Kong Manager UI:${NC}    http://localhost:8002
${BLUE}Konga Admin UI:${NC}     http://localhost:1337
${BLUE}Prometheus:${NC}         http://localhost:9090
${BLUE}Grafana:${NC}            http://localhost:3001 (admin/admin)
${BLUE}Kibana:${NC}             http://localhost:5601
${BLUE}Health Checker:${NC}     http://localhost:8090/health

${YELLOW}API Routes:${NC}
${BLUE}Auth Service:${NC}       http://localhost:8000/api/auth
${BLUE}Notification:${NC}       http://localhost:8000/api/notifications  
${BLUE}Crisis Service:${NC}     http://localhost:8000/api/crisis
${BLUE}Frontend App:${NC}       http://localhost:8000/

EOF
}

# Main execution
main() {
    log "Starting Serenity API Gateway initialization..."
    
    check_prerequisites
    setup_environment
    validate_configuration
    start_services
    
    # Wait a moment for services to stabilize
    sleep 10
    
    health_check
    
    log "Serenity API Gateway startup completed successfully!"
    info "Use '$0 stop' to stop all services"
    info "Use '$0 logs' to view logs"
    info "Use '$0 status' to check service status"
}

# Handle script arguments
case "${1:-start}" in
    start)
        main
        ;;
    stop)
        log "Stopping Serenity API Gateway services..."
        cd "$PROJECT_DIR"
        docker-compose down
        log "All services stopped."
        ;;
    restart)
        log "Restarting Serenity API Gateway services..."
        cd "$PROJECT_DIR"
        docker-compose restart
        sleep 10
        health_check
        ;;
    status)
        log "Checking service status..."
        cd "$PROJECT_DIR"
        docker-compose ps
        ;;
    logs)
        log "Showing recent logs..."
        cd "$PROJECT_DIR"
        docker-compose logs --tail=100 -f
        ;;
    health)
        health_check
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|health}"
        echo "  start   - Start all gateway services (default)"
        echo "  stop    - Stop all gateway services" 
        echo "  restart - Restart all gateway services"
        echo "  status  - Show service status"
        echo "  logs    - Show and follow logs"
        echo "  health  - Perform health check"
        exit 1
        ;;
esac