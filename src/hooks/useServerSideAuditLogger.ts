
import { useAuth } from '@/contexts/AuthContext';
import { secureServerLogEvent } from '@/services/secureServerAuditLogService';
import { formRateLimiter } from '@/lib/inputValidation';

/**
 * Hook for ultra-secure server-side audit logging
 * All encryption happens on the server, providing maximum security
 */
export const useServerSideAuditLogger = () => {
  const { user } = useAuth();
  
  const log = async (action: string, details?: Record<string, any>) => {
    // Rate limiting for audit logs
    const userKey = user?.id || 'anonymous';
    if (!formRateLimiter(userKey)) {
      console.warn('Audit logging rate limited');
      return;
    }

    await secureServerLogEvent({ 
      action, 
      details, 
      userId: user?.id 
    });
  };
  
  return { log };
};
