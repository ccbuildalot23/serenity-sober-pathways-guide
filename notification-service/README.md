# Serenity Notification Service

A production-ready, HIPAA-compliant notification service for multi-channel delivery with comprehensive tracking and analytics.

## Features

- **Multi-Channel Delivery**: SMS (Twilio), Email (SendGrid), Push (FCM), WhatsApp (Twilio)
- **Template Management**: Reusable templates with personalization variables
- **Notification Scheduling**: Queue notifications for future delivery
- **Rate Limiting**: Per-user and per-channel rate limiting
- **Delivery Tracking**: Comprehensive analytics and delivery status tracking
- **Retry Logic**: Exponential backoff for failed deliveries
- **User Preferences**: Opt-in/opt-out management with quiet hours
- **HIPAA Compliance**: Encrypted PHI data with audit logging
- **Real-time Updates**: WebSocket support for live status updates
- **Monitoring**: Prometheus metrics and Grafana dashboards

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Apps   │────│   FastAPI App   │────│   Providers     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                     │
                         ┌─────────────────┐    ┌─────────────────┐
                         │     MongoDB     │    │ Twilio/SendGrid │
                         │   (Database)    │    │      /FCM       │
                         └─────────────────┘    └─────────────────┘
                                │
                         ┌─────────────────┐
                         │      Redis      │
                         │ (Queue/Cache)   │
                         └─────────────────┘
                                │
                         ┌─────────────────┐
                         │     Celery      │
                         │  (Background)   │
                         └─────────────────┘
```

## Tech Stack

- **Backend**: Python 3.11, FastAPI
- **Database**: MongoDB with Beanie ODM
- **Queue**: Redis + Celery for background processing
- **Providers**: Twilio, SendGrid, Firebase FCM
- **Monitoring**: Prometheus, Grafana
- **Deployment**: Docker, Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Python 3.11+ (for local development)
- API keys for:
  - Twilio (SMS/WhatsApp)
  - SendGrid (Email)
  - Firebase (Push notifications)

### Environment Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd notification-service
```

2. Copy environment configuration:
```bash
cp .env.example .env
```

3. Configure your environment variables in `.env`:
```env
# Required API Keys
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
SENDGRID_API_KEY=your_sendgrid_api_key
FCM_SERVER_KEY=your_fcm_server_key

# Security
SECRET_KEY=your-32-character-secret-key
ENCRYPTION_KEY=your-32-byte-encryption-key
```

### Docker Deployment

1. Start all services:
```bash
docker-compose up -d
```

2. Check service health:
```bash
curl http://localhost:8000/health/
```

3. View API documentation:
```bash
open http://localhost:8000/docs
```

### Local Development

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Start MongoDB and Redis:
```bash
docker-compose up mongodb redis -d
```

3. Run the development server:
```bash
python -m app.main
```

## API Documentation

### Core Endpoints

#### Send Notification
```bash
POST /api/v1/notifications/
```

Example request:
```json
{
  "user_id": "user123",
  "channel": "email",
  "recipient": "user@example.com",
  "message": "Welcome to Serenity!",
  "subject": "Welcome",
  "priority": "normal"
}
```

#### Send Bulk Notifications
```bash
POST /api/v1/notifications/bulk
```

#### Get Notification Status
```bash
GET /api/v1/notifications/{notification_id}
```

#### User Preferences
```bash
GET /api/v1/preferences/{user_id}
PUT /api/v1/preferences/{user_id}
POST /api/v1/preferences/{user_id}/opt-in
POST /api/v1/preferences/{user_id}/opt-out
```

#### Templates
```bash
GET /api/v1/templates/
POST /api/v1/templates/
GET /api/v1/templates/{template_id}
POST /api/v1/templates/{template_id}/render
```

#### Analytics
```bash
GET /api/v1/analytics/delivery
GET /api/v1/analytics/channels
GET /api/v1/analytics/users
```

### WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/user123');
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('Notification update:', update);
};
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `APP_NAME` | Service name | Serenity Notification Service | No |
| `ENVIRONMENT` | Environment (development/staging/production) | development | No |
| `SECRET_KEY` | JWT secret key | - | Yes |
| `ENCRYPTION_KEY` | PHI encryption key | - | Yes |
| `MONGODB_URL` | MongoDB connection URL | - | Yes |
| `REDIS_URL` | Redis connection URL | - | Yes |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | - | Yes |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | - | Yes |
| `SENDGRID_API_KEY` | SendGrid API Key | - | Yes |
| `FCM_SERVER_KEY` | Firebase Cloud Messaging key | - | Yes |

### Rate Limiting

Default rate limits per channel:
- **SMS**: 5 per minute
- **Email**: 10 per minute  
- **Push**: 20 per minute
- **WhatsApp**: 3 per minute

Configure via environment variables:
```env
RATE_LIMIT_SMS_PER_MINUTE=5
RATE_LIMIT_EMAIL_PER_MINUTE=10
RATE_LIMIT_PUSH_PER_MINUTE=20
RATE_LIMIT_WHATSAPP_PER_MINUTE=3
```

## Templates

Templates support Jinja2-style variable substitution:

```json
{
  "name": "welcome_email",
  "subject_template": "Welcome {{user_name}}!",
  "message_template": "Hello {{user_name}}, welcome to {{app_name}}!"
}
```

Available variables:
- `{{user_name}}` - Full user name
- `{{user_first_name}}` - First name
- `{{provider_name}}` - Healthcare provider name
- `{{app_name}}` - Application name
- Custom variables via API

## HIPAA Compliance

### Data Protection
- All PHI data encrypted at rest using AES-256
- Encrypted communication (TLS 1.2+)
- Role-based access control
- Audit logging for all PHI access

### Audit Logging
All actions are logged with:
- User ID and IP address
- Action performed and timestamp
- Success/failure status
- PHI access indicators

### Data Retention
- Message data: 7 years (configurable)
- Audit logs: 7 years minimum
- User preferences: Until account deletion

## Monitoring

### Health Checks
```bash
curl http://localhost:8000/health/
curl http://localhost:8000/health/detailed
```

### Metrics (Prometheus)
- `notification_sent_total` - Total notifications sent
- `notification_delivery_duration` - Delivery latency
- `provider_error_total` - Provider errors by type
- `queue_size` - Current queue size

### Dashboards (Grafana)
Access Grafana at `http://localhost:3000`
- Notification delivery metrics
- Provider performance
- Queue monitoring
- Error tracking

## Testing

### Unit Tests
```bash
pytest tests/unit/
```

### Integration Tests
```bash
pytest tests/integration/
```

### Load Testing
```bash
pytest tests/load/ --count=1000
```

## Deployment

### Production Checklist

1. **Security**
   - [ ] Change all default passwords
   - [ ] Configure TLS certificates
   - [ ] Set up firewall rules
   - [ ] Enable audit logging

2. **Performance**
   - [ ] Configure connection pooling
   - [ ] Set up load balancing
   - [ ] Configure monitoring
   - [ ] Set up log aggregation

3. **Backup**
   - [ ] Configure MongoDB backups
   - [ ] Set up Redis persistence
   - [ ] Document recovery procedures

### Scaling

**Horizontal Scaling:**
- Add more worker containers
- Use Redis Cluster for high availability
- Deploy MongoDB replica sets

**Vertical Scaling:**
- Increase memory for caching
- Add CPU cores for worker processes

### CI/CD Pipeline

```yaml
# Example GitHub Actions workflow
name: Deploy Notification Service
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: pytest
  deploy:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - name: Deploy to production
        run: docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Common Issues

1. **Connection Errors**
   - Check MongoDB/Redis connectivity
   - Verify firewall settings
   - Check service health endpoints

2. **Provider Failures**
   - Validate API credentials
   - Check rate limits
   - Review provider documentation

3. **Performance Issues**
   - Monitor queue sizes
   - Check resource usage
   - Review database indexes

### Log Analysis

```bash
# View application logs
docker-compose logs notification-service

# View worker logs
docker-compose logs celery-worker

# View audit logs
docker exec -it mongodb mongo --eval "db.audit_logs.find().limit(10)"
```

## Security

### Best Practices
- Use strong passwords and API keys
- Enable TLS for all communications
- Regularly rotate encryption keys
- Monitor for suspicious activity
- Keep dependencies updated

### Vulnerability Reporting
Report security issues to: security@serenity.com

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Submit a pull request

### Code Style
- Follow PEP 8
- Use type hints
- Write docstrings
- Add logging for important events

## License

This project is proprietary software owned by Serenity.

## Support

- Documentation: [Internal Wiki]
- Issues: [GitHub Issues]
- Email: support@serenity.com