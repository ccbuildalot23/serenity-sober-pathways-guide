import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSecureAuditLogger } from '@/hooks/useSecureAuditLogger';
import logger from '../services/loggerService';

// HIPAA-compliant session timeout configuration
export const SESSION_CONFIG = {
  TIMEOUT_MINUTES: 15,
  WARNING_MINUTES: 2,
  ACTIVITY_THRESHOLD_MS: 1000, // Minimum time between activity resets
} as const;

const SESSION_TIMEOUT_MS = SESSION_CONFIG.TIMEOUT_MINUTES * 60 * 1000;
const WARNING_TIMEOUT_MS = (SESSION_CONFIG.TIMEOUT_MINUTES - SESSION_CONFIG.WARNING_MINUTES) * 60 * 1000;

// Activity events to monitor for user activity
const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove', 
  'keydown',
  'scroll',
  'touchstart',
  'click',
  'focus',
  'blur'
] as const;

export interface SessionTimeoutState {
  showWarning: boolean;
  timeRemaining: number;
  isActive: boolean;
}

export interface SessionTimeoutActions {
  extendSession: () => Promise<void>;
  signOutNow: () => Promise<void>;
  resetTimers: () => void;
  clearPHIData: () => void;
}

/**
 * Custom hook for managing HIPAA-compliant session timeout
 * Handles 15-minute timeout with 2-minute warning and PHI data clearing
 */
export const useSessionTimeout = (): SessionTimeoutState & SessionTimeoutActions => {
  const { user, signOut } = useAuth();
  const { logSecurityEvent } = useSecureAuditLogger();
  
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isActive, setIsActive] = useState(false);
  
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  /**
   * Clear all PHI data from memory and storage
   * This ensures compliance with HIPAA data protection requirements
   */
  const clearPHIData = useCallback(() => {
    try {
      logger.debug('Clearing PHI data for HIPAA compliance...', { component: 'useSessionTimeout' });
      
      // Define PHI-related storage keys that need to be cleared
      const phiKeys = [
        'daily_checkins',
        'user_profile',
        'recovery_plan',
        'crisis_plan',
        'support_contacts',
        'provider_notes',
        'treatment_plan',
        'assessment_data',
        'peer_messages',
        'medication_reminders',
        'appointment_data',
        'health_records',
        'therapy_notes',
        'billing_info'
      ];
      
      // Clear from both localStorage and sessionStorage
      phiKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        } catch (error) {
          logger.warn(`Failed to clear storage key ${key}:`, error, { component: 'useSessionTimeout' });
        }
      });
      
      // Reset all form data that might contain PHI
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        try {
          if (form.reset && typeof form.reset === 'function') {
            form.reset();
          }
        } catch (error) {
          logger.warn('Failed to reset form:', error, { component: 'useSessionTimeout' });
        }
      });
      
      // Clear sensitive input fields
      const sensitiveInputs = document.querySelectorAll(
        'input[type="text"], input[type="email"], input[type="tel"], textarea'
      );
      sensitiveInputs.forEach(input => {
        try {
          if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
            input.value = '';
          }
        } catch (error) {
          logger.warn('Failed to clear input:', error, { component: 'useSessionTimeout' });
        }
      });
      
      // Clear any cached API responses
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            if (cacheName.includes('phi') || cacheName.includes('health') || cacheName.includes('patient')) {
              caches.delete(cacheName);
            }
          });
        });
      }
      
      logger.debug('PHI data successfully cleared', { component: 'useSessionTimeout' });
    } catch (error) {
      console.error('Critical error clearing PHI data:', error);
      // Even if clearing fails, we should continue with logout
    }
  }, []);

  /**
   * Clear all active timers
   */
  const clearTimers = useCallback(() => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  /**
   * Handle session timeout - log event, clear data, and sign out
   */
  const handleTimeout = useCallback(async () => {
    try {
      logger.debug('Session timeout triggered - signing out user', { component: 'useSessionTimeout' });
      
      // Log timeout event for audit trail
      await logSecurityEvent('session_timeout', {
        user_id: user?.id,
        timeout_duration_minutes: SESSION_CONFIG.TIMEOUT_MINUTES,
        timestamp: new Date().toISOString(),
        reason: 'inactivity_timeout',
        client_type: 'web'
      });
      
      // Clear PHI data before signing out
      clearPHIData();
      
      // Sign out user
      await signOut();
    } catch (error) {
      console.error('Error during session timeout:', error);
      // Force redirect even if logout fails
      clearPHIData();
      window.location.href = '/auth';
    }
  }, [user, logSecurityEvent, clearPHIData, signOut]);

  /**
   * Reset session timers based on user activity
   */
  const resetTimers = useCallback(() => {
    clearTimers();
    setShowWarning(false);
    lastActivityRef.current = Date.now();
    
    // Only set timers if user is authenticated
    if (!user) {
      setIsActive(false);
      return;
    }
    
    setIsActive(true);
    
    // Set warning timer (13 minutes)
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true);
      setTimeRemaining(SESSION_CONFIG.WARNING_MINUTES * 60);
      
      // Start countdown timer
      countdownIntervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Log warning event
      logSecurityEvent('session_timeout_warning', {
        user_id: user.id,
        warning_time_minutes: SESSION_CONFIG.WARNING_MINUTES,
        timestamp: new Date().toISOString()
      });
    }, WARNING_TIMEOUT_MS);
    
    // Set final timeout timer (15 minutes)
    sessionTimeoutRef.current = setTimeout(() => {
      handleTimeout();
    }, SESSION_TIMEOUT_MS);
  }, [user, logSecurityEvent, handleTimeout, clearTimers]);

  /**
   * Handle user activity - reset timers if enough time has passed
   */
  const handleActivity = useCallback(() => {
    if (!user) return;
    
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    
    // Only reset if enough time has passed to avoid excessive resets
    if (timeSinceLastActivity > SESSION_CONFIG.ACTIVITY_THRESHOLD_MS) {
      resetTimers();
    }
  }, [user, resetTimers]);

  /**
   * Extend the session - reset timers and log the event
   */
  const extendSession = useCallback(async () => {
    try {
      await logSecurityEvent('session_extended', {
        user_id: user?.id,
        extended_duration_minutes: SESSION_CONFIG.TIMEOUT_MINUTES,
        timestamp: new Date().toISOString(),
        extension_trigger: 'user_action'
      });
      
      resetTimers();
    } catch (error) {
      console.error('Error extending session:', error);
      // Still reset timers even if logging fails
      resetTimers();
    }
  }, [user, logSecurityEvent, resetTimers]);

  /**
   * Manual sign out from warning dialog
   */
  const signOutNow = useCallback(async () => {
    try {
      await logSecurityEvent('manual_signout_from_timeout_warning', {
        user_id: user?.id,
        timestamp: new Date().toISOString()
      });
      
      clearPHIData();
      await signOut();
    } catch (error) {
      console.error('Error during manual sign out:', error);
      clearPHIData();
      window.location.href = '/auth';
    }
  }, [user, logSecurityEvent, clearPHIData, signOut]);

  // Set up activity listeners and timers
  useEffect(() => {
    if (!user) {
      clearTimers();
      setIsActive(false);
      return;
    }

    // Add activity event listeners
    ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, handleActivity, { 
        passive: true,
        capture: true 
      });
    });

    // Initialize timers
    resetTimers();

    // Log session start
    logSecurityEvent('session_started', {
      user_id: user.id,
      timeout_duration_minutes: SESSION_CONFIG.TIMEOUT_MINUTES,
      warning_duration_minutes: SESSION_CONFIG.WARNING_MINUTES,
      timestamp: new Date().toISOString()
    });

    // Cleanup function
    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        document.removeEventListener(event, handleActivity, { capture: true });
      });
      clearTimers();
    };
  }, [user, handleActivity, resetTimers, clearTimers, logSecurityEvent]);

  return {
    // State
    showWarning,
    timeRemaining,
    isActive,
    
    // Actions
    extendSession,
    signOutNow,
    resetTimers,
    clearPHIData
  };
};