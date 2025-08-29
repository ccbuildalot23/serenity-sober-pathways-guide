# Serenity Microservices Platform

## Overview

Serenity has been migrated from a monolithic React application to a comprehensive microservices architecture designed for HIPAA-compliant mental health and substance abuse recovery support.

## Architecture

### Services

1. **Frontend App** (Port 8080)
   - React application with Vite
   - Communicates with all backend services
   - HIPAA-compliant UI components

2. **Auth Service** (Port 3000)
   - JWT-based authentication
   - Multi-factor authentication (MFA)
   - Password reset and user management
   - Role-based access control

3. **Notification Service** (Port 3001)
   - SMS notifications via Twilio
   - Email notifications
   - Push notifications
   - Template management

4. **Crisis Service** (Port 3002)
   - Real-time crisis alerts
   - Emergency contact management
   - Socket.IO for real-time communication
   - Crisis escalation protocols

### Infrastructure

- **PostgreSQL**: Primary database
- **Redis**: Caching and session storage
- **Nginx**: Reverse proxy and load balancer
- **Docker Compose**: Local development orchestration

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd serenity
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the services:**
   ```bash
   docker-compose up -d
   ```

4. **Access the application:**
   - Frontend: http://localhost:8080
   - Auth API: http://localhost:3000
   - Notification API: http://localhost:3001
   - Crisis API: http://localhost:3002

## Development

### Individual Service Development

Each service can be developed independently:

```bash
# Auth Service
cd auth-service
npm install
npm run dev

# Notification Service  
cd notification-service
npm install
npm run dev

# Crisis Service
cd crisis-service
npm install
npm run dev
```

### Service Communication

Services communicate via REST APIs and shared Redis for real-time features:

- **Auth Service**: Provides JWT tokens for service authentication
- **Notification Service**: Handles all outbound communications
- **Crisis Service**: Manages emergency situations with real-time alerts

## Deployment

### Production Deployment

1. **Build all services:**
   ```bash
   docker-compose -f docker-compose.prod.yml build
   ```

2. **Deploy with orchestration:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Environment Configuration

Required environment variables:
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for backend operations
- `JWT_SECRET`: JWT signing secret
- `TWILIO_*`: Twilio configuration for SMS
- `SMTP_*`: Email service configuration

## Security

- HIPAA compliance maintained across all services
- JWT-based authentication with short-lived tokens
- Rate limiting on all endpoints
- Input validation and sanitization
- Encrypted data at rest and in transit

## API Documentation

### Auth Service (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `POST /logout` - User logout
- `POST /refresh` - Token refresh
- `POST /mfa/setup` - MFA setup
- `POST /reset-password` - Password reset

### Notification Service (`/api/notifications`)
- `POST /send` - Send notification
- `GET /user/:userId` - Get user notifications
- `POST /sms/send` - Send SMS
- `POST /email/send` - Send email

### Crisis Service (`/api/crisis`)
- `POST /alert` - Trigger crisis alert
- `GET /status/:alertId` - Get crisis status
- `PATCH /status/:alertId` - Update crisis status
- `GET /resources` - Get crisis resources

## Monitoring

- Health checks on all services
- Prometheus metrics collection
- Grafana dashboards
- Centralized logging with Winston

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For support or questions about the Serenity platform, please contact the development team.
