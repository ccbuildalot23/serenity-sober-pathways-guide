# Notification Service API Specification

## Service Overview
Standalone microservice handling all notification operations with multi-channel delivery, user preferences, rate limiting, and HIPAA compliance.

## Base URL
```
Production: https://api.serenity.health/notifications/v1
Staging: https://staging-api.serenity.health/notifications/v1
Local: http://localhost:3000/api/v1
```

## Authentication
All endpoints require JWT bearer token:
```
Authorization: Bearer <jwt_token>
```

## API Endpoints

### 1. Notifications

#### Create Notification
```http
POST /notifications
Content-Type: application/json

{
  "userId": "uuid",
  "type": "crisis|check_in|goal_deadline|appointment|community|provider|system",
  "priority": 1-4,
  "title": "string",
  "body": "string",
  "channels": ["in_app", "email", "sms", "whatsapp", "push"],
  "templateId": "uuid (optional)",
  "templateData": {},
  "scheduledFor": "ISO 8601 (optional)",
  "expiresAt": "ISO 8601 (optional)",
  "metadata": {},
  "idempotencyKey": "string"
}

Response: 201 Created
{
  "id": "uuid",
  "status": "queued|sent|delivered|failed",
  "createdAt": "ISO 8601",
  "deliveryStatus": {
    "in_app": "pending",
    "email": "queued",
    "sms": "sent"
  }
}
```

#### Get Notification
```http
GET /notifications/:id

Response: 200 OK
{
  "id": "uuid",
  "userId": "uuid",
  "type": "string",
  "priority": 1-4,
  "title": "string",
  "body": "string",
  "status": "string",
  "deliveryStatus": {},
  "createdAt": "ISO 8601",
  "sentAt": "ISO 8601",
  "readAt": "ISO 8601"
}
```

#### Update Notification Status
```http
PATCH /notifications/:id
Content-Type: application/json

{
  "status": "read|acknowledged|dismissed",
  "metadata": {}
}

Response: 200 OK
```

#### List Notifications
```http
GET /notifications?userId=uuid&status=unread&type=crisis&limit=20&offset=0

Response: 200 OK
{
  "notifications": [...],
  "total": 150,
  "unreadCount": 5,
  "pagination": {
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

#### Batch Create
```http
POST /notifications/batch
Content-Type: application/json

{
  "notifications": [
    {...notification1},
    {...notification2}
  ],
  "idempotencyKey": "string"
}

Response: 201 Created
{
  "created": 2,
  "failed": 0,
  "results": [...]
}
```

### 2. Preferences

#### Get User Preferences
```http
GET /preferences/:userId

Response: 200 OK
{
  "userId": "uuid",
  "channels": {
    "in_app": true,
    "email": true,
    "sms": false,
    "whatsapp": true,
    "push": true
  },
  "quietHours": {
    "enabled": true,
    "start": "22:00",
    "end": "08:00",
    "timezone": "America/New_York"
  },
  "rateLimits": {
    "maxPerDay": 50,
    "maxPerHour": 10,
    "emergencyOverride": true
  },
  "categories": {
    "crisis": ["in_app", "sms", "whatsapp"],
    "check_in": ["in_app"],
    "community": ["email"]
  }
}
```

#### Update Preferences
```http
PUT /preferences/:userId
Content-Type: application/json

{
  "channels": {...},
  "quietHours": {...},
  "rateLimits": {...},
  "categories": {...}
}

Response: 200 OK
```

### 3. Channel Management

#### WhatsApp Opt-In
```http
POST /channels/whatsapp/opt-in
Content-Type: application/json

{
  "userId": "uuid",
  "phoneNumber": "+1234567890",
  "consentMethod": "qr_code|sms_link|in_app"
}

Response: 201 Created
{
  "verificationCode": "123456",
  "expiresAt": "ISO 8601"
}
```

#### Verify WhatsApp
```http
POST /channels/whatsapp/verify
Content-Type: application/json

{
  "userId": "uuid",
  "verificationCode": "123456"
}

Response: 200 OK
{
  "verified": true,
  "phoneNumber": "+1234567890"
}
```

#### Channel Status
```http
GET /channels/status/:userId

Response: 200 OK
{
  "in_app": {
    "enabled": true,
    "verified": true
  },
  "email": {
    "enabled": true,
    "verified": true,
    "address": "user@example.com"
  },
  "whatsapp": {
    "enabled": true,
    "verified": true,
    "phoneNumber": "+1234567890"
  }
}
```

### 4. Templates

#### List Templates
```http
GET /templates?type=crisis&channel=email

Response: 200 OK
{
  "templates": [
    {
      "id": "uuid",
      "name": "Crisis Alert",
      "type": "crisis",
      "channel": "email",
      "subject": "{{userName}} needs immediate support",
      "body": "template content",
      "variables": ["userName", "message"],
      "isActive": true
    }
  ]
}
```

#### Create Template
```http
POST /templates
Content-Type: application/json

{
  "name": "string",
  "type": "string",
  "channel": "string",
  "subject": "string",
  "body": "string",
  "variables": ["var1", "var2"]
}

Response: 201 Created
```

### 5. Crisis & Escalation

#### Trigger Crisis Alert
```http
POST /crisis/alert
Content-Type: application/json

{
  "userId": "uuid",
  "severity": "low|medium|high|critical|emergency",
  "triggerType": "manual|voice|shake|pattern",
  "location": {
    "latitude": 0,
    "longitude": 0,
    "accuracy": 0
  },
  "message": "string",
  "supporterIds": ["uuid1", "uuid2"]
}

Response: 201 Created
{
  "alertId": "uuid",
  "notificationsSent": 5,
  "escalationLevel": 1
}
```

#### Acknowledge Crisis
```http
POST /crisis/:alertId/acknowledge
Content-Type: application/json

{
  "supporterId": "uuid",
  "responseType": "immediate|on_my_way|cant_help",
  "message": "string",
  "eta": 15
}

Response: 200 OK
```

#### Escalate Crisis
```http
POST /crisis/:alertId/escalate
Content-Type: application/json

{
  "reason": "string",
  "toTier": 2,
  "notifyEmergencyServices": false
}

Response: 200 OK
```

### 6. Analytics

#### Delivery Statistics
```http
GET /analytics/delivery?startDate=2024-01-01&endDate=2024-12-31

Response: 200 OK
{
  "totalSent": 10000,
  "delivered": 9500,
  "failed": 500,
  "deliveryRate": 0.95,
  "channels": {
    "in_app": {
      "sent": 5000,
      "delivered": 4950,
      "rate": 0.99
    }
  }
}
```

#### Response Times
```http
GET /analytics/response-times?period=7d

Response: 200 OK
{
  "averageResponseTime": 120,
  "medianResponseTime": 90,
  "p95ResponseTime": 300,
  "byChannel": {...}
}
```

## WebSocket Events

### Connection
```javascript
ws://localhost:3000/notifications

// Auth
{ "type": "auth", "token": "jwt_token" }

// Subscribe
{ "type": "subscribe", "userId": "uuid", "channels": ["crisis", "check_in"] }
```

### Server Events
```javascript
// New notification
{
  "type": "notification",
  "data": {
    "id": "uuid",
    "title": "string",
    "body": "string",
    "priority": 1
  }
}

// Status update
{
  "type": "status_update",
  "notificationId": "uuid",
  "status": "delivered"
}

// Crisis alert
{
  "type": "crisis_alert",
  "severity": "high",
  "data": {...}
}
```

## Error Responses

```json
// 400 Bad Request
{
  "error": "INVALID_REQUEST",
  "message": "Missing required field: userId",
  "field": "userId"
}

// 401 Unauthorized
{
  "error": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}

// 403 Forbidden
{
  "error": "FORBIDDEN",
  "message": "Insufficient permissions"
}

// 404 Not Found
{
  "error": "NOT_FOUND",
  "message": "Notification not found"
}

// 429 Too Many Requests
{
  "error": "RATE_LIMITED",
  "message": "Rate limit exceeded",
  "retryAfter": 60
}

// 500 Internal Server Error
{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred",
  "requestId": "uuid"
}
```

## Rate Limiting

- Default: 100 requests per minute per user
- Burst: 20 requests per second
- Headers:
  - `X-RateLimit-Limit`: 100
  - `X-RateLimit-Remaining`: 95
  - `X-RateLimit-Reset`: Unix timestamp

## Idempotency

Use `Idempotency-Key` header for POST requests:
```
Idempotency-Key: unique-key-123
```

## Pagination

Standard pagination parameters:
- `limit`: Number of items (max 100)
- `offset`: Skip N items
- `cursor`: Cursor-based pagination token

## Filtering

Common filters:
- `status`: Filter by status
- `type`: Filter by notification type
- `channel`: Filter by delivery channel
- `startDate`: ISO 8601 date
- `endDate`: ISO 8601 date

## Webhooks

Configure webhooks for delivery status:
```http
POST /webhooks
{
  "url": "https://your-app.com/webhook",
  "events": ["delivered", "failed", "bounced"],
  "secret": "webhook_secret"
}
```

## Health Check

```http
GET /health

Response: 200 OK
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "queue": "healthy"
  }
}
```

## Metrics

Prometheus metrics endpoint:
```http
GET /metrics

# TYPE notification_sent_total counter
notification_sent_total{channel="email"} 1234
```