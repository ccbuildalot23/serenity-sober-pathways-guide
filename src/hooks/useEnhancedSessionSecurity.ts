
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { EnhancedSecurityHeaders } from '@/lib/enhancedSecurityHeaders';
import { EnhancedSecurityAuditService } from '@/services/enhancedSecurityAuditService';

export const useEnhancedSessionSecurity = () => {
  const { user } = useAuth();
  const [sessionValid, setSessionValid] = useState(true);
  const [sessionWarning, setSessionWarning] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Validate session on mount
    const isValid = EnhancedSecurityHeaders.validateSession();
    setSessionValid(isValid);

    if (!isValid) {
      EnhancedSecurityAuditService.logSecurityViolation('SESSION_VALIDATION_FAILED', {
        user_id: user.id,
        timestamp: new Date().toISOString()
      });
    }

    // Set up periodic session validation
    const sessionCheckInterval = setInterval(() => {
      const valid = EnhancedSecurityHeaders.validateSession();
      setSessionValid(valid);
      
      if (!valid) {
        EnhancedSecurityAuditService.logSecurityViolation('SESSION_EXPIRED', {
          user_id: user.id,
          timestamp: new Date().toISOString()
        });
      }
    }, 60000); // Check every minute

    // Set up session warning (5 minutes before timeout)
    const warningInterval = setInterval(() => {
      const lastActivity = localStorage.getItem('session_last_activity');
      if (lastActivity) {
        const timeSinceActivity = Date.now() - parseInt(lastActivity);
        const timeUntilTimeout = (30 * 60 * 1000) - timeSinceActivity; // 30 min timeout
        
        if (timeUntilTimeout <= 5 * 60 * 1000 && timeUntilTimeout > 0) { // 5 min warning
          setSessionWarning(true);
        } else {
          setSessionWarning(false);
        }
      }
    }, 30000); // Check every 30 seconds

    return () => {
      clearInterval(sessionCheckInterval);
      clearInterval(warningInterval);
    };
  }, [user]);

  const extendSession = () => {
    localStorage.setItem('session_last_activity', Date.now().toString());
    setSessionWarning(false);
    
    if (user) {
      EnhancedSecurityAuditService.logSecurityEvent({
        action: 'SESSION_EXTENDED',
        severity: 'low',
        details: {
          user_id: user.id,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  return {
    sessionValid,
    sessionWarning,
    extendSession
  };
};
