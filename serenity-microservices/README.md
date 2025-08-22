# Serenity Microservices Architecture

## Overview
This repository contains the microservices implementation of Serenity Sober Pathways, a HIPAA-compliant mental health and substance abuse recovery platform.

## Architecture
The platform is decomposed into 11 independent microservices:

### Core Domain Services
- **identity** - Authentication and user management
- **checkins** - Daily wellness tracking
- **crisis** - Emergency response and safety planning
- **communication** - Messaging and peer support
- **clinical** - Provider tools and care management
- **support-network** - Family/supporter engagement
- **analytics** - Data analysis and insights

### Shared Infrastructure Services
- **security** - HIPAA compliance and audit logging
- **notifications** - Multi-channel notification routing
- **files** - Encrypted document storage
- **gateway** - API Gateway and routing

## Technology Stack
- **Runtime**: Node.js 22.x
- **Framework**: Express.js / Fastify
- **Database**: PostgreSQL (Supabase)
- **Message Queue**: RabbitMQ
- **Cache**: Redis
- **Container**: Docker
- **Orchestration**: Kubernetes / Docker Compose
- **CI/CD**: GitHub Actions

## Getting Started

### Prerequisites
- Node.js 22.x
- Docker and Docker Compose
- PostgreSQL (or Supabase account)
- Redis

### Development Setup
```bash
# Clone repository
git clone <repository-url>
cd serenity-microservices

# Install dependencies for all services
npm run install:all

# Start infrastructure services
docker-compose up -d postgres redis rabbitmq

# Start all services in development
npm run dev:all

# Or start specific service
cd services/identity
npm run dev
```

### Testing
```bash
# Run all tests
npm run test:all

# Run specific service tests
cd services/identity
npm test

# Run integration tests
npm run test:integration
```

## Service Documentation
Each service has its own README with specific documentation:
- [Identity Service](./services/identity/README.md)
- [Checkins Service](./services/checkins/README.md)
- [Crisis Service](./services/crisis/README.md)
- [Communication Service](./services/communication/README.md)
- [Clinical Service](./services/clinical/README.md)
- [Support Network Service](./services/support-network/README.md)
- [Analytics Service](./services/analytics/README.md)
- [Security Service](./services/security/README.md)
- [Notifications Service](./services/notifications/README.md)
- [Files Service](./services/files/README.md)
- [Gateway Service](./services/gateway/README.md)

## Deployment

### Docker Compose (Development)
```bash
docker-compose up
```

### Kubernetes (Production)
```bash
kubectl apply -f infrastructure/k8s/
```

## Security & Compliance
- HIPAA compliant architecture
- End-to-end encryption for PHI
- Audit logging for all operations
- Role-based access control (RBAC)
- Regular security scanning

## Contributing
Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct and development process.

## License
This project is proprietary and confidential.