
import { useAuth } from '@/contexts/AuthContext';
import { EnhancedSecurityAuditService } from '@/services/enhancedSecurityAuditService';
import { formRateLimiter } from '@/lib/enhancedInputValidation';
// DEDUPLICATION: Replaces useAuditLogger and useServerSideAuditLogger
// Reason: provides RLS-compliant logging with rate limiting
main

/**
 * Hook for secure audit logging using server-side encryption only
 * Updated to work with RLS policies requiring authenticated users
 */
export const useSecureAuditLogger = () => {
  const { user } = useAuth();
  
  const log = async (action: string, details?: Record<string, any>) => {
    // Check if user is authenticated (required for RLS)
    if (!user) {
      console.warn('Cannot log audit event: User not authenticated');
      return;
    }

    // Rate limiting for audit logs
    const userKey = user.id;
    if (!formRateLimiter(userKey)) {
      console.warn('Audit logging rate limited');
      return;
    }

    await EnhancedSecurityAuditService.logSecurityEvent({
      action,
      details,
    });
  };

  const logSecurityEvent = async (eventType: string, details?: Record<string, any>) => {
    await EnhancedSecurityAuditService.logSecurityEvent({
      action: eventType,
      details: {
        event_type: eventType,
        timestamp: new Date().toISOString(),
        ...details,
      },
    });
  };

  const logDataAccess = async (table: string, operation: string, recordCount: number = 1) => {
    await EnhancedSecurityAuditService.logDataAccessEvent(table, operation, recordCount);
  };
  
  return { 
    log, 
    logSecurityEvent, 
    logDataAccess,
    isAuthenticated: !!user 
  };
};
