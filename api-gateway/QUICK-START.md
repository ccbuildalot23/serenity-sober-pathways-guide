# 🚀 Serenity API Gateway Quick Start Guide

Get the Serenity API Gateway up and running in just a few minutes!

## ⚡ 5-Minute Setup

### 1. Prerequisites Check
Make sure you have:
- Docker Desktop installed and running
- 8GB+ RAM available
- Ports 8000-8002 available

### 2. Quick Start

**Windows:**
```cmd
cd C:\dev\serenity\api-gateway
scripts\start-gateway.bat
```

**Linux/macOS:**
```bash
cd /path/to/serenity/api-gateway
chmod +x scripts/start-gateway.sh
./scripts/start-gateway.sh
```

### 3. Verify Installation

Open these URLs in your browser:

- **Kong Proxy**: http://localhost:8000 ✅
- **Kong Admin**: http://localhost:8001/status ✅
- **Grafana Dashboard**: http://localhost:3001 (admin/admin) ✅
- **Health Check**: http://localhost:8090/health ✅

## 🎯 Test Your Setup

### Test API Routes

```bash
# Test auth service
curl http://localhost:8000/api/auth/health

# Test crisis service (high priority)
curl http://localhost:8000/api/crisis/health

# Test notification service
curl http://localhost:8000/api/notifications/health
```

### Test Authentication

```bash
# This should return 401 (authentication required)
curl -i http://localhost:8000/api/notifications

# This should work with proper JWT
curl -H "Authorization: Bearer your-jwt-token" \
     http://localhost:8000/api/notifications
```

### Test Health Monitoring

```bash
# Get overall system health
curl http://localhost:8090/health | jq

# Get specific service health
curl http://localhost:8090/health/crisis-service | jq
```

## 🔧 Quick Configuration

### Update Service Ports

Edit `config/kong.yml` to change backend service ports:

```yaml
services:
  - name: auth-service
    url: http://host.docker.internal:3000  # Change this port
```

### Add New Service

Add to `config/kong.yml`:

```yaml
services:
  - name: your-new-service
    url: http://host.docker.internal:9000
    routes:
      - name: new-service-routes
        paths:
          - /api/new-service
        methods: [GET, POST]
```

Then restart Kong:
```bash
docker-compose restart kong
```

## 📊 Monitoring Quick Setup

### View Metrics
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001
  - Username: `admin`
  - Password: `admin` (change on first login)

### View Logs
- **Kibana**: http://localhost:5601
- **Direct logs**: `docker-compose logs -f`

## 🚨 Crisis Service Testing

The crisis service has special handling:

```bash
# Crisis endpoints get 10x rate limit
curl http://localhost:8000/api/crisis/alert

# Emergency endpoints bypass normal routing
curl http://localhost:8000/api/emergency/help
```

## 🔒 Security Features

### Rate Limiting Test

```bash
# Test rate limiting (will eventually return 429)
for i in {1..150}; do
  curl -i http://localhost:8000/api/auth/health
  sleep 0.1
done
```

### CORS Test

```bash
# Test CORS headers
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:8000/api/auth/login
```

## 🛠️ Common Commands

### Service Management

```bash
# Start all services
./scripts/start-gateway.sh

# Stop all services
./scripts/start-gateway.sh stop

# Restart services
./scripts/start-gateway.sh restart

# View service status
./scripts/start-gateway.sh status

# View logs
./scripts/start-gateway.sh logs

# Health check
./scripts/start-gateway.sh health
```

### Individual Service Control

```bash
# Restart just Kong
docker-compose restart kong

# View Kong logs
docker-compose logs -f kong

# Scale Kong instances
docker-compose up -d --scale kong=3
```

## 🐛 Quick Troubleshooting

### Services Won't Start

```bash
# Check Docker is running
docker info

# Check port availability
netstat -an | grep :8000

# Check available memory
docker system df
```

### Kong Returns 502

```bash
# Check backend service health
curl http://localhost:3000/health  # Auth service
curl http://localhost:8000/health  # Notification service

# Check Kong can reach services
docker-compose exec kong curl http://host.docker.internal:3000/health
```

### High Memory Usage

```bash
# Check resource usage
docker stats

# Restart heavy services
docker-compose restart elasticsearch logstash
```

## 📁 Directory Structure

```
api-gateway/
├── config/
│   └── kong.yml              # Kong configuration
├── monitoring/
│   ├── prometheus.yml         # Metrics collection
│   └── grafana/              # Dashboards
├── logging/
│   ├── logstash.conf         # Log processing
│   └── logstash.yml          # Logstash config
├── scripts/
│   ├── start-gateway.sh      # Main startup script
│   └── production-setup.sh   # Production setup
├── docker-compose.yml        # Main services
├── README.md                 # Full documentation
└── DEPLOYMENT.md             # Deployment guide
```

## 🌟 What's Next?

1. **Production Setup**: Run `./scripts/production-setup.sh`
2. **SSL Configuration**: Replace self-signed certificates
3. **Monitoring Setup**: Configure alerts and notifications
4. **Backup Configuration**: Set up automated backups
5. **Security Review**: Follow security hardening checklist

## 📞 Quick Help

### Service URLs
- **Kong Proxy**: http://localhost:8000
- **Kong Admin**: http://localhost:8001
- **Kong Manager**: http://localhost:8002
- **Konga UI**: http://localhost:1337
- **Grafana**: http://localhost:3001
- **Prometheus**: http://localhost:9090
- **Kibana**: http://localhost:5601
- **Health Check**: http://localhost:8090/health

### Emergency Commands

```bash
# Stop everything
docker-compose down

# Nuclear option (remove everything)
docker-compose down -v --remove-orphans
docker system prune -af

# Fresh start
./scripts/start-gateway.sh
```

### Get Support

- **Documentation**: See README.md for full details
- **Issues**: Check logs with `docker-compose logs`
- **Health**: Visit http://localhost:8090/health
- **Monitoring**: Check http://localhost:9090 and http://localhost:3001

---

**🎉 Congratulations! Your Serenity API Gateway is now running and ready to handle HIPAA-compliant healthcare traffic with enterprise-grade security and monitoring.**

*Happy coding! 🚀*