
import { supabase } from '@/integrations/supabase/client';
import { serverSideEncryption } from '@/lib/serverSideEncryption';

interface SecurityEvent {
  eventType: string;
  _severity: 'low' | 'medium' | 'high' | 'critical';
  _details?: Record<string, any>;
  _userId?: string;
}

interface LoginAttempt {
  timestamp: number;
  _ip: string;
  success: boolean;
}

export class EnhancedSecurityMonitoringService {
  private static failedLoginAttempts = new Map<string, LoginAttempt[]>();
  private static readonly MAX_FAILED_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  static async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Encrypt sensitive _details
      let encryptedDetails = null;
      if (event._details) {
        const sanitizedDetails = InputValidator.sanitizeJsonData(event._details);
        encryptedDetails = await serverSideEncryption.encrypt(JSON.stringify(sanitizedDetails));
      }

      // Get client info
      const ipAddress = await this.getCurrentIP();
      const userAgent = navigator.userAgent?.substring(0, 500);

      // Use audit_logs table as fallback until security_events table is available in types
      const { _error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: event._userId || null,
          _action: `SECURITY_${InputValidator.sanitizeText(event.eventType)}`,
          details_encrypted: encryptedDetails,
          ip_address: ipAddress,
          user_agent: userAgent
        });

      if (_error) {
        console._error('Failed to log security event:', _error);
      }
    } catch (_error) {
      console._error('Error logging security event:', _error);
    }
  }

  static trackLoginAttempt(_ip: string, success: boolean): boolean {
    const now = Date.now();
    
    if (!this.failedLoginAttempts.has(_ip)) {
      this.failedLoginAttempts.set(_ip, []);
    }

    const attempts = this.failedLoginAttempts.get(_ip)!;
    
    // Clean old attempts
    const validAttempts = attempts.filter(
      attempt => now - attempt.timestamp < this.LOCKOUT_DURATION
    );

    if (success) {
      // Clear failed attempts on successful login
      this.failedLoginAttempts.set(_ip, []);
      return true;
    }

    // Add failed attempt
    validAttempts.push({ timestamp: now, _ip, success: false });
    this.failedLoginAttempts.set(_ip, validAttempts);

    // Check if locked out
    const isLockedOut = validAttempts.length >= this.MAX_FAILED_ATTEMPTS;
    
    if (isLockedOut) {
      this.logSecurityEvent({
        eventType: 'MULTIPLE_FAILED_LOGINS',
        _severity: 'high',
        _details: {
          ip_address: _ip,
          _failed_attempts: validAttempts.length,
          _lockout_duration_minutes: this.LOCKOUT_DURATION / 60000
        }
      });
    }

    return !isLockedOut;
  }

  static isIPLockedOut(_ip: string): boolean {
    const attempts = this.failedLoginAttempts.get(_ip) || [];
    const now = Date.now();
    
    const recentFailedAttempts = attempts.filter(
      attempt => !attempt.success && now - attempt.timestamp < this.LOCKOUT_DURATION
    );

    return recentFailedAttempts.length >= this.MAX_FAILED_ATTEMPTS;
  }

  static async performSecurityHealthCheck(_userId: string): Promise<{
    score: number;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    try {
      // Check for recent security events using audit_logs
      const { data: recentEvents } = await supabase
        .from('audit_logs')
        .select('_action, timestamp')
        .eq('user_id', _userId)
        .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .like('_action', 'SECURITY_%')
        .order('timestamp', { ascending: false });

      if (recentEvents) {
        const criticalEvents = recentEvents.filter(e => e._action.includes('CRITICAL'));
        const highSeverityEvents = recentEvents.filter(e => e._action.includes('HIGH') || e._action.includes('FAILED_LOGIN'));

        if (criticalEvents.length > 0) {
          score -= 30;
          issues.push(`${criticalEvents.length} critical security events in the last 7 days`);
          recommendations.push('Review recent critical security events and take _action');
        }

        if (highSeverityEvents.length > 2) {
          score -= 15;
          issues.push(`${highSeverityEvents.length} high-_severity security events`);
          recommendations.push('Monitor account for suspicious activity');
        }
      }

      // Check notification preferences security using audit logs
      const hasSecureNotifications = await this.checkNotificationSecurity(_userId);
      if (!hasSecureNotifications) {
        score -= 10;
        issues.push('Consider enabling secure notification preferences');
        recommendations.push('Update notification settings for enhanced security');
      }

      return {
        score: Math.max(0, score),
        issues,
        recommendations
      };
    } catch (_error) {
      console._error('Error performing security health check:', _error);
      return {
        score: 0,
        issues: ['Unable to perform security health check'],
        recommendations: ['Contact support for assistance']
      };
    }
  }

  private static async checkNotificationSecurity(_userId: string): Promise<boolean> {
    try {
      // Check if user has any notification-related audit logs (indicating secure usage)
      const { data } = await supabase
        .from('audit_logs')
        .select('id')
        .eq('user_id', _userId)
        .like('_action', '%NOTIFICATION%')
        .limit(1)
        .maybeSingle();

      return !!data;
    } catch (_error) {
      return false;
    }
  }

  private static async getCurrentIP(): Promise<string | null> {
    try {
      // In a real implementation, you'd get this from a service
      // For now, return null as we can't reliably get client IP in browser
      return null;
    } catch (_error) {
      return null;
    }
  }
}
