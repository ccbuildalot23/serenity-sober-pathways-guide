# Notification Service Microservice Specification

## 1. Overview

The Notification Service is a standalone microservice responsible for managing all notification operations across the Serenity platform. It provides a unified API for creating, scheduling, delivering, and tracking notifications across multiple channels while maintaining HIPAA compliance and supporting crisis escalation protocols.

## 2. Service Boundaries

### 2.1 Core Responsibilities
- Notification creation and validation
- Multi-channel delivery orchestration
- User preference management
- Rate limiting and throttling
- Template management
- Delivery tracking and analytics
- Crisis alert coordination
- Escalation management
- Audit logging for compliance

### 2.2 Out of Scope
- User authentication (delegated to Auth service)
- Business logic for when to send notifications (owned by domain services)
- Content generation (beyond template processing)
- Direct database access to non-notification tables

## 3. API Specification

### 3.1 RESTful Endpoints

#### Notification Management
```
POST   /api/v1/notifications                 # Create notification
GET    /api/v1/notifications/:id            # Get notification details
PATCH  /api/v1/notifications/:id            # Update notification status
DELETE /api/v1/notifications/:id            # Cancel notification
GET    /api/v1/notifications                # List notifications (paginated)
```

#### Batch Operations
```
POST   /api/v1/notifications/batch          # Create multiple notifications
POST   /api/v1/notifications/batch/cancel   # Cancel multiple notifications
```

#### User Preferences
```
GET    /api/v1/users/:userId/preferences    # Get user preferences
PUT    /api/v1/users/:userId/preferences    # Update preferences
POST   /api/v1/users/:userId/opt-in         # Channel opt-in
DELETE /api/v1/users/:userId/opt-in/:channel # Channel opt-out
```

#### Templates
```
GET    /api/v1/templates                    # List templates
GET    /api/v1/templates/:id                # Get template
POST   /api/v1/templates                    # Create template
PUT    /api/v1/templates/:id                # Update template
DELETE /api/v1/templates/:id                # Delete template
```

#### Crisis & Escalation
```
POST   /api/v1/crisis/alert                 # Trigger crisis alert
POST   /api/v1/crisis/:alertId/acknowledge  # Acknowledge crisis
POST   /api/v1/crisis/:alertId/escalate     # Escalate to next tier
GET    /api/v1/crisis/:alertId/status       # Get crisis status
```

#### Analytics
```
GET    /api/v1/analytics/delivery-rates     # Delivery statistics
GET    /api/v1/analytics/response-times     # Response metrics
GET    /api/v1/analytics/channel-performance # Channel metrics
```

### 3.2 WebSocket Events

#### Client → Server
```javascript
// Subscribe to notifications
{ type: 'subscribe', userId: string, channels: string[] }

// Acknowledge notification
{ type: 'acknowledge', notificationId: string }

// Mark as read
{ type: 'mark_read', notificationIds: string[] }
```

#### Server → Client
```javascript
// New notification
{ type: 'notification', data: Notification }

// Status update
{ type: 'status_update', notificationId: string, status: string }

// Crisis alert
{ type: 'crisis_alert', data: CrisisAlert }
```

## 4. Data Models

### 4.1 Core Entities

#### Notification
```typescript
interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  channels: Channel[];
  priority: Priority;
  title: string;
  body: string;
  metadata?: Record<string, any>;
  templateId?: string;
  templateData?: Record<string, any>;
  scheduledFor?: Date;
  expiresAt?: Date;
  status: NotificationStatus;
  deliveryStatus: DeliveryStatus[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### UserPreferences
```typescript
interface UserPreferences {
  userId: string;
  channels: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
    whatsapp: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string;   // "08:00"
    timezone: string;
  };
  rateLimits: {
    maxPerDay: number;
    maxPerHour: number;
    emergencyOverride: boolean;
  };
  categories: {
    [key: string]: boolean;
  };
}
```

#### DeliveryStatus
```typescript
interface DeliveryStatus {
  channel: Channel;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
}
```

### 4.2 Database Schema

The service will maintain its own database with the following core tables:

```sql
-- Core notification storage
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  priority INT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB,
  template_id UUID,
  template_data JSONB,
  scheduled_for TIMESTAMP,
  expires_at TIMESTAMP,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Delivery tracking
CREATE TABLE delivery_status (
  id UUID PRIMARY KEY,
  notification_id UUID REFERENCES notifications(id),
  channel VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  failure_reason TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User preferences
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY,
  channels JSONB NOT NULL,
  quiet_hours JSONB,
  rate_limits JSONB,
  categories JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Template management
CREATE TABLE templates (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  variables JSONB,
  metadata JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Channel opt-ins
CREATE TABLE channel_opt_ins (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  channel VARCHAR(50) NOT NULL,
  identifier TEXT NOT NULL, -- email, phone, device_token
  verified BOOLEAN DEFAULT false,
  opted_in_at TIMESTAMP DEFAULT NOW(),
  opted_out_at TIMESTAMP,
  UNIQUE(user_id, channel, identifier)
);

-- Audit log for compliance
CREATE TABLE notification_audit_log (
  id UUID PRIMARY KEY,
  notification_id UUID,
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  actor_id UUID,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 5. Integration Architecture

### 5.1 Communication Patterns

#### Synchronous (HTTP/REST)
- Direct API calls for immediate operations
- Request/response for preference management
- Template CRUD operations

#### Asynchronous (Message Queue)
- Notification delivery processing
- Batch operations
- Scheduled notifications
- Retry mechanisms

#### Real-time (WebSocket)
- Live notification delivery to web/mobile clients
- Status updates
- Crisis alerts

### 5.2 External Service Integration

#### Channel Providers
- **Email**: SendGrid API
- **SMS**: Twilio API
- **WhatsApp**: WhatsApp Business API
- **Push**: Firebase Cloud Messaging
- **In-App**: Internal WebSocket

#### Internal Services
- **Auth Service**: User validation
- **User Service**: Profile information
- **Crisis Service**: Emergency coordination
- **Analytics Service**: Metrics collection

### 5.3 Anti-Corruption Layer

The service will implement an anti-corruption layer to translate between:
- Monolith domain models ↔ Service DTOs
- Legacy notification formats ↔ Standardized formats
- External provider formats ↔ Internal models

```typescript
// Example transformation
class NotificationTransformer {
  static fromMonolith(legacyNotification: any): Notification {
    return {
      id: legacyNotification.id,
      userId: legacyNotification.user_id,
      type: this.mapNotificationType(legacyNotification.notification_type),
      // ... mapping logic
    };
  }
  
  static toMonolith(notification: Notification): any {
    return {
      id: notification.id,
      user_id: notification.userId,
      notification_type: this.mapToLegacyType(notification.type),
      // ... reverse mapping
    };
  }
}
```

## 6. Non-Functional Requirements

### 6.1 Performance
- API response time: < 200ms (p95)
- Notification delivery: < 5s for critical, < 30s for normal
- WebSocket latency: < 100ms
- Throughput: 10,000 notifications/minute

### 6.2 Scalability
- Horizontal scaling via container orchestration
- Queue-based processing for high volume
- Database connection pooling
- Caching layer for templates and preferences

### 6.3 Reliability
- 99.9% uptime SLA
- Automatic retry with exponential backoff
- Circuit breaker for external services
- Graceful degradation

### 6.4 Security & Compliance
- HIPAA compliant audit logging
- Encryption at rest and in transit
- PII data masking in logs
- Rate limiting per user/IP
- OAuth 2.0 authentication
- Role-based access control

### 6.5 Monitoring
- Health check endpoint: `/health`
- Metrics endpoint: `/metrics` (Prometheus format)
- Distributed tracing (OpenTelemetry)
- Centralized logging (ELK stack)

## 7. Deployment Architecture

### 7.1 Container Structure
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### 7.2 Environment Configuration
```yaml
# docker-compose.yml
services:
  notification-service:
    image: serenity/notification-service:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - SENDGRID_API_KEY=${SENDGRID_API_KEY}
      - TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
      - TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
      - FCM_SERVER_KEY=${FCM_SERVER_KEY}
    depends_on:
      - postgres
      - redis
```

### 7.3 Infrastructure Requirements
- **Compute**: 2 vCPU, 4GB RAM minimum per instance
- **Database**: PostgreSQL 14+ with connection pooling
- **Cache**: Redis 6+ for session and queue management
- **Message Queue**: RabbitMQ or AWS SQS
- **Storage**: 20GB for logs and temporary files

## 8. Migration Strategy

### Phase 1: Parallel Run (Weeks 1-2)
1. Deploy notification service alongside monolith
2. Shadow write to both systems
3. Compare outputs for validation
4. No user-facing changes

### Phase 2: Gradual Migration (Weeks 3-4)
1. Route 10% traffic to new service
2. Monitor metrics and errors
3. Gradually increase to 50%, then 100%
4. Maintain fallback to monolith

### Phase 3: Monolith Cleanup (Week 5)
1. Remove notification logic from monolith
2. Update all references to use service API
3. Archive legacy code
4. Update documentation

## 9. Testing Strategy

### 9.1 Unit Tests
- Service logic coverage > 90%
- Mock external dependencies
- Test all error paths

### 9.2 Integration Tests
- API endpoint validation
- Database operations
- External service integration
- Message queue processing

### 9.3 End-to-End Tests
- Complete notification lifecycle
- Multi-channel delivery
- Crisis escalation scenarios
- Rate limiting validation

### 9.4 Performance Tests
- Load testing (10k notifications/min)
- Stress testing (find breaking point)
- Spike testing (sudden load increase)
- Endurance testing (24-hour run)

## 10. Success Metrics

### Technical Metrics
- Delivery success rate > 99%
- API availability > 99.9%
- Response time < 200ms (p95)
- Error rate < 0.1%

### Business Metrics
- User engagement increase
- Crisis response time improvement
- Support ticket reduction
- Cost per notification

### Compliance Metrics
- 100% audit log coverage
- Zero PHI leaks
- HIPAA compliance maintained
- SOC-2 requirements met

## 11. Rollback Plan

### Automatic Rollback Triggers
- Error rate > 5%
- Response time > 1s
- Delivery failure > 10%
- Database connection failures

### Manual Rollback Process
1. Switch traffic to monolith
2. Preserve service data
3. Investigate root cause
4. Fix and redeploy
5. Resume migration

## 12. Documentation Requirements

### API Documentation
- OpenAPI 3.0 specification
- Postman collection
- SDK examples
- Integration guides

### Operational Documentation
- Deployment procedures
- Monitoring setup
- Incident response
- Disaster recovery

### Developer Documentation
- Architecture diagrams
- Code structure
- Contributing guidelines
- Local development setup