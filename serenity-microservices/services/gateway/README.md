# Serenity API Gateway

A comprehensive, HIPAA-compliant API Gateway for the Serenity mental health and substance abuse recovery platform. Built with Node.js, TypeScript, Express, and Redis, implementing enterprise-grade patterns for microservices architecture.

## Features

### Core Functionality
- **Request Routing**: Dynamic routing to microservices with load balancing
- **Authentication & Authorization**: JWT and API key authentication with role-based access control
- **Rate Limiting**: Redis-based rate limiting with DDoS protection
- **Service Discovery**: Consul integration with health monitoring and automatic failover
- **Circuit Breaker**: Opossum-based circuit breaker pattern for resilience
- **Load Balancing**: Multiple strategies (round-robin, weighted, least connections, latency-aware)

### Advanced Features
- **Request/Response Transformation**: Data mapping and API versioning support
- **WebSocket Proxy**: Real-time communication proxy with authentication
- **File Upload**: Secure file handling with image processing and virus scanning
- **GraphQL Federation**: Apollo Federation for unified GraphQL API
- **Monitoring & Analytics**: Prometheus metrics, Jaeger tracing, comprehensive logging
- **Security**: HIPAA compliance, input validation, XSS/SQL injection protection

### HIPAA Compliance
- **Audit Logging**: Comprehensive audit trails for all PHI access
- **Encryption**: Data encryption at rest and in transit
- **Session Management**: Secure session handling with automatic timeout
- **Access Controls**: Role-based permissions and multi-factor authentication support

## Quick Start

### Prerequisites
- Node.js 18+ 
- Redis 6+
- Docker (optional)

### Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run integration tests
npm run test:integration
```

### Production Deployment
```bash
# Build for production
npm run build

# Start production server
npm start

# Or use Docker
docker-compose up -d
```

## Configuration

### Environment Variables

#### Core Settings
```bash
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
```

#### Service Discovery
```bash
SERVICE_DISCOVERY_TYPE=consul
CONSUL_HOST=localhost
CONSUL_PORT=8500
```

#### Authentication
```bash
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=1h
API_KEY_SALT=your-api-key-salt
```

#### Redis Configuration
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

#### Rate Limiting
```bash
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Monitoring
```bash
PROMETHEUS_ENABLED=true
JAEGER_ENDPOINT=http://localhost:14268/api/traces
LOG_LEVEL=info
```

See `.env.example` for complete configuration options.

## Architecture

### Service Mesh Pattern
The API Gateway implements a service mesh architecture with:

```
Client Request → API Gateway → Service Discovery → Load Balancer → Microservice
                     ↓
               Circuit Breaker → Monitoring → Logging
```

### Core Components

#### 1. Authentication & Authorization (`src/middleware/auth.ts`)
- JWT token validation with Redis session storage
- API key authentication for system-to-system communication
- Role-based access control (patient, provider, supporter, admin)
- Permission-based authorization with fine-grained controls

#### 2. Rate Limiting (`src/middleware/rateLimiter.ts`)
- Redis-based distributed rate limiting
- Multiple strategies: IP, user, API key, endpoint-based
- DDoS protection with burst and sustained limits
- Adaptive rate limiting based on system load

#### 3. Service Discovery (`src/services/serviceDiscovery.ts`)
- Consul integration for service registration and discovery
- Health check monitoring with automatic failover
- Static configuration fallback for development

#### 4. Load Balancing (`src/services/loadBalancer.ts`)
- Multiple algorithms: round-robin, weighted, least connections
- Health-aware routing
- Latency-based selection
- Connection tracking and metrics

#### 5. Circuit Breaker (`src/services/circuitBreaker.ts`)
- Automatic failure detection and recovery
- Configurable thresholds and timeouts
- Fallback response handling
- State persistence across restarts

#### 6. WebSocket Proxy (`src/services/websocketProxy.ts`)
- Real-time communication proxy
- Authentication and authorization for WebSocket connections
- Room-based message routing
- Service-specific event handling

#### 7. File Upload (`src/services/fileUpload.ts`)
- Secure file upload with validation
- Image processing and thumbnail generation
- Virus scanning integration
- Encrypted storage with metadata tracking

#### 8. Monitoring (`src/services/monitoring.ts`)
- Prometheus metrics collection
- Request/response tracking
- Performance monitoring
- Custom dashboards and alerts

## API Endpoints

### Health & Status
```bash
GET  /health           # Health check with dependencies
GET  /ready            # Readiness probe for Kubernetes
GET  /live             # Liveness probe
GET  /metrics          # Prometheus metrics
```

### Admin Endpoints (Requires admin role)
```bash
GET  /services                      # List discovered services
GET  /services/{name}/health        # Service health status
GET  /circuit-breakers              # Circuit breaker status
POST /circuit-breakers/{service}/reset  # Reset circuit breaker
GET  /dashboard                     # Monitoring dashboard data
```

### File Management (Requires authentication)
```bash
POST /upload/single        # Upload single file
POST /upload/multiple      # Upload multiple files
GET  /files/{fileId}       # Download file
DELETE /files/{fileId}     # Delete file
```

### Dynamic Service Routes
All API routes are dynamically configured based on the services configuration:

```typescript
// Example: Routes to user-service
GET    /api/v1/users/*       → user-service
POST   /api/v1/auth/*        → user-service
PUT    /api/v1/profiles/*    → user-service

// Example: Routes to crisis-service  
POST   /api/v1/crisis/*      → crisis-service
GET    /api/v1/emergency/*   → crisis-service
```

## WebSocket Support

### Connection
```javascript
const socket = io('ws://localhost:3000/ws', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events
```javascript
// Join a room
socket.emit('join_room', 'crisis-support');

// Subscribe to service events
socket.emit('subscribe_service', 'crisis-service');

// Send crisis alert
socket.emit('crisis:alert', {
  level: 'high',
  message: 'Emergency assistance needed'
});

// Listen for notifications
socket.on('notification', (data) => {
  console.log('New notification:', data);
});
```

## GraphQL Federation

When enabled, the gateway provides a unified GraphQL endpoint that federates multiple service schemas:

```bash
# GraphQL endpoint
POST /graphql

# GraphQL Playground (development only)
GET /graphql
```

### Example Query
```graphql
query GetUserWithCheckins($userId: ID!) {
  user(id: $userId) {
    id
    email
    profile {
      name
      avatar
    }
    checkins(limit: 10) {
      id
      mood
      anxiety
      createdAt
    }
  }
}
```

## Security Features

### Input Validation
- Request size limits
- Path traversal protection
- SQL injection prevention
- XSS protection
- Content type validation

### Rate Limiting
- Global rate limits
- Per-user rate limits
- Per-API key rate limits
- DDoS protection
- Adaptive limiting

### HIPAA Compliance
- PHI data encryption
- Audit logging
- Session timeout
- Secure headers
- Access controls

### Example Security Headers
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
```

## Monitoring & Observability

### Prometheus Metrics
- HTTP request duration and count
- Circuit breaker state
- Service health status
- Rate limit hits
- WebSocket connections
- File upload metrics

### Jaeger Tracing
- Distributed request tracing
- Service dependency mapping
- Performance bottleneck identification

### Logging
- Structured JSON logging
- Request/response logging
- Security event logging
- Performance logging
- Error tracking

### Dashboard
The gateway provides a monitoring dashboard at `/dashboard` (admin only) with:
- Real-time metrics
- Service health status
- Circuit breaker states
- Error rates and trends

## Docker Deployment

### Production
```bash
# Build and run
docker-compose up -d

# Scale gateway instances
docker-compose up -d --scale gateway=3
```

### Development
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f gateway-dev
```

### Health Checks
All containers include health checks:
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node scripts/health-check.js
```

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Load Testing
```bash
# Using artillery (install globally)
artillery run tests/load/gateway-load-test.yml
```

### Test Coverage
```bash
npm run test:coverage
```

## Performance

### Benchmarks
- **Throughput**: 10,000+ requests/second
- **Latency**: P99 < 100ms for simple requests
- **Memory**: ~256MB baseline usage
- **CPU**: ~0.5 cores under normal load

### Optimization
- Connection pooling for downstream services
- Response caching for static data
- Compression for large responses
- Keep-alive connections
- Efficient JSON parsing

## Troubleshooting

### Common Issues

#### High Memory Usage
```bash
# Check memory metrics
curl http://localhost:3000/metrics | grep nodejs_memory

# Restart if needed
docker-compose restart gateway
```

#### Service Discovery Issues
```bash
# Check Consul
curl http://localhost:8500/v1/health/state/any

# Check service registration
curl http://localhost:8500/v1/agent/services
```

#### Rate Limiting Problems
```bash
# Check Redis
redis-cli ping

# View rate limit keys
redis-cli keys "rate_limit:*"
```

#### Circuit Breaker Stuck Open
```bash
# Check circuit breaker status
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/circuit-breakers

# Reset circuit breaker
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/circuit-breakers/user-service/reset
```

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=debug
export DEBUG=serenity:*

# Start with debugging
npm run dev
```

### Health Check Script
```bash
# Manual health check
node scripts/health-check.js
```

## Development

### Adding New Services
1. Add service configuration in `src/config/index.ts`
2. Add routes in the `routes` array
3. Update load balancer configuration
4. Add health checks
5. Update documentation

### Custom Middleware
```typescript
// src/middleware/custom.ts
export const customMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Your custom logic
  next();
};

// Add to server.ts
app.use(customMiddleware);
```

### Adding Metrics
```typescript
// In your service
import { monitoringService } from '@services/monitoring';

// Record custom metric
monitoringService.recordCustomMetric('custom_operation_count', 1, {
  operation: 'example',
  status: 'success'
});
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Update documentation
6. Submit a pull request

### Code Style
- Use TypeScript strict mode
- Follow ESLint configuration
- Add JSDoc comments for public APIs
- Write tests for new features

## License

This project is licensed under a proprietary license. See LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation wiki

---

**Security Notice**: This gateway handles PHI (Protected Health Information) and must comply with HIPAA regulations. Always follow security best practices and conduct regular security audits.