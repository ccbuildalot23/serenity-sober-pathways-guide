import { useAuth } from '@/contexts/AuthContext';
import { EnhancedSecurityAuditService } from '@/services/EnhancedSecurityAuditService';
import { formRateLimiter } from '@/lib/enhancedInputValidation';
import logger from '../services/loggerService';
// DEDUPLICATION: Replaces useAuditLogger and useServerSideAuditLogger
// Reason: provides RLS-compliant logging with rate limiting

/**
 * Hook for secure audit logging using server-side encryption only
 * Updated to work with RLS policies requiring authenticated users
 */
export const useSecureAuditLogger = () => {
  const { user } = useAuth();
  
  const log = async (action: string, details?: Record<string, any>) => {
    // Check if user is authenticated (required for RLS)
    if (!user) {
      logger.warn('Cannot log audit event: User not authenticated', { component: 'useSecureAuditLogger' });
      return;
    }

    // Rate limiting for audit logs
    const userKey = user.id;
    if (!formRateLimiter(userKey)) {
      logger.warn('Audit logging rate limited', { component: 'useSecureAuditLogger' });
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
        _timestamp: new Date().toISOString(),
        ...details,
      },
    });
  };

  const logDataAccess = async (_table: string, _operation: string, _recordCount: number = 1) => {
    await EnhancedSecurityAuditService.logDataAccessEvent(_table, _operation, _recordCount);
  };
  
  return { 
    log, 
    logSecurityEvent, 
    logDataAccess,
    isAuthenticated: !!user 
  };
};