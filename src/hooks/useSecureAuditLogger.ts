
import { useAuth } from '@/contexts/AuthContext';
import { secureLogEvent } from '@/services/secureAuditLogService';
import { formRateLimiter } from '@/lib/inputValidation';

export const useSecureAuditLogger = () => {
  const { user } = useAuth();
  
  const log = async (action: string, details?: Record<string, any>) => {
    // Rate limiting for audit logs
    const userKey = user?.id || 'anonymous';
    if (!formRateLimiter(userKey)) {
      console.warn('Audit logging rate limited');
      return;
    }

    await secureLogEvent({ 
      action, 
      details, 
      userId: user?.id 
    });
  };
  
  return { log };
};
