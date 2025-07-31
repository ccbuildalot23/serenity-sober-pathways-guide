import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sessionManager } from '@/lib/unifiedSessionManager';
import { SecurityConfigValidator } from '@/lib/securityConfigValidator';

interface UnifiedSecurityState {
  isSessionValid: boolean;
  sessionWarning: boolean;
  securityScore: number;
  securityEvents: string[];
  configurationValid: boolean;
}

/**
 * Unified security hook that consolidates all security management
 * Replaces multiple individual security hooks with a single, comprehensive solution
 */
export const useUnifiedSecurity = () => {
  const { user } = useAuth();
  
  const [securityState, setSecurityState] = useState<UnifiedSecurityState>({
    isSessionValid: false,
    sessionWarning: false,
    securityScore: 0,
    securityEvents: [],
    configurationValid: false
  });

  // Stable logging function
  const logSecurityEvent = useCallback((eventType: string, details?: any) => {
    console.log('Security Event:', eventType, details);
  }, []);

  useEffect(() => {
    // Validate security configuration on mount
    const configValidation = SecurityConfigValidator.validateConfiguration();
    
    setSecurityState(prev => ({
      ...prev,
      securityScore: configValidation.score,
      configurationValid: configValidation.isSecure
    }));

    // Log configuration issues
    if (!configValidation.isSecure) {
      logSecurityEvent('SECURITY_CONFIG_INVALID', {
        score: configValidation.score,
        errors: configValidation.errors,
        warnings: configValidation.warnings
      });
    }

    // Set up session management event listeners
    const handleSessionWarning = (event: CustomEvent) => {
      setSecurityState(prev => ({
        ...prev,
        sessionWarning: true
      }));
      
      logSecurityEvent('SESSION_WARNING_SHOWN', {
        timeRemaining: event.detail?.timeRemaining,
        userId: user?.id
      });
    };

    const handleSessionEnded = (event: CustomEvent) => {
      setSecurityState(prev => ({
        ...prev,
        isSessionValid: false,
        sessionWarning: false
      }));
      
      logSecurityEvent('SESSION_ENDED', {
        reason: event.detail?.reason,
        userId: user?.id
      });
    };

    const handleSecurityEvent = (event: CustomEvent) => {
      const eventType = event.detail?.type;
      if (eventType) {
        setSecurityState(prev => ({
          ...prev,
          securityEvents: [...prev.securityEvents.slice(-20), eventType]
        }));
        
        logSecurityEvent('CLIENT_SECURITY_EVENT', {
          eventType,
          timestamp: event.detail?.timestamp,
          data: event.detail?.data
        });
      }
    };

    const handleSessionExtended = () => {
      setSecurityState(prev => ({
        ...prev,
        sessionWarning: false,
        isSessionValid: true
      }));
    };

    // Add event listeners
    window.addEventListener('sessionWarning', handleSessionWarning as EventListener);
    window.addEventListener('sessionEnded', handleSessionEnded as EventListener);
    window.addEventListener('securityEvent', handleSecurityEvent as EventListener);
    window.addEventListener('sessionExtended', handleSessionExtended as EventListener);

    // Check initial session state
    setSecurityState(prev => ({
      ...prev,
      isSessionValid: sessionManager.isSessionValid()
    }));

    // Cleanup on unmount
    return () => {
      window.removeEventListener('sessionWarning', handleSessionWarning as EventListener);
      window.removeEventListener('sessionEnded', handleSessionEnded as EventListener);
      window.removeEventListener('securityEvent', handleSecurityEvent as EventListener);
      window.removeEventListener('sessionExtended', handleSessionExtended as EventListener);
    };
  }, [user?.id]);

  // Monitor session validity
  useEffect(() => {
    const checkSession = () => {
      const isValid = sessionManager.isSessionValid();
      setSecurityState(prev => ({
        ...prev,
        isSessionValid: isValid
      }));
    };

    const interval = setInterval(checkSession, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const extendSession = async () => {
    try {
      await sessionManager.extendSession();
      setSecurityState(prev => ({
        ...prev,
        sessionWarning: false
      }));
    } catch (error) {
      console.error('Failed to extend session:', error);
      logSecurityEvent('SESSION_EXTEND_FAILED', { error: error.message });
    }
  };

  const forceSignOut = async () => {
    try {
      await sessionManager.secureSignOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
      // Force redirect anyway
      window.location.href = '/auth';
    }
  };

  const getSecurityReport = () => {
    const sessionState = sessionManager.getSessionState();
    const configValidation = SecurityConfigValidator.validateConfiguration();
    
    return {
      overall: {
        score: Math.min(securityState.securityScore, configValidation.score),
        status: securityState.configurationValid && securityState.isSessionValid ? 'secure' : 'attention_needed'
      },
      session: {
        valid: securityState.isSessionValid,
        warning: securityState.sessionWarning,
        lastActivity: sessionState.lastActivity,
        securityEvents: sessionState.securityEvents
      },
      configuration: {
        valid: configValidation.isSecure,
        score: configValidation.score,
        warnings: configValidation.warnings,
        errors: configValidation.errors,
        recommendations: configValidation.recommendations
      },
      client: {
        events: securityState.securityEvents,
        timestamp: Date.now()
      }
    };
  };

  return {
    // State
    ...securityState,
    
    // Actions
    extendSession,
    forceSignOut,
    getSecurityReport,
    
    // Utilities
    isSecure: securityState.configurationValid && securityState.isSessionValid,
    needsAttention: !securityState.configurationValid || securityState.sessionWarning,
    securityLevel: securityState.securityScore >= 90 ? 'high' : 
                   securityState.securityScore >= 70 ? 'medium' : 'low'
  };
};