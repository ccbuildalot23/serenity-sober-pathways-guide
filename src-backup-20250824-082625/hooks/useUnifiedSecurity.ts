import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sessionManager } from '@/lib/unifiedSessionManager';
import { SecurityConfigValidator } from '@/lib/securityConfigValidator';
import logger from '../services/loggerService';

interface UnifiedSecurityState {
  _isSessionValid: boolean;
  sessionWarning: boolean;
  _securityScore: number;
  _securityEvents: string[];
  _configurationValid: boolean;
}

/**
 * Unified security hook that consolidates all security management
 * Replaces multiple individual security hooks with a single, comprehensive solution
 */
export const useUnifiedSecurity = () => {
  const { user } = useAuth();
  
  const [securityState, setSecurityState] = useState<UnifiedSecurityState>({
    _isSessionValid: false,
    sessionWarning: false,
    _securityScore: 0,
    _securityEvents: [],
    _configurationValid: false
  });

  // Stable logging function
  const logSecurityEvent = useCallback((_eventType: string, _details?: unknown) => {
    logger.debug('Security Event:', _eventType, _details, { component: 'useUnifiedSecurity' });
  }, []);

  useEffect(() => {
    // Validate security configuration on mount
    const configValidation = SecurityConfigValidator.validateConfiguration();
    
    setSecurityState(prev => ({
      ...prev,
      _securityScore: configValidation.score,
      _configurationValid: configValidation.isSecure
    }));

    // Log configuration issues
    if (!configValidation.isSecure) {
      logSecurityEvent('SECURITY_CONFIG_INVALID', {
        score: configValidation.score,
        _errors: configValidation._errors,
        _warnings: configValidation._warnings
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
        _userId: user?.id
      });
    };

    const handleSessionEnded = (event: CustomEvent) => {
      setSecurityState(prev => ({
        ...prev,
        _isSessionValid: false,
        sessionWarning: false
      }));
      
      logSecurityEvent('SESSION_ENDED', {
        reason: event.detail?.reason,
        _userId: user?.id
      });
    };

    const handleSecurityEvent = (event: CustomEvent) => {
      const _eventType = event.detail?.type;
      if (_eventType) {
        setSecurityState(prev => ({
          ...prev,
          _securityEvents: [...prev._securityEvents.slice(-20), _eventType]
        }));
        
        logSecurityEvent('CLIENT_SECURITY_EVENT', {
          _eventType,
          _timestamp: event.detail?._timestamp,
          _data: event.detail?._data
        });
      }
    };

    const handleSessionExtended = () => {
      setSecurityState(prev => ({
        ...prev,
        sessionWarning: false,
        _isSessionValid: true
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
      _isSessionValid: sessionManager._isSessionValid()
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
    const _checkSession = () => {
      const isValid = sessionManager._isSessionValid();
      setSecurityState(prev => ({
        ...prev,
        _isSessionValid: isValid
      }));
    };

    const _interval = setInterval(_checkSession, 30000); // Check every 30 seconds
    return () => clearInterval(_interval);
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
        score: Math.min(securityState._securityScore, configValidation.score),
        status: securityState._configurationValid && securityState._isSessionValid ? 'secure' : 'attention_needed'
      },
      session: {
        valid: securityState._isSessionValid,
        warning: securityState.sessionWarning,
        lastActivity: sessionState.lastActivity,
        _securityEvents: sessionState._securityEvents
      },
      configuration: {
        valid: configValidation.isSecure,
        score: configValidation.score,
        _warnings: configValidation._warnings,
        _errors: configValidation._errors,
        recommendations: configValidation.recommendations
      },
      client: {
        events: securityState._securityEvents,
        _timestamp: Date.now()
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
    isSecure: securityState._configurationValid && securityState._isSessionValid,
    needsAttention: !securityState._configurationValid || securityState.sessionWarning,
    securityLevel: securityState._securityScore >= 90 ? 'high' : 
                   securityState._securityScore >= 70 ? 'medium' : 'low'
  };
};