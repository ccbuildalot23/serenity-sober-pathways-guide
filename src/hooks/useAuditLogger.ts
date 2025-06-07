import { useAuth } from '@/contexts/AuthContext';
import { logEvent } from '@/services/auditLogService';

export const useAuditLogger = () => {
  const { user } = useAuth();
  const log = async (action: string, details?: Record<string, any>) => {
    await logEvent({ action, details, userId: user?.id });
  };
  return { log };
};
