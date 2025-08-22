# Serenity Security Service

A HIPAA-compliant security and audit logging microservice for the Serenity platform. This service provides comprehensive audit logging, security event monitoring, and encryption capabilities for healthcare applications.

## Features

- **HIPAA-Compliant Audit Logging**: Complete audit trail for all system activities
- **Encryption**: End-to-end encryption for sensitive data including PHI
- **Rate Limiting**: Adaptive rate limiting with emergency bypass capabilities
- **Authentication**: JWT and API key authentication with role-based access control
- **Input Validation**: Comprehensive input validation and sanitization
- **Health Monitoring**: Kubernetes-ready health checks and monitoring
- **Real-time Security Events**: Automatic security event detection and alerting

## API Endpoints

### Health Endpoints

- `GET /health` - Basic health check
- `GET /ready` - Kubernetes readiness probe
- `GET /live` - Kubernetes liveness probe
- `GET /api/v1/health` - Detailed health check (authenticated)

### Audit Endpoints

- `POST /api/v1/audit/log` - Create audit log entry
- `GET /api/v1/audit/logs` - Retrieve audit logs with filtering
- `POST /api/v1/audit/search` - Advanced audit log search
- `GET /api/v1/audit/logs/:id` - Get specific audit log
- `GET /api/v1/audit/statistics` - Get audit statistics
- `POST /api/v1/audit/logs/bulk` - Bulk create audit logs

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Docker (optional)

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/serenity_security
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=serenity_security
DATABASE_USER=security_user
DATABASE_PASSWORD=your_secure_password

# Security
JWT_SECRET=your-super-secure-jwt-secret-key-here
API_KEY_SECRET=your-api-key-secret-here
ENCRYPTION_KEY=your-32-character-encryption-key-here

# Service
PORT=3001
NODE_ENV=development
```

### Installation

```bash
# Install dependencies
npm install

# Initialize database schema
npm run migration:run

# Start development server
npm run dev

# Or start production server
npm start
```

### Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t serenity-security-service .
docker run -p 3001:3001 --env-file .env serenity-security-service
```

## API Usage

### Authentication

The service supports two authentication methods:

#### JWT Authentication
```bash
curl -H "Authorization: Bearer your-jwt-token" \
     -H "Content-Type: application/json" \
     https://security-service/api/v1/audit/logs
```

#### API Key Authentication
```bash
curl -H "X-API-Key: your-api-key" \
     -H "Content-Type: application/json" \
     https://security-service/api/v1/audit/logs
```

### Creating Audit Logs

```bash
curl -X POST https://security-service/api/v1/audit/log \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "LOGIN",
    "event_name": "User Login",
    "event_description": "User successfully logged in",
    "user_id": "user-123",
    "username": "john.doe",
    "user_role": "patient",
    "source_ip": "192.168.1.100",
    "risk_level": "LOW",
    "metadata": {
      "login_method": "password",
      "device_type": "mobile"
    }
  }'
```

### Retrieving Audit Logs

```bash
# Get recent audit logs
curl "https://security-service/api/v1/audit/logs?page=1&limit=50" \
  -H "Authorization: Bearer your-jwt-token"

# Filter by user
curl "https://security-service/api/v1/audit/logs?user_id=user-123" \
  -H "Authorization: Bearer your-jwt-token"

# Filter by event type and date range
curl "https://security-service/api/v1/audit/logs?event_type=PHI_ACCESS&start_date=2023-01-01&end_date=2023-12-31" \
  -H "Authorization: Bearer your-jwt-token"
```

### Advanced Search

```bash
curl -X POST https://security-service/api/v1/audit/search \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "event_type": ["LOGIN", "LOGOUT"],
      "risk_level": "HIGH",
      "start_date": "2023-01-01T00:00:00Z",
      "end_date": "2023-12-31T23:59:59Z",
      "patient_id": "patient-123",
      "page": 1,
      "limit": 20
    },
    "include_encrypted_data": false
  }'
```

## Event Types

The service supports the following audit event types:

- `LOGIN` / `LOGOUT` - Authentication events
- `DATA_ACCESS` / `DATA_MODIFICATION` / `DATA_EXPORT` - Data operations
- `PHI_ACCESS` / `PHI_EXPORT` - Protected Health Information access
- `PERMISSION_CHANGE` - Authorization changes
- `SYSTEM_ACCESS` / `API_CALL` - System operations
- `AUTHENTICATION_FAILURE` / `AUTHORIZATION_FAILURE` - Security failures
- `PASSWORD_CHANGE` / `ACCOUNT_LOCKOUT` - Account security
- `CONFIGURATION_CHANGE` - System configuration changes
- `SECURITY_ALERT` / `CRISIS_EVENT` / `EMERGENCY_ACCESS` - Security incidents

## Risk Levels

- `LOW` - Normal operations
- `MEDIUM` - Potentially suspicious activity
- `HIGH` - Suspicious activity requiring review
- `CRITICAL` - Immediate security threat

## HIPAA Compliance

This service is designed to meet HIPAA requirements for audit logging:

- **Audit Controls**: Complete audit trail of all PHI access
- **Information Integrity**: Encryption and data validation
- **Transmission Security**: Encrypted data transmission
- **Audit Review**: Comprehensive audit log review capabilities
- **Data Retention**: 6+ year retention period for audit logs

### PHI Access Logging

When logging PHI access, include the patient ID and HIPAA category:

```json
{
  "event_type": "PHI_ACCESS",
  "event_name": "Medical Record Access",
  "patient_id": "patient-123",
  "hipaa_category": "MEDICAL_RECORD_ACCESS",
  "user_id": "provider-456",
  "user_role": "provider"
}
```

## Security Features

### Encryption

All sensitive data is encrypted using AES-256-GCM:

- Request/response data in audit logs
- PHI-related information
- Configurable encryption settings

### Rate Limiting

- 100 requests per 15 minutes (default)
- Adaptive rate limiting based on system load
- Emergency bypass for critical situations
- Different limits for different endpoints

### Input Validation

- Joi schema validation
- SQL injection prevention
- XSS protection
- Request size limits

### Authentication & Authorization

- JWT token validation
- API key management
- Role-based access control
- Permission-based access to encrypted data

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test -- auditService.test.ts
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run typecheck
```

### Database Migrations

```bash
# Run migrations
npm run migration:run

# Check migration status
npm run migration:status

# Rollback migration
npm run migration:rollback
```

## Deployment

### Production Checklist

- [ ] Set strong encryption keys (32+ characters)
- [ ] Configure secure database credentials
- [ ] Enable HTTPS/TLS
- [ ] Set up monitoring and alerting
- [ ] Configure log rotation
- [ ] Set up database backups
- [ ] Configure rate limiting for production load
- [ ] Enable audit log encryption
- [ ] Set up access controls

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: security-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: security-service
  template:
    metadata:
      labels:
        app: security-service
    spec:
      containers:
      - name: security-service
        image: serenity/security-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: security-secrets
              key: database-url
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 30
        livenessProbe:
          httpGet:
            path: /live
            port: 3001
          initialDelaySeconds: 60
```

## Monitoring

### Health Checks

- `/health` - Basic service health
- `/ready` - Readiness for traffic
- `/live` - Service liveness

### Metrics

The service provides metrics for:

- Request rates and response times
- Database connection health
- Memory and CPU usage
- Audit log creation rates
- Security event frequencies

### Logging

Structured JSON logging with:

- Request/response logging
- Audit event logging
- Security event logging
- Performance monitoring
- Error tracking

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check database credentials and connectivity
   - Ensure database schema is initialized
   - Verify network connectivity

2. **Authentication Failures**
   - Check JWT secret configuration
   - Verify API key format (64 hex characters)
   - Ensure proper authorization headers

3. **Rate Limiting**
   - Check rate limit configuration
   - Use emergency bypass header if necessary
   - Monitor rate limit metrics

4. **Encryption Errors**
   - Verify encryption key is exactly 32 characters
   - Check encryption is enabled in configuration
   - Ensure proper key management

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

This project is proprietary to Serenity and not licensed for public use.