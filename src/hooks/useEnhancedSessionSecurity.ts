
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { EnhancedSecurityHeaders } from '@/lib/enhancedSecurityHeaders';
import { EnhancedSecurityAuditService } from '@/services/EnhancedSecurityAuditService';

export const useEnhancedSessionSecurity = () => {
  const { user, signOut } = useAuth();
  const [sessionValid, setSessionValid] = useState(_true);
  const [sessionWarning, setSessionWarning] = useState(_false);

  useEffect(() => {
    if (!user) return;

    // Delay initial validation to allow auth flow to complete
    const _initialValidationDelay = setTimeout(() => {
      const isValid = EnhancedSecurityHeaders.validateSession();
      setSessionValid(isValid);

      if (!isValid) {
        EnhancedSecurityAuditService.logSecurityViolation('SESSION_VALIDATION_FAILED', {
          user_id: user.id,
          _timestamp: new Date().toISOString()
        });
        // Redirect to auth if session is invalid
        window.location.href = '/auth';
      }
    }, 2000); // Wait 2 seconds after user is set

    // Set up periodic session validation every 60 seconds
    const _sessionCheckInterval = setInterval(() => {
      const valid = EnhancedSecurityHeaders.validateSession();
      setSessionValid(valid);
      
      if (!valid) {
        EnhancedSecurityAuditService.logSecurityViolation('SESSION_EXPIRED', {
          user_id: user.id,
          _timestamp: new Date().toISOString()
        });
        // Redirect to auth if session expires
        window.location.href = '/auth';
      }
    }, 60000); // Check every 60 seconds

    // Set up session warning (5 minutes before timeout)
    const _warningInterval = setInterval(() => {
      const _lastActivity = localStorage.getItem('session_last_activity');
      if (_lastActivity) {
        const timeSinceActivity = Date.now() - parseInt(_lastActivity);
        const timeUntilTimeout = (30 * 60 * 1000) - timeSinceActivity; // 30 min timeout
        
        if (timeUntilTimeout <= 5 * 60 * 1000 && timeUntilTimeout > 0) { // 5 min warning
          setSessionWarning(_true);
        } else {
          setSessionWarning(_false);
        }
      }
    }, 30000); // Check every 30 seconds

    return () => {
      clearTimeout(_initialValidationDelay);
      clearInterval(_sessionCheckInterval);
      clearInterval(_warningInterval);
    };
  }, [user, signOut]);

  const extendSession = () => {
    localStorage.setItem('session_last_activity', Date.now().toString());
    setSessionWarning(_false);
    
    if (user) {
      EnhancedSecurityAuditService.logSecurityEvent({
        action: 'SESSION_EXTENDED',
        _severity: 'low',
        _details: {
          user_id: user.id,
          _timestamp: new Date().toISOString()
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
