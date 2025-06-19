# Deduplication Refactoring Plan

This document summarizes decisions made during code consolidation and lists remaining tasks to complete the migration to advanced implementations.

## Consolidated Components and Services

### Enhanced CBT Skills Library
DEDUPLICATION: Keeping `src/components/cbt/EnhancedCBTSkillsLibrary.tsx` over the removed `src/components/cbt/CBTSkillsLibrary.tsx`.
Reason: enhanced tracking and personalized modules.

### Enhanced Crisis System
DEDUPLICATION: Keeping `src/components/crisis/EnhancedCrisisSystem.tsx` over the removed `src/components/crisis/CrisisInterventionSystem.tsx`.
Reason: includes additional security checks and voice activation support.

### Enhanced Calendar Page
DEDUPLICATION: Keeping `src/components/calendar/EnhancedCalendar.tsx` and loading
it dynamically from `src/pages/Calendar.tsx`.
`src/pages/Calendar.tsx` now provides a runtime-safe fallback calendar.
Reason: improved hooks, notifications, export options and graceful loading.

### Notification Banner
DEDUPLICATION: Keeping `src/components/dashboard/NotificationBanner.tsx`.
`src/components/NotificationBanner.tsx` was removed.
Reason: dashboard version handles permission checks and richer behavior.

### Audit Logging
DEDUPLICATION: Keeping `src/hooks/useSecureAuditLogger.ts` with `src/services/enhancedSecurityAuditService.ts`.
Files removed: `src/hooks/useAuditLogger.ts`, `src/services/auditLogService.ts`, `src/services/secureAuditLogService.ts`, `src/services/secureServerAuditLogService.ts`.
Reason: consolidated audit flow with stronger authentication and rate limiting.

### Toast Utility
DEDUPLICATION: Keeping `src/hooks/use-toast.ts` and deleting wrapper `src/components/ui/use-toast.ts`.

## Remaining Duplicate: Realtime Services
Two realtime services exist:
- `src/services/realtimeService.ts` – provides alert broadcasting, presence updates and polling fallback.
- `src/services/enhancedRealtimeService.ts` – focuses on connection health monitoring but lacks alert and presence helpers.

### Migration Checklist
- Files currently importing `realtimeService.ts`:
  - `src/components/RealtimeDebugPanel.tsx`
  - `src/components/support/CrisisProtocolSetup.tsx`
  - `src/hooks/useRealtimeUpdates.ts`
  - `src/services/realtime/connectionMonitor.ts`
  - `src/services/realtime/useRealtimeHook.ts`
  - `src/services/recoveryService.ts`
- Files importing `enhancedRealtimeService.ts`:
  - `src/components/admin/SystemHealthDashboard.tsx`

To fully consolidate, port alert broadcasting and presence update features to `enhancedRealtimeService.ts` or update the above consumers to use it once feature parity is achieved.

