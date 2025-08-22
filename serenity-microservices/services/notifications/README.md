# Serenity Notification Service

A HIPAA-compliant, multi-channel notification microservice for the Serenity mental health and substance abuse recovery platform.

## Features

- **Multi-channel delivery**: Email, SMS, Push notifications, In-app notifications
- **HIPAA compliance**: End-to-end encryption, audit logging, secure data handling
- **Template system**: Dynamic content rendering with Handlebars
- **Queue-based processing**: RabbitMQ for reliable async processing
- **Delivery tracking**: Real-time status updates and retry logic
- **Rate limiting**: Configurable rate limits to prevent abuse
- **User preferences**: Granular notification control per user
- **Monitoring**: Health checks, metrics, and performance monitoring

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Gateway   │────│ Notification API │────│   Database      │
└─────────────────┘    └──────────────────┘    │  (PostgreSQL)   │
                                │               └─────────────────┘
                                │               
                       ┌────────▼────────┐      ┌─────────────────┐
                       │   RabbitMQ      │      │     Redis       │
                       │    Queue        │      │    Cache        │
                       └────────┬────────┘      └─────────────────┘
                                │               
                       ┌────────▼────────┐      
                       │  Notification   │      
                       │   Processor     │      
                       └────────┬────────┘      
                                │               
              ┌─────────────────┼─────────────────┐
              │                 │                 │
    ┌─────────▼─────────┐ ┌─────▼─────┐ ┌───────▼──────┐
    │  Email Service    │ │SMS Service│ │ Push Service │
    │   (SendGrid)      │ │ (Twilio)  │ │  (Firebase)  │
    └───────────────────┘ └───────────┘ └──────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Redis 6+
- RabbitMQ 3.8+
- Docker & Docker Compose (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd serenity-microservices/services/notifications
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

5. **Seed initial data (optional)**
   ```bash
   npm run db:seed
   ```

6. **Start the service**
   ```bash
   npm run dev
   ```

### Docker Setup

1. **Development environment**
   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```

2. **Production environment**
   ```bash
   docker-compose up -d
   ```

## API Documentation

### Base URL
- Development: `http://localhost:3003`
- Production: `https://notifications.serenity.com`

### Authentication

All API endpoints require JWT authentication (except health checks).

```bash
Authorization: Bearer <jwt-token>
```

### Endpoints

#### Send Notification
```http
POST /api/v1/notifications/send
Content-Type: application/json

{
  "userId": "uuid",
  "type": "checkin_reminder",
  "channel": "email",
  "templateId": "uuid",
  "data": {
    "firstName": "John",
    "message": "Don't forget your daily check-in!"
  },
  "priority": "normal",
  "scheduledAt": "2024-01-15T10:00:00Z"
}
```

#### Send Bulk Notifications
```http
POST /api/v1/notifications/bulk
Content-Type: application/json

{
  "notifications": [
    {
      "userId": "uuid1",
      "type": "milestone_celebration",
      "channel": "push",
      "templateId": "uuid",
      "data": { "daysSober": 30 }
    }
  ],
  "scheduleMode": "immediate"
}
```

#### Get Notification Status
```http
GET /api/v1/notifications/status/{id}
```

#### Get User Notifications
```http
GET /api/v1/notifications/user/{userId}?page=1&limit=20&type=checkin_reminder
```

#### Mark Notification as Read
```http
PUT /api/v1/notifications/{id}/read
```

### Template Management

#### Create Template
```http
POST /api/v1/templates
Content-Type: application/json

{
  "name": "Welcome Email",
  "type": "system_notification",
  "channel": "email",
  "subject": "Welcome {{firstName}}!",
  "body": "Hello {{firstName}}, welcome to Serenity!",
  "htmlBody": "<h1>Welcome {{firstName}}!</h1>",
  "variables": ["firstName"],
  "isHipaaCompliant": false
}
```

#### Render Template
```http
POST /api/v1/templates/{id}/render
Content-Type: application/json

{
  "data": {
    "firstName": "John"
  }
}
```

### User Preferences

#### Get User Preferences
```http
GET /api/v1/preferences/{userId}
```

#### Update User Preferences
```http
PUT /api/v1/preferences/{userId}
Content-Type: application/json

{
  "email": {
    "enabled": true,
    "address": "user@example.com"
  },
  "sms": {
    "enabled": true,
    "phoneNumber": "+1234567890"
  },
  "quietHours": {
    "enabled": true,
    "startTime": "22:00",
    "endTime": "08:00",
    "timezone": "America/New_York"
  }
}
```

### Health & Monitoring

#### Health Check
```http
GET /health
```

#### Readiness Check
```http
GET /health/ready
```

#### Metrics
```http
GET /metrics
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3003` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | Required |
| `RABBITMQ_URL` | RabbitMQ connection string | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `SENDGRID_API_KEY` | SendGrid API key | Optional |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | Required |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | Required |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Required |
| `ENCRYPTION_KEY` | 32-char encryption key | Required |
| `HIPAA_ENCRYPTION_KEY` | 32-char HIPAA encryption key | Required |

### Rate Limiting

- General API: 100 requests per 15 minutes
- Notification sending: 20 requests per minute
- Bulk operations: 3 requests per 5 minutes
- Crisis alerts: Token bucket (5 tokens, refill 1/10s)

## Notification Types

| Type | Description | HIPAA | Priority |
|------|-------------|-------|----------|
| `crisis_alert` | Emergency crisis notifications | ✅ | Emergency |
| `checkin_reminder` | Daily check-in reminders | ❌ | Normal |
| `appointment_reminder` | Healthcare appointments | ✅ | High |
| `medication_reminder` | Medication time reminders | ✅ | High |
| `milestone_celebration` | Recovery milestones | ❌ | Normal |
| `support_message` | Peer support messages | ✅ | Normal |
| `system_notification` | System updates | ❌ | Low |
| `security_alert` | Security-related alerts | ✅ | Critical |

## Notification Channels

### Email (SendGrid/SMTP)
- HTML and text support
- Attachment support
- Delivery tracking
- Bounce handling

### SMS (Twilio)
- Global SMS delivery
- Delivery receipts
- Message splitting for long content
- Two-way messaging support

### Push Notifications (Firebase)
- iOS and Android support
- Rich notifications
- Badge counts
- Custom actions

### In-App Notifications
- Real-time via WebSocket
- Offline storage
- Read status tracking
- Custom actions

## HIPAA Compliance

### Data Encryption
- All PHI encrypted at rest (AES-256-GCM)
- TLS 1.2+ for data in transit
- Separate encryption keys for HIPAA data

### Audit Logging
- All notification activities logged
- User access tracking
- Data modification trails
- Retention: 7 years

### Access Controls
- Role-based permissions
- User ownership validation
- Administrative oversight
- Session management

### Data Retention
- Automatic cleanup after retention period
- Secure data wiping
- Export capabilities for compliance

## Development

### Project Structure
```
src/
├── controllers/          # API controllers
├── services/            # Business logic services
│   ├── channels/        # Notification channels
│   ├── QueueService.ts  # Message queue handling
│   └── TemplateService.ts # Template management
├── models/              # Data models
├── middleware/          # Express middleware
├── types/               # TypeScript types
├── utils/               # Utility functions
└── server.ts           # Main server file

tests/
├── unit/               # Unit tests
├── integration/        # Integration tests
└── setup.ts           # Test setup
```

### Running Tests
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

### Code Quality
```bash
# Linting
npm run lint
npm run lint:fix

# Type checking
npm run typecheck

# Build
npm run build
```

## Deployment

### Docker
```bash
# Build image
docker build -t serenity-notifications .

# Run container
docker run -p 3003:3003 serenity-notifications
```

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: notification-service
  template:
    metadata:
      labels:
        app: notification-service
    spec:
      containers:
      - name: notification-service
        image: serenity-notifications:latest
        ports:
        - containerPort: 3003
        env:
        - name: NODE_ENV
          value: "production"
        # ... other env vars
```

### Monitoring

#### Health Checks
- `GET /health` - Overall health status
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

#### Metrics
- Request/response metrics
- Queue depth monitoring
- Delivery success rates
- Error rates by channel
- Processing latency

#### Logging
- Structured JSON logging
- Correlation IDs
- HIPAA audit trails
- Error tracking

## Security

### Authentication & Authorization
- JWT-based authentication
- Role-based access control
- User ownership validation
- Service-to-service auth

### Rate Limiting
- IP-based limiting
- User-based limiting
- Endpoint-specific limits
- Sliding window algorithm

### Input Validation
- Schema validation
- Sanitization
- XSS prevention
- SQL injection protection

### Error Handling
- No sensitive data in errors
- Centralized error logging
- Graceful degradation
- Circuit breaker pattern

## Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check connection
npm run db:check

# Reset connections
npm run db:reset
```

#### Queue Processing Stopped
```bash
# Check queue stats
npm run queue:stats

# Restart workers
npm run queue:restart
```

#### High Memory Usage
```bash
# Check metrics
curl http://localhost:3003/metrics

# Analyze heap dump
npm run debug:heap
```

### Logs Location
- Development: Console output
- Production: `/app/logs/`
- Audit logs: `/app/logs/audit.log`
- Error logs: `/app/logs/error.log`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run the test suite
6. Submit a pull request

### Commit Convention
```
type(scope): description

feat(email): add attachment support
fix(sms): handle delivery failures
docs(api): update endpoint documentation
test(queue): add integration tests
```

## License

MIT License - see LICENSE file for details.

## Support

- Issues: [GitHub Issues](https://github.com/serenity/notifications/issues)
- Documentation: [Wiki](https://github.com/serenity/notifications/wiki)
- Chat: [Slack #notifications](https://serenity.slack.com/channels/notifications)
- Email: notifications@serenity.com