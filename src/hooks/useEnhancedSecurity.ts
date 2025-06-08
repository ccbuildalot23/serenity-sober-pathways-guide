
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { EnhancedSecurityMonitoringService } from '@/services/enhancedSecurityMonitoringService';

interface SecurityHealth {
  score: number;
  issues: string[];
  recommendations: string[];
  loading: boolean;
}

export const useEnhancedSecurity = () => {
  const { user } = useAuth();
  const [securityHealth, setSecurityHealth] = useState<SecurityHealth>({
    score: 0,
    issues: [],
    recommendations: [],
    loading: true
  });

  const logSecurityEvent = async (
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details?: Record<string, any>
  ) => {
    await EnhancedSecurityMonitoringService.logSecurityEvent({
      eventType,
      severity,
      details,
      userId: user?.id
    });
  };

  const checkSecurityHealth = async () => {
    if (!user?.id) return;

    setSecurityHealth(prev => ({ ...prev, loading: true }));
    
    try {
      const health = await EnhancedSecurityMonitoringService.performSecurityHealthCheck(user.id);
      setSecurityHealth({
        ...health,
        loading: false
      });
    } catch (error) {
      console.error('Failed to check security health:', error);
      setSecurityHealth({
        score: 0,
        issues: ['Unable to check security health'],
        recommendations: ['Contact support'],
        loading: false
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
