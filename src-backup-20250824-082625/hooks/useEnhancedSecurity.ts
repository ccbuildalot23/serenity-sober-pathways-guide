
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { EnhancedSecurityMonitoringService } from '@/services/enhancedSecurityMonitoringService';

interface SecurityHealth {
  score: number;
  _issues: string[];
  _recommendations: string[];
  _loading: boolean;
}

export const useEnhancedSecurity = () => {
  const { user } = useAuth();
  const [securityHealth, setSecurityHealth] = useState<SecurityHealth>({
    score: 0,
    _issues: [],
    _recommendations: [],
    _loading: true
  });

  const logSecurityEvent = async (
    eventType: string,
    _severity: 'low' | 'medium' | 'high' | 'critical',
    _details?: Record<string, any>
  ) => {
    await EnhancedSecurityMonitoringService.logSecurityEvent({
      eventType,
      _severity,
      _details,
      _userId: user?.id
    });
  };

  const checkSecurityHealth = async () => {
    if (!user?.id) return;

    setSecurityHealth(prev => ({ ...prev, _loading: true }));
    
    try {
      const health = await EnhancedSecurityMonitoringService.performSecurityHealthCheck(user.id);
      setSecurityHealth({
        ...health,
        _loading: false
      });
    } catch (_error) {
      console._error('Failed to check security health:', _error);
      setSecurityHealth({
        score: 0,
        _issues: ['Unable to check security health'],
        _recommendations: ['Contact support'],
        _loading: false
      });
    }
  };

  useEffect(() => {
    if (user?.id) {
      checkSecurityHealth();
    }
  }, [user?.id]);

  return {
    securityHealth,
    logSecurityEvent,
    checkSecurityHealth,
    trackLoginAttempt: EnhancedSecurityMonitoringService.trackLoginAttempt,
    isIPLockedOut: EnhancedSecurityMonitoringService.isIPLockedOut
  };
};
