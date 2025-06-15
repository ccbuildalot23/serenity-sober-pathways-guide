# Deduplication Refactoring Plan

This document lists remaining duplicate areas and migration checklists for consolidating onto the advanced implementations.

## Notification Banner
- **Kept**: `src/components/dashboard/NotificationBanner.tsx`
- **Deprecated**: `src/components/NotificationBanner.tsx` (already removed)
- **Reason**: Uses `notificationPermissionService` and advanced dismissal logic.
- **Dependencies to update**: none (generic component removed and not referenced).

## Secure Audit Logging
- **Kept**: `src/services/enhancedSecurityAuditService.ts`
- **Deprecated**: `src/services/auditLogService.ts`, `src/services/secureAuditLogService.ts`
- **Reason**: Adds RLS compliance, severity levels, and user checks.
- **Dependencies to update**:
  - `src/hooks/useSecureAuditLogger.ts`
  - `src/components/security/SecurityInitializer.tsx`

## Input Validation
- **Kept**: `src/lib/enhancedInputValidation.ts`
- **Deprecated**: `src/lib/inputValidation.ts`
- **Reason**: Consolidated sanitizers and rate limiters in one module.
- **Dependencies to update**: all imports updated during prior PRs.

## CBT Skills Library
- **Kept**: `src/components/cbt/EnhancedCBTSkillsLibrary.tsx`
- **Deprecated**: `src/components/cbt/CBTSkillsLibrary.tsx` (removed)
- **Dependencies to update**: none (references already switched).

## Crisis System
- **Kept**: `src/components/crisis/EnhancedCrisisSystem.tsx`
- **Deprecated**: `src/components/crisis/CrisisInterventionSystem.tsx` (removed)
- **Dependencies to update**: none.

## Calendar Page
- **Kept**: `src/pages/EnhancedCalendar.tsx` and `src/components/calendar/EnhancedCalendar.tsx`
- **Deprecated**: `src/pages/Calendar.tsx`
- **Dependencies to update**: none.

## Realtime Service
- **Kept**: `src/services/enhancedRealtimeService.ts`
- **Deprecated**: `src/services/realtimeService.ts` (removed)
- **Reason**: Enhanced connection monitoring now includes alert broadcasting and presence updates.
- **Dependencies updated**:
  - `src/components/support/CrisisProtocolSetup.tsx`
  - `src/components/RealtimeDebugPanel.tsx`
  - all hooks previously importing `realtimeService`

**Migration Completed**
All features were ported to `enhancedRealtimeService` and imports updated. The legacy service and related helpers were removed.

