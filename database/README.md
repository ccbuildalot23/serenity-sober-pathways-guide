# Serenity Database Schema

HIPAA-compliant PostgreSQL database schema for the Serenity healthcare platform with comprehensive security, audit logging, and performance optimization.

## 🏗️ Architecture Overview

### Core Technologies
- **PostgreSQL 14+** with HIPAA compliance features
- **Row Level Security (RLS)** for data access control
- **pgcrypto** extension for PHI encryption
- **Knex.js** for migrations and query building
- **Connection pooling** with monitoring and failover

### Security Features
- ✅ **Row Level Security** on all tables
- ✅ **PHI data encryption** using pgcrypto
- ✅ **Comprehensive audit logging** for HIPAA compliance
- ✅ **Session management** with automatic timeout
- ✅ **Multi-factor authentication** support
- ✅ **Failed login tracking** and account lockout

## 📋 Database Schema

### Core Tables

#### Authentication & Users
- **`users`** - Core user authentication and basic info
- **`user_profiles`** - Extended user information with encrypted PHI
- **`user_roles`** - Role-based access control (RBAC)
- **`user_sessions`** - JWT session management
- **`mfa_tokens`** - Multi-factor authentication tokens
- **`audit_logs`** - Comprehensive HIPAA audit trail

#### Healthcare Data
- **`daily_checkins`** - Patient mood, anxiety, sleep tracking
- **`crisis_alerts`** - Real-time crisis management system
- **`emergency_contacts`** - Tiered emergency contact system
- **`care_plans`** - Provider treatment plans
- **`appointments`** - Scheduling and session management

#### Communication & Support
- **`peer_support_messages`** - Encrypted peer messaging
- **`notifications`** - Multi-channel notification system

#### Medication Management
- **`medication_tracking`** - Prescription and adherence monitoring
- **`medication_doses`** - Individual dose tracking

### User Roles
- **`patient`** - Individuals receiving care
- **`provider`** - Healthcare professionals (doctors, therapists)
- **`supporter`** - Peer supporters and family members
- **`admin`** - System administrators

## 🔧 Setup Instructions

### Prerequisites
```bash
# Required software
- PostgreSQL 14+ with pgcrypto extension
- Node.js 18+ with npm
- OpenSSL (for backup encryption)
```

### Environment Variables
```bash
# Database Connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=serenity_dev
DB_USER=postgres
DB_PASSWORD=your_secure_password

# HIPAA Compliance
DB_ENCRYPTION_KEY=your_32_character_encryption_key_here
DB_SSL_CERT=path/to/cert.pem
DB_SSL_KEY=path/to/key.pem
DB_SSL_CA=path/to/ca.pem

# Backup Configuration
BACKUP_DIR=/secure/backup/location
BACKUP_ENCRYPTION_KEY=your_backup_encryption_key
BACKUP_S3_BUCKET=your-hipaa-compliant-s3-bucket
BACKUP_RETENTION_DAYS=30

# Application Context
APP_NAME=Serenity
NODE_ENV=development
```

### Installation & Migration

1. **Install dependencies:**
```bash
cd database/
npm install
```

2. **Run migrations:**
```bash
# Latest migrations
npm run db:migrate

# Create new migration
npm run db:migrate:make create_new_table
```

3. **Seed development data:**
```bash
# Run all seeds
npm run db:seed

# Create new seed
npm run db:seed:make test_data
```

4. **Validate schema:**
```bash
npm run db:validate
```

## 🔒 HIPAA Compliance Features

### Data Encryption
All PHI (Protected Health Information) is encrypted at rest using PostgreSQL's `pgcrypto`:

```sql
-- Encrypting sensitive data
INSERT INTO user_profiles (first_name_encrypted) 
VALUES (pgp_sym_encrypt('John', 'encryption_key'));

-- Decrypting for authorized access
SELECT pgp_sym_decrypt(first_name_encrypted::bytea, 'encryption_key') 
FROM user_profiles WHERE user_id = $1;
```

### Row Level Security (RLS)
Every table has RLS policies that enforce access control:

```sql
-- Patients can only see their own data
CREATE POLICY patient_data_policy ON daily_checkins FOR SELECT
USING (patient_id = get_current_user_id());

-- Providers can see their patients' data
CREATE POLICY provider_access_policy ON daily_checkins FOR SELECT
USING (is_provider_for_patient(get_current_user_id(), patient_id));
```

### Audit Logging
All data access and modifications are automatically logged:

```sql
-- Automatic audit trigger on all PHI tables
CREATE TRIGGER daily_checkins_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON daily_checkins
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

### Session Security
- 15-minute session timeout for PHI access
- Device tracking and concurrent session limits
- Failed login attempt tracking with automatic lockout

## 📊 Performance Optimization

### Indexes
Comprehensive indexing strategy for common query patterns:

```sql
-- Crisis response optimization
CREATE INDEX idx_crisis_alerts_active_severity 
ON crisis_alerts (status, severity, created_at DESC) 
WHERE status IN ('active', 'in_progress');

-- Patient timeline queries
CREATE INDEX idx_daily_checkins_patient_date_range 
ON daily_checkins (patient_id, checkin_date DESC);

-- Appointment scheduling
CREATE INDEX idx_appointments_provider_schedule 
ON appointments (provider_id, scheduled_start, scheduled_end, status);
```

### Materialized Views
Pre-computed analytics for dashboard performance:

```sql
-- Patient summary statistics (refreshed periodically)
CREATE MATERIALIZED VIEW patient_summary_stats AS
SELECT 
  patient_id,
  checkins_last_30_days,
  avg_mood_last_7_days,
  crisis_alerts_last_30_days,
  avg_medication_adherence
FROM patients_with_aggregated_data;
```

## 🔧 Database Operations

### Backup & Recovery
```bash
# Create encrypted backup
node scripts/backup-database.js create

# List available backups
node scripts/backup-database.js list

# Restore from backup (caution!)
node scripts/backup-database.js restore backup-file.sql.gz
```

### Schema Validation
```bash
# Comprehensive schema validation
node scripts/validate-schema.js

# Check specific components
npm run db:validate
```

### Connection Management
```javascript
// Initialize database with monitoring
const { initializeDatabase } = require('./scripts/database-config');
const db = await initializeDatabase();

// Set user context for RLS and audit logging
await db.setUserContext(userId, sessionId, ipAddress, userAgent);
```

## 🚨 Crisis Management Integration

The database includes specialized tables and triggers for crisis management:

### Crisis Alert Flow
1. **Crisis Detection** - Automated or manual crisis alert creation
2. **Immediate Response** - Emergency contacts notified via tiered system
3. **Professional Escalation** - Provider and emergency services integration
4. **Follow-up Tracking** - Post-crisis care coordination

### Emergency Contact System
- **Primary Tier** - Family, close friends (immediate notification)
- **Secondary Tier** - Extended support network (5-minute delay)
- **Professional Tier** - Healthcare providers, therapists
- **Emergency Tier** - 911, crisis hotlines (automatic escalation)

## 📱 Multi-Channel Notifications

Comprehensive notification system supporting:
- **SMS** - Crisis alerts, appointment reminders
- **Email** - Care plan updates, medication reminders
- **Push** - Daily check-in prompts, peer messages
- **In-App** - System notifications, provider messages
- **Voice** - Emergency crisis support

## 🧪 Development & Testing

### Test Data
The database includes comprehensive seed data for development:

```bash
# Test accounts (development only!)
admin@serenity.com / TestPass123! (Admin)
patient1@serenity.com / TestPass123! (John Doe - Depression/Anxiety)
patient2@serenity.com / TestPass123! (Jane Smith - Substance Abuse)
provider1@serenity.com / TestPass123! (Dr. Johnson - Psychiatrist)
therapist@serenity.com / TestPass123! (Michael T. - Therapist)
```

### Migration Strategy
```bash
# Development workflow
1. Create feature branch
2. Add migration: npm run db:migrate:make feature_name
3. Test migration: npm run db:migrate
4. Add seed data if needed: npm run db:seed:make feature_data
5. Validate schema: npm run db:validate
6. Commit and test in staging environment
```

## 🔍 Monitoring & Maintenance

### Health Checks
- Connection pool monitoring
- Query performance tracking  
- RLS policy validation
- Backup verification
- Audit log analysis

### Maintenance Tasks
```bash
# Refresh analytics views
SELECT refresh_patient_summary_stats();

# Cleanup expired sessions
DELETE FROM user_sessions WHERE expires_at < NOW();

# Archive old audit logs (retain for 7 years per HIPAA)
# Automated via scheduled job
```

## ⚠️ Security Considerations

### Production Deployment
- Never use development encryption keys in production
- Enable SSL/TLS for all database connections
- Implement database firewall rules
- Regular security audits and penetration testing
- Encrypted backups with secure key management
- Monitor all PHI access via audit logs

### Compliance Requirements
- **HIPAA** - All PHI encrypted, comprehensive audit trails
- **SOX** - Financial data controls (if applicable)
- **GDPR** - Data portability and right to be forgotten
- **State Regulations** - Mental health privacy laws

## 📚 Additional Resources

- [PostgreSQL Row Level Security Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [pgcrypto Encryption Functions](https://www.postgresql.org/docs/current/pgcrypto.html)
- [HIPAA Compliance Guidelines](https://www.hhs.gov/hipaa/index.html)
- [Knex.js Migration Guide](https://knexjs.org/guide/migrations.html)

---

**⚠️ IMPORTANT:** This database contains sensitive healthcare information (PHI). Ensure all production deployments follow HIPAA compliance guidelines and your organization's security policies.