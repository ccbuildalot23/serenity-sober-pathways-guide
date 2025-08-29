# Serenity Crisis Service

A production-ready, ultra-low latency crisis response service for the Serenity mental health platform. Built with Go for sub-500ms response times and Byzantine fault-tolerant consensus.

## Features

### Core Crisis Response
- **One-tap crisis button** with instant <500ms response
- **Voice-activated crisis detection** with ML-powered transcript analysis
- **Automated crisis triage** and severity assessment (1-5 levels)
- **Real-time crisis state management** with Redis caching
- **WebSocket real-time communication** for instant alerts

### Emergency Contact Escalation
- **Multi-tier escalation workflows** with configurable delay/timeout
- **Parallel and sequential contact strategies**
- **Smart availability scheduling** with timezone support
- **Response tracking and retry logic**
- **Automatic escalation on timeout/non-response**

### GPS Location Tracking
- **Real-time location tracking** for emergency responders
- **Emergency zone detection** with automatic dispatch
- **Geofence monitoring** with violation alerts
- **Location history and accuracy validation**
- **Privacy-compliant location sharing**

### Emergency Services Integration
- **911 dispatch system integration** via webhooks
- **Crisis hotline connectivity** (988 National Suicide Prevention Lifeline)
- **Mental health services referral** system
- **Emergency responder dispatch** with ETA tracking

### Crisis Intervention Protocols
- **Guided response protocols** with step-by-step interventions
- **Automated safety assessments** 
- **Crisis counselor connectivity**
- **De-escalation script delivery**
- **Intervention effectiveness tracking**

### Post-Crisis Follow-up
- **Automated follow-up task scheduling**
- **Check-in reminders** with smart timing
- **Appointment booking integration**
- **Resource referral system**
- **Recovery progress tracking**

### Advanced Features
- **Byzantine fault-tolerant consensus** for critical decisions
- **Priority message queuing** with Redis sorted sets
- **HIPAA-compliant audit logging** 
- **End-to-end encryption** for PHI data
- **Performance monitoring** with sub-500ms targets
- **Multi-device synchronization**

## Architecture

### Technology Stack
- **Backend**: Go 1.21+ with Gin web framework
- **Database**: PostgreSQL 15+ with optimized indexes
- **Cache/Queue**: Redis 7+ with pub/sub messaging  
- **Real-time**: WebSocket with connection pooling
- **Notifications**: Twilio (SMS/Voice) + SendGrid (Email)
- **Monitoring**: Prometheus + Grafana
- **Deployment**: Docker + Docker Compose

### Performance Specifications
- **Response Time**: <500ms for critical alerts
- **Throughput**: 10,000+ concurrent users
- **Availability**: 99.99% uptime requirement
- **Scalability**: Horizontal scaling with load balancing
- **Data Recovery**: <15 minutes RTO, <5 minutes RPO

## Quick Start

### Prerequisites
- Go 1.21+
- Docker and Docker Compose
- PostgreSQL 15+
- Redis 7+

### Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd crisis-service
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start services with Docker:**
```bash
docker-compose up -d
```

4. **Run database migrations:**
```bash
go run cmd/server/main.go migrate
```

5. **Start the service:**
```bash
go run cmd/server/main.go
```

The service will be available at `http://localhost:8080`

### Configuration

Key environment variables:

```bash
# Server
SERVER_PORT=8080
SERVER_HOST=0.0.0.0

# Database
DATABASE_URL=postgres://crisis_user:crisis_pass@localhost:5432/crisis_db
REDIS_URL=redis://localhost:6379/0

# Crisis Service
CRISIS_CRITICAL_RESPONSE_TIME=500ms
CRISIS_ESCALATION_TIMEOUT=2m
CRISIS_CONSENSUS_NODES=3

# External Services
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
SENDGRID_API_KEY=your_sendgrid_api_key

# Security
SECURITY_JWT_SECRET=your-super-secret-jwt-key
SECURITY_ENCRYPTION_KEY=your-32-byte-encryption-key
```

## API Documentation

### Authentication
All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Core Endpoints

#### Crisis Management
```http
POST   /api/v1/crisis/trigger              # Trigger manual crisis
POST   /api/v1/crisis/voice-analysis       # Analyze voice for crisis
POST   /api/v1/crisis/pattern-analysis     # Analyze behavioral patterns
GET    /api/v1/crisis/{id}                 # Get crisis details
PUT    /api/v1/crisis/{id}/status          # Update crisis status
POST   /api/v1/crisis/{id}/escalate        # Escalate crisis
```

#### Location Tracking
```http
POST   /api/v1/location/start-tracking     # Start GPS tracking
PUT    /api/v1/location/update             # Update location
DELETE /api/v1/location/stop-tracking/{id} # Stop tracking
GET    /api/v1/location/sessions           # Get tracking sessions
```

#### Emergency Services
```http
POST   /api/v1/emergency/911               # Contact 911
POST   /api/v1/emergency/crisis-hotline    # Contact crisis hotline  
POST   /api/v1/emergency/mental-health-services # Contact mental health services
```

### WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:8080/ws?token=JWT_TOKEN');

ws.onmessage = function(event) {
    const message = JSON.parse(event.data);
    switch(message.type) {
        case 'crisis_alert':
            // Handle crisis alert
            break;
        case 'location_update':
            // Handle location update
            break;
        case 'status_update':
            // Handle status update
            break;
    }
};

// Send crisis trigger
ws.send(JSON.stringify({
    type: 'crisis_button',
    data: {
        location: { latitude: 40.7128, longitude: -74.0060 },
        user_message: 'Need help now'
    }
}));
```

## Development

### Project Structure
```
crisis-service/
├── cmd/server/          # Application entrypoint
├── config/              # Configuration management
├── internal/            # Internal packages
│   ├── crisis/         # Crisis detection and management
│   ├── database/       # Database clients (PostgreSQL, Redis)
│   ├── escalation/     # Emergency contact workflows
│   ├── location/       # GPS tracking and emergency zones
│   ├── notifications/  # SMS, email, voice notifications
│   └── websocket/      # Real-time WebSocket communication
├── pkg/                # Public packages
│   ├── handlers/       # HTTP request handlers
│   └── middleware/     # HTTP middleware (auth, security, HIPAA)
├── migrations/         # Database migration files
├── tests/              # Test files
└── scripts/            # Utility scripts
```

### Running Tests
```bash
# Unit tests
go test ./...

# Integration tests
go test -tags=integration ./...

# Performance benchmarks
go test -bench=. ./...

# Coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### Building for Production
```bash
# Build binary
go build -o crisis-service ./cmd/server

# Build Docker image
docker build -t serenity/crisis-service .

# Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

## Security & Compliance

### HIPAA Compliance
- **Audit logging** for all PHI access
- **Encryption at rest** for sensitive data
- **Encryption in transit** with TLS 1.3+
- **Access controls** with role-based permissions
- **Data retention policies** (7 years default)
- **Breach detection** and notification

### Security Features
- **JWT authentication** with short-lived tokens
- **Rate limiting** to prevent abuse
- **CORS protection** for web clients
- **SQL injection prevention** with parameterized queries
- **XSS protection** with content security policy
- **IP whitelisting** for admin endpoints

## Monitoring & Observability

### Metrics
- Crisis response times (<500ms target)
- Escalation workflow success rates
- Location tracking accuracy
- WebSocket connection health
- Database query performance
- Error rates and types

### Health Checks
- `GET /health` - Basic service health
- `GET /health/ready` - Readiness probe  
- `GET /health/live` - Liveness probe
- `GET /metrics` - Prometheus metrics

### Logging
Structured JSON logging with correlation IDs:
- Crisis events and responses
- PHI access audit trails
- Emergency service interactions
- Performance metrics
- Error traces and debugging

## Deployment

### Docker Compose (Development)
```bash
docker-compose up -d
```

### Kubernetes (Production)
```bash
kubectl apply -f k8s/
```

### Environment Variables
See `.env.example` for complete configuration options.

## Performance Tuning

### Database Optimization
- Connection pooling (25 max connections)
- Query optimization with EXPLAIN ANALYZE
- Index optimization for crisis queries
- Read replicas for analytics

### Redis Configuration  
- Memory optimization (128MB limit)
- Persistence with AOF
- Connection pooling (10 connections)
- Pub/sub for real-time messaging

### Go Application
- Goroutine pools for concurrent processing
- Memory pooling for high-throughput operations
- Context-based cancellation
- Graceful shutdown handling

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Standards
- Go formatting with `gofmt`
- Linting with `golangci-lint`
- 80%+ test coverage required
- Security scan with `gosec`

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- **Email**: support@serenity.com
- **Emergency**: Call 911 or text 988
- **Documentation**: https://docs.serenity.com
- **Status Page**: https://status.serenity.com

---

**⚠️ CRITICAL SAFETY NOTICE**: This system handles life-threatening emergencies. All changes must undergo thorough testing and security review before deployment to production.