
import { useAuth } from '@/contexts/AuthContext';
import { secureServerLogEvent } from '@/services/secureServerAuditLogService';
import { formRateLimiter } from '@/lib/inputValidation';

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

    await secureServerLogEvent({ 
      action, 
      details, 
      userId: user.id 
    });
  };

  const logSecurityEvent = async (eventType: string, details?: Record<string, any>) => {
    await log(`SECURITY_${eventType}`, {
      event_type: eventType,
      timestamp: new Date().toISOString(),
      ...details
    });
  };

  const logDataAccess = async (table: string, operation: string, recordCount: number = 1) => {
    await log('DATA_ACCESS', {
      table,
      operation,
      record_count: recordCount,
      timestamp: new Date().toISOString()
    });
  };
  
  return { 
    log, 
    logSecurityEvent, 
    logDataAccess,
    isAuthenticated: !!user 
  };
};
