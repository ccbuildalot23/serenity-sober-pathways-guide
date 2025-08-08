# Crisis Notification UI Components

This directory contains the frontend UI components for Serenity's in-app crisis communication system. These components provide intuitive, shame-free interfaces for crisis alerts and support coordination.

## Components Overview

### Core Components

#### `CrisisAlertButton.tsx`
- **Purpose**: Enhanced crisis alert button with improved UX
- **Features**:
  - Gentle, non-alarming design to reduce stigma
  - Visual feedback when alert is sent
  - Quick access to 988 crisis lifeline
  - Status indicators showing support availability
  - Accessibility optimized with ARIA labels
  - Gentle animations and micro-interactions

#### `NotificationPanel.tsx`
- **Purpose**: Displays active crisis alerts in a side panel
- **Features**:
  - Real-time notification display
  - Expandable/collapsible interface
  - Severity-based color coding and prioritization
  - Quick action buttons (acknowledge, respond, escalate)
  - Connection status indicator
  - Auto-expansion for critical alerts

#### `SupportNetworkDashboard.tsx`
- **Purpose**: Coordination dashboard for supporters
- **Features**:
  - Live view of supporter availability and responses
  - Response coordination to prevent conflicts
  - Clear acknowledgment options ("I see this", "On my way", "Made contact")
  - Escalation indicators when no one responds
  - Tier-based support organization (primary, secondary, emergency)
  - ETA tracking for responders

#### `CrisisNotificationToasts.tsx`
- **Purpose**: Real-time toast notifications for incoming alerts
- **Features**:
  - Severity-based toast styling and duration
  - Quick action buttons embedded in toasts
  - Emergency call integration for critical alerts
  - Gentle sound and vibration notifications
  - Privacy and security messaging

#### `CrisisNotificationBell.tsx`
- **Purpose**: Header notification indicator with dropdown
- **Features**:
  - Unread count badge
  - Connection status indicator
  - Quick preview of recent notifications
  - Inline quick actions
  - Responsive design for different screen sizes

### Supporting Components

#### `useCrisisNotifications.ts`
- **Purpose**: Custom hook for notification state management
- **Features**:
  - Real-time notification subscriptions
  - Connection status monitoring
  - Local state management with optimistic updates
  - Error handling with user feedback
  - Notification acknowledgment and dismissal

## Integration

### Enhanced Crisis System Integration

The components integrate with the existing `EnhancedCrisisSystem`:

```tsx
import { 
  CrisisAlertButton,
  NotificationPanel,
  SupportNetworkDashboard,
  CrisisNotificationToasts,
  CrisisNotificationBell
} from '@/components/crisis';

// In your app layout or crisis system:
<CrisisAlertButton onCrisisActivated={handleCrisisActivated} />
<CrisisNotificationToasts />
<NotificationPanel />
<SupportNetworkDashboard />
```

### Real-time Service Integration

All components integrate with the `RealtimeNotificationService`:

```tsx
import { realtimeNotificationService } from '@/services/RealtimeNotificationService';

// Subscribe to notifications
const unsubscribe = realtimeNotificationService.onNotification((notification) => {
  // Handle incoming notifications
});
```

## Design Principles

### Shame-Free Communication
- Gentle, supportive language throughout all interfaces
- Non-alarming colors and animations
- Privacy and security messaging to build trust
- Encouraging feedback when actions are taken

### Accessibility
- ARIA labels and roles for screen readers
- Keyboard navigation support
- High contrast indicators for status
- Clear visual hierarchy

### Crisis Response Coordination
- Prevent multiple supporters from responding to same location
- Clear status indicators for all participants
- Escalation paths when primary support is unavailable
- Real-time updates to prevent confusion

### Mobile-First Design
- Touch-friendly button sizes
- Responsive layouts
- Haptic feedback for mobile devices
- Optimized for one-handed operation during crisis

## Styling

All components use:
- **Tailwind CSS** for styling
- **shadcn/ui** components for consistency
- **Lucide React** icons
- **date-fns** for time formatting
- **Sonner** for toast notifications

## State Management

Components use a combination of:
- **React Context** for authentication
- **Custom hooks** for crisis-specific state
- **Real-time subscriptions** via Supabase
- **Local component state** for UI interactions

## Testing Considerations

When testing these components:

1. **Real-time Connectivity**: Test with network interruptions
2. **Multiple Supporters**: Test coordination scenarios
3. **Mobile Devices**: Test touch interactions and responsive design
4. **Accessibility**: Test with screen readers and keyboard navigation
5. **Crisis Scenarios**: Test with different severity levels and response patterns

## Security Notes

- All notifications are encrypted in transit
- User locations are approximate, not precise
- Support network information is role-based
- Audit logging tracks all crisis interactions
- HIPAA compliance maintained throughout

## Future Enhancements

Planned improvements:
- Voice activation integration
- Offline support for crisis alerts
- Advanced supporter matching algorithms
- Integration with external emergency services
- Multi-language support for crisis communication