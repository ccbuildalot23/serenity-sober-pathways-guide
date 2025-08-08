# Serenity Crisis Notification System - Week 1 Implementation

## Overview

This document outlines the complete backend architecture for Serenity's in-app notification system, implemented as Week 1 of our pivot from SMS to in-app notifications. The system integrates seamlessly with the existing serenity-crisis-mcp server while providing real-time WebSocket-based notifications.

## Architecture Components

### 1. Database Schema (`0004_crisis_notification_system.sql`)

**Core Tables:**
- `crisis_alert_notifications` - Crisis-specific alerts with staggered timing
- `supporter_responses` - Detailed response tracking with coordination
- `notification_queue` - Priority queue with retry logic
- `realtime_delivery_status` - WebSocket delivery confirmation
- `crisis_escalation_logs` - Escalation decision tracking

**Key Features:**
- **Staggered Timing**: 30s/90s/3min delays based on severity and tier
- **Retry Logic**: Exponential backoff with configurable max retries
- **Real-time Tracking**: WebSocket connection and delivery status
- **Response Coordination**: Primary responder assignment and backup management
- **Escalation Management**: Multi-tier escalation with professional services

### 2. Real-time Notification Service (`RealtimeNotificationService.ts`)

**Features:**
- WebSocket connection management with auto-reconnect
- Delivery confirmation and read receipt tracking
- Real-time status updates for crisis alerts
- Connection health monitoring with heartbeat
- Automatic notification acknowledgment for non-critical alerts

**Usage:**
```typescript
import { realtimeNotificationService } from '@/services/RealtimeNotificationService';

// Subscribe to notifications
const unsubscribe = realtimeNotificationService.onNotification((notification) => {
  console.log('New notification:', notification);
});

// Acknowledge notification
await realtimeNotificationService.acknowledgeNotification(notificationId, message);
```

### 3. Crisis Integration Service (`CrisisNotificationIntegration.ts`)

**Core Functions:**
- `createCrisisAlert()` - Create alert with staggered timing
- `recordSupporterResponse()` - Track responses with coordination
- `escalateCrisis()` - Handle escalation to next tier/emergency
- `getCrisisStatus()` - Real-time status with comprehensive details
- `resolveCrisis()` - Resolution with follow-up tracking

**Integration Features:**
- Automatic tier calculation (primary/secondary/emergency)
- Severity-based timing multipliers (critical: 0.5x, low: 4.0x)
- Response coordination to prevent supporter chaos
- Professional and emergency service escalation

### 4. MCP Integration Bridge (`McpIntegrationBridge.ts`)

**Purpose:**
Seamlessly connects the in-app system with the existing serenity-crisis-mcp server, maintaining compatibility with all 5 MCP tools:

- `sendCrisisAlert` - Unified alert creation
- `trackResponse` - Response coordination
- `escalateSupport` - Multi-system escalation
- `getAlertStatus` - Combined status from both systems
- `resolveAlert` - Synchronized resolution

**Health Monitoring:**
- Real-time system health checks
- Failover capabilities when MCP unavailable
- Unified response coordination across systems

### 5. React Hook (`useCrisisManagement.ts`)

**Comprehensive Crisis Management:**
```typescript
const {
  createCrisisAlert,
  respondToAlert,
  escalateAlert,
  resolveAlert,
  activeCrisis,
  crisisStatus,
  notifications,
  connectionStatus,
  systemHealth
} = useCrisisManagement(alertId);
```

**Features:**
- Real-time crisis status updates
- Notification management with unread counts
- Connection status monitoring
- Error handling with toast notifications
- Loading states for all operations

### 6. Crisis Dashboard Component (`CrisisNotificationDashboard.tsx`)

**Dashboard Sections:**
- **Overview**: System metrics and recent activity
- **Active Crisis**: Real-time crisis management with response options
- **Responses**: Supporter response tracking with coordination status
- **Notifications**: Real-time notification management

**Crisis Management Actions:**
- Create crisis alerts with severity levels
- Respond to alerts (acknowledged, on my way, made contact, etc.)
- Escalate to next tier, professional, or emergency services
- Resolve crises with follow-up tracking

### 7. Notification Queue Processor (`notification-processor/index.ts`)

**Edge Function Features:**
- Batch processing of queued notifications
- Retry logic with exponential backoff
- Multi-channel support (in-app, push, email, WhatsApp ready)
- Automatic cleanup of old processed notifications
- Real-time delivery status tracking

**Processing Flow:**
1. Fetch pending notifications by priority
2. Process each notification by channel
3. Update delivery status with retry logic
4. Create real-time delivery tracking records
5. Clean up old processed notifications

## Integration with Existing MCP System

### MCP Tools Integration

The system maintains full compatibility with the existing serenity-crisis-mcp server:

**1. sendCrisisAlert Integration:**
- Creates in-app alert with database tracking
- Calls MCP tool with supporter tier data
- Links MCP alert ID with in-app alert
- Provides unified response with both system statuses

**2. trackResponse Integration:**
- Records response in in-app database
- Coordinates with ResponseCoordinatorService
- Updates MCP system with response data
- Handles conflict resolution between responders

**3. escalateSupport Integration:**
- Triggers escalation in both systems
- Maintains escalation logs and decision tracking
- Coordinates emergency service activation
- Provides unified escalation status

**4. getAlertStatus Integration:**
- Combines status from both systems
- Provides comprehensive response summary
- Real-time connection status
- Historical escalation tracking

**5. resolveAlert Integration:**
- Resolves in both in-app and MCP systems
- Cancels pending notifications
- Records resolution details and follow-up needs
- Updates all related status records

### Response Coordinator Integration

The existing `ResponseCoordinatorService` is fully integrated:

- **Primary Responder Assignment**: First to make contact becomes primary
- **Backup Coordination**: Other responders automatically set as backup
- **Conflict Resolution**: Intelligent delegation when multiple responders arrive
- **Emergency Protocol**: Automatic activation when 911 is called
- **Escalation Management**: Automated next-tier notification when needed

## Installation and Setup

### 1. Database Setup

```sql
-- Run the complete setup script
psql -d your_database -f scripts/setup-crisis-notifications.sql
```

This script:
- Creates all required tables and indexes
- Sets up Row Level Security policies
- Creates sample test data
- Enables Supabase Realtime
- Creates monitoring functions and views

### 2. Edge Function Deployment

```bash
# Deploy the notification processor
supabase functions deploy notification-processor

# Set up cron job for processing (every 30 seconds)
supabase functions cron notification-processor "*/30 * * * * *"
```

### 3. Environment Configuration

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: Claude API for enhanced messaging (Week 2)
CLAUDE_API_KEY=your_claude_api_key
```

### 4. React Integration

```typescript
// Add to your main app component
import { RealtimeNotificationService } from '@/services/RealtimeNotificationService';
import { useCrisisManagement } from '@/hooks/useCrisisManagement';
import CrisisNotificationDashboard from '@/components/crisis/CrisisNotificationDashboard';

// Initialize real-time service on app startup
useEffect(() => {
  // Service auto-initializes on import
  return () => {
    realtimeNotificationService.disconnect();
  };
}, []);
```

## Testing the System

### Test Users Created

The setup script creates three test users:

- **patient@serenity.test** / password123 (Patient role)
- **supporter1@serenity.test** / password123 (Primary supporter/sponsor)
- **supporter2@serenity.test** / password123 (Secondary supporter/friend)

### Test Flow

1. **Login as Patient**:
   - Access Crisis Dashboard
   - Create crisis alert with different severity levels
   - Monitor real-time status updates

2. **Login as Supporter**:
   - Receive real-time notifications
   - Respond with different response types
   - Observe coordination with other supporters

3. **Test Escalation**:
   - Create critical alert
   - Have supporters request help
   - Observe automatic escalation to next tier

4. **Test Resolution**:
   - Have supporter make contact
   - Resolve crisis with follow-up notes
   - Verify all notifications are cancelled

## Monitoring and Health Checks

### System Health Function

```sql
SELECT public.get_system_health();
```

Returns:
- Queue status and failed notification counts
- Active crisis count
- Average response time metrics
- Overall system health status

### Real-time Monitoring

The dashboard provides real-time monitoring of:
- WebSocket connection status
- In-app and MCP system health
- Active crisis status
- Notification delivery rates
- Response coordination effectiveness

## Staggered Timing Configuration

The system implements sophisticated staggered timing:

**Base Delays:**
- Primary tier: 30 seconds
- Secondary tier: 90 seconds  
- Emergency tier: 3 minutes

**Severity Multipliers:**
- Critical: 0.5x (faster response)
- High: 1.0x (standard timing)
- Medium: 2.0x (slower, less urgent)
- Low: 4.0x (much slower, check-in level)

**Example:**
A **critical** alert to **secondary** tier = 90 seconds × 0.5 = 45 seconds delay

## Security and HIPAA Compliance

### Row Level Security

All tables have comprehensive RLS policies:
- Users can only access their own crisis data
- Supporters can only see alerts they're involved in
- Service role has full access for system operations
- Analytics restricted to admin users

### Audit Logging

Complete audit trail maintained:
- All crisis alerts logged with full context
- Response coordination decisions recorded
- Escalation reasons and outcomes tracked
- Real-time delivery status for compliance

## Performance Optimizations

### Database Indexes

Strategic indexes for high-performance queries:
- Real-time notification lookups
- Crisis status queries
- Response coordination lookups
- Queue processing optimization

### Caching Strategy

- React Query for client-side caching
- Real-time invalidation on updates
- Connection pooling for database efficiency
- Optimistic updates for responsive UI

## Week 2 Preparation

This Week 1 implementation prepares for Week 2 WhatsApp integration:

**Ready for WhatsApp:**
- Channel-agnostic notification queue
- Template system for WhatsApp Business API
- Phone number opt-in tracking
- WhatsApp-specific delivery status
- Unified response handling across channels

**WhatsApp Components Ready:**
- `whatsapp_opt_ins` table for consent management
- `notification_templates` with WhatsApp support
- Channel switching in notification queue
- WhatsApp delivery status in real-time tracking

## Support and Troubleshooting

### Common Issues

1. **WebSocket Connection Issues**:
   - Check Supabase Realtime is enabled
   - Verify authentication tokens
   - Monitor connection status in dashboard

2. **MCP Integration Problems**:
   - Check MCP server is running
   - Verify bridge health checks
   - Review error logs in browser console

3. **Notification Delivery Issues**:
   - Check notification queue status
   - Verify Edge Function deployment
   - Review retry counts and error messages

### Debugging Tools

- Real-time dashboard with system health
- Browser console for detailed error logs
- Database monitoring functions
- Edge Function logs in Supabase dashboard

## Conclusion

This Week 1 implementation provides a complete, production-ready crisis notification system with:

✅ **Real-time in-app notifications** via WebSocket
✅ **Seamless MCP integration** with existing tools
✅ **Intelligent response coordination** preventing chaos
✅ **Staggered timing** based on severity and tier
✅ **Comprehensive monitoring** and health checks
✅ **HIPAA-compliant** security and audit logging
✅ **Scalable architecture** ready for WhatsApp integration

The system is ready for immediate deployment and testing, with full preparation for Week 2 WhatsApp Business API integration.