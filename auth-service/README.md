# 🔐 Serenity Authentication Service

A production-ready, HIPAA-compliant authentication microservice for the Serenity Sober Pathways healthcare platform.

## ✨ Features

- **JWT Authentication** - Secure token-based authentication with access and refresh tokens
- **Multi-Factor Authentication (MFA)** - TOTP-based 2FA with QR codes and backup codes
- **Role-Based Access Control (RBAC)** - Support for patient, provider, supporter, and admin roles
- **Password Security** - Strong password policies with secure reset flow
- **Brute Force Protection** - Progressive account lockouts and IP-based rate limiting
- **Session Management** - 15-minute PHI session timeout with secure cookie handling
- **Device Fingerprinting** - Track and audit device access patterns
- **Comprehensive Logging** - Winston-based structured logging with HIPAA audit trails
- **Email Verification** - Secure email verification with configurable templates
- **Security Headers** - Helmet.js for comprehensive security headers
- **CORS Protection** - Configurable cross-origin resource sharing
- **Health Monitoring** - Built-in health checks for monitoring

## 🏗️ Architecture

```
┌─────────────────────┐
│   Frontend App      │
│   (React/Next.js)   │
└──────────┬──────────┘
           │ HTTPS/JWT
┌──────────▼──────────┐
│  Auth Service       │
│  (Node.js/Express)  │
│  • JWT & Session    │
│  • MFA & RBAC       │
│  • Audit Logging    │
└─────────┬─┬─────────┘
          │ │
    ┌─────▼─▼─────┐   ┌─────────────┐
    │  Supabase   │   │    Redis    │
    │  PostgreSQL │   │  (Sessions/ │
    │  (RLS/Auth) │   │  Rate Limit)│
    └─────────────┘   └─────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ 
- Redis (optional - for distributed rate limiting)
- Supabase project with PostgreSQL database
- SMTP service for email (Gmail, SendGrid, etc.)

### Development Setup

1. **Clone and Install**
   ```bash
   cd auth-service
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase and SMTP configuration
   ```

3. **Start Redis (Optional)**
   ```bash
   docker-compose up redis -d
   ```

4. **Apply Database Schema**
   - Ensure your Supabase project has the schema from `C:\dev\serenity\supabase\migrations\0001_foundation_schema.sql`

5. **Start Development Server**
   ```bash
   npm run dev
   # Server runs on http://localhost:3000
   ```

### Production Deployment

1. **Docker Compose (Recommended)**
   ```bash
   # Copy and configure environment
   cp .env.example .env
   
   # Start all services
   docker-compose up -d
   ```

2. **Manual Deployment**
   ```bash
   npm ci --only=production
   NODE_ENV=production npm start
   ```

## 📚 API Documentation

Base URL: `http://localhost:3000` (development) or your production domain

### Core Authentication Endpoints

#### POST `/auth/register`
Register a new user account with email verification.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "fullName": "John Doe",
  "phoneNumber": "+1234567890",
  "role": "patient"
}
```

**Response:**
```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "patient"
  }
}
```

#### POST `/auth/verify-email`
Verify email address with token from email.

**Request:**
```json
{
  "token": "verification_token_from_email"
}
```

#### POST `/auth/login`
Authenticate user and receive tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "mfaCode": "123456"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "patient"
  }
}
```

#### POST `/auth/refresh`
Refresh access token using refresh token cookie.

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST `/auth/logout`
Logout and clear session/tokens.

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "message": "Logout successful"
}
```

### Multi-Factor Authentication (MFA)

#### POST `/auth/mfa/setup`
Initialize MFA setup for authenticated user.

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "secret": "base32_secret_string",
  "qrCode": "data:image/png;base64,...",
  "backupCodes": ["12345678", "87654321", ...]
}
```

#### POST `/auth/mfa/enable`
Enable MFA after verifying TOTP code.

**Headers:** `Authorization: Bearer <access_token>`

**Request:**
```json
{
  "mfaCode": "123456"
}
```

#### POST `/auth/mfa/disable`
Disable MFA (requires password verification).

**Headers:** `Authorization: Bearer <access_token>`

**Request:**
```json
{
  "password": "CurrentPassword123!"
}
```

### Password Management

#### POST `/auth/password-reset`
Request password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If the email exists, a password reset link has been sent."
}
```

#### POST `/auth/password-update`
Complete password reset with token from email.

**Request:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePassword123!"
}
```

### User Profile Management

#### GET `/auth/profile`
Get current user profile.

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "phone_number": "+1234567890",
  "role": "patient",
  "mfaEnabled": false,
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### PUT `/auth/profile`
Update user profile.

**Headers:** `Authorization: Bearer <access_token>`

**Request:**
```json
{
  "fullName": "John Smith",
  "phoneNumber": "+1987654321"
}
```

### Session Management

#### GET `/auth/session`
Check current session status.

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "userId": "uuid",
  "role": "patient",
  "phiAccess": true,
  "sessionExpires": 1672531200000
}
```

#### POST `/auth/session/extend`
Extend PHI access session (requires password).

**Headers:** `Authorization: Bearer <access_token>`

**Request:**
```json
{
  "password": "CurrentPassword123!"
}
```

## 🔒 Security Features

### Rate Limiting
- **Global**: 1000 requests per 15 minutes per IP
- **Authentication**: 5 attempts per 15 minutes per IP
- **Password Reset**: 5 requests per 15 minutes per IP
- Configurable limits via environment variables

### Brute Force Protection
- Progressive lockout after failed login attempts:
  - 3+ failures: 1 minute lockout
  - 4+ failures: 5 minute lockout  
  - 5+ failures: 15 minute lockout
  - 6+ failures: 1 hour lockout
- Persistent lockout tracking via Redis
- IP and email-based protection

### Session Security
- **PHI Access**: 15-minute timeout for healthcare data access
- **Secure Cookies**: HTTP-only refresh tokens with SameSite protection
- **Device Fingerprinting**: Browser and OS tracking for suspicious activity
- **Session Invalidation**: Automatic cleanup on logout

### Password Security
- **Strong Requirements**: Minimum 8 characters with uppercase, lowercase, number, and special character
- **Secure Reset Flow**: Time-limited tokens with email verification
- **Joi Validation**: Server-side input validation and sanitization

### Audit Logging
Comprehensive HIPAA-compliant logging of:
- Authentication events (login, logout, failed attempts)
- MFA setup/disable events
- Password changes and resets
- Profile updates
- Role assignments (admin actions)
- Session extensions
- Brute force blocks
- All security events with risk levels

### Security Headers
- **Helmet.js**: Comprehensive security headers
- **HSTS**: HTTP Strict Transport Security
- **CSP**: Content Security Policy
- **X-Frame-Options**: Clickjacking protection

## ⚙️ Environment Configuration

### Required Variables

```env
# Server Configuration
NODE_ENV=production
PORT=3000

# JWT Configuration
JWT_SECRET=your-256-bit-secret-key
JWT_REFRESH_SECRET=your-256-bit-refresh-secret

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@serenity-pathways.com

# Frontend Configuration
FRONTEND_URL=https://your-domain.com
ALLOWED_ORIGINS=https://your-domain.com,https://admin.your-domain.com
```

### Optional Variables

```env
# OAuth2
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890
```

## Monitoring

### Health Checks

```bash
# Basic health check
curl http://localhost:3001/health

# Detailed health check
curl http://localhost:3001/health/detailed
```

### Metrics
- Database connection status
- Redis connection status
- Active sessions count
- Failed login attempts
- Token usage statistics
- Response times

### Logging
Structured JSON logs with multiple levels:
- **Access logs**: HTTP requests
- **Audit logs**: Security events (HIPAA compliant)
- **Error logs**: Application errors
- **Performance logs**: Slow queries and operations

## HIPAA Compliance

### Audit Requirements
- All PHI access is logged
- Logs are encrypted and tamper-evident
- 7-year retention policy
- Automated integrity checking

### Data Protection
- Encryption at rest and in transit
- Strong password policies
- Multi-factor authentication
- Regular security assessments

### Business Associate Agreement
Production deployment requires signed BAA with all service providers.

## Development

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm test -- --grep "JWT Service"
```

### Linting

```bash
# Check code style
npm run lint

# Fix automatically
npm run lint:fix
```

### Database Migrations

```bash
# Run migrations
npm run migrate

# Create new migration
npm run migrate:create "add-new-table"
```

## Deployment

### Docker

```dockerfile
# Build production image
docker build -t serenity-auth .

# Run container
docker run -p 3001:3001 --env-file .env serenity-auth
```

### Kubernetes

```yaml
# Example deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: serenity-auth:latest
        ports:
        - containerPort: 3001
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: database-url
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run linting and tests
6. Submit a pull request

## License

Proprietary - Serenity Healthcare Platform

## Support

For technical support:
- Email: support@serenity.com
- Documentation: https://docs.serenity.com
- Issues: Create a GitHub issue