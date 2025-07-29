import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { securityComplianceService } from '@/services/securityComplianceService';
import { supabase } from '@/integrations/supabase/client';

/**
 * SECURITY FIX: Secure admin access hook replacing hardcoded verification
 */
export const useSecureAdminAccess = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const verifyAdminAccess = async (): Promise<boolean> => {
    if (!user) {
      console.warn('Admin verification attempted without authenticated user');
      return false;
    }

    setVerifying(true);
    try {
      const hasAccess = await securityComplianceService.verifyAdminAccess();
      setIsAdmin(hasAccess);
      
      if (!hasAccess) {
        // Log unauthorized admin access attempt
        await supabase.rpc('log_security_violation', {
          violation_type: 'UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT',
          details: {
            user_id: user.id,
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent
          }
        });
      }
      
      return hasAccess;
    } catch (error) {
      console.error('Admin verification failed:', error);
      setIsAdmin(false);
      return false;
    } finally {
      setVerifying(false);
    }
  };

  const executeAdminAction = async (actionType: string, action: () => Promise<void>) => {
    const hasAccess = await verifyAdminAccess();
    if (!hasAccess) {
      throw new Error('Admin access required for this action');
    }

    try {
      await supabase.rpc('log_admin_access', {
        action_type: actionType,
        details: { timestamp: new Date().toISOString() }
      });
      
      await action();
    } catch (error) {
      console.error(`Admin action ${actionType} failed:`, error);
      throw error;
    }
  };

  return {
    isAdmin,
    verifying,
    verifyAdminAccess,
    executeAdminAction
  };
};