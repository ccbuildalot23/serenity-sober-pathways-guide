
import { supabase } from '@/integrations/supabase/client';
import { serverSideEncryption } from '@/lib/serverSideEncryption';
import { InputValidator } from '@/lib/inputValidation';

interface SecurityEvent {
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: Record<string, any>;
  userId?: string;
}

interface LoginAttempt {
  timestamp: number;
  ip: string;
  success: boolean;
}

export class EnhancedSecurityMonitoringService {
  private static failedLoginAttempts = new Map<string, LoginAttempt[]>();
  private static readonly MAX_FAILED_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  static async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Encrypt sensitive details
      let encryptedDetails = null;
      if (event.details) {
        const sanitizedDetails = InputValidator.sanitizeJsonData(event.details);
        encryptedDetails = await serverSideEncryption.encrypt(JSON.stringify(sanitizedDetails));
      }

      // Get client info
      const ipAddress = await this.getCurrentIP();
      const userAgent = navigator.userAgent?.substring(0, 500);

      // Use audit_logs table as fallback until security_events table is available in types
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: event.userId || null,
          action: `SECURITY_${InputValidator.sanitizeText(event.eventType)}`,
          details_encrypted: encryptedDetails,
          ip_address: ipAddress,
          user_agent: userAgent
        });

      if (error) {
        console.error('Failed to log security event:', error);
      }
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  static trackLoginAttempt(ip: string, success: boolean): boolean {
    const now = Date.now();
    
    if (!this.failedLoginAttempts.has(ip)) {
      this.failedLoginAttempts.set(ip, []);
    }

    const attempts = this.failedLoginAttempts.get(ip)!;
    
    // Clean old attempts
    const validAttempts = attempts.filter(
      attempt => now - attempt.timestamp < this.LOCKOUT_DURATION
    );

    if (success) {
      // Clear failed attempts on successful login
      this.failedLoginAttempts.set(ip, []);
      return true;
    }

    // Add failed attempt
    validAttempts.push({ timestamp: now, ip, success: false });
    this.failedLoginAttempts.set(ip, validAttempts);

    // Check if locked out
    const isLockedOut = validAttempts.length >= this.MAX_FAILED_ATTEMPTS;
    
    if (isLockedOut) {
      this.logSecurityEvent({
        eventType: 'MULTIPLE_FAILED_LOGINS',
        severity: 'high',
        details: {
          ip_address: ip,
          failed_attempts: validAttempts.length,
          lockout_duration_minutes: this.LOCKOUT_DURATION / 60000
        }
      });
    }

    return !isLockedOut;
  }

  static isIPLockedOut(ip: string): boolean {
    const attempts = this.failedLoginAttempts.get(ip) || [];
    const now = Date.now();
    
    const recentFailedAttempts = attempts.filter(
      attempt => !attempt.success && now - attempt.timestamp < this.LOCKOUT_DURATION
    );

    return recentFailedAttempts.length >= this.MAX_FAILED_ATTEMPTS;
  }

  static async performSecurityHealthCheck(userId: string): Promise<{
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
        .select('action, timestamp')
        .eq('user_id', userId)
        .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .like('action', 'SECURITY_%')
        .order('timestamp', { ascending: false });

      if (recentEvents) {
        const criticalEvents = recentEvents.filter(e => e.action.includes('CRITICAL'));
        const highSeverityEvents = recentEvents.filter(e => e.action.includes('HIGH') || e.action.includes('FAILED_LOGIN'));

        if (criticalEvents.length > 0) {
          score -= 30;
          issues.push(`${criticalEvents.length} critical security events in the last 7 days`);
          recommendations.push('Review recent critical security events and take action');
        }

        if (highSeverityEvents.length > 2) {
          score -= 15;
          issues.push(`${highSeverityEvents.length} high-severity security events`);
          recommendations.push('Monitor account for suspicious activity');
        }
      }

      // Check notification preferences security using audit logs
      const hasSecureNotifications = await this.checkNotificationSecurity(userId);
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
    } catch (error) {
      console.error('Error performing security health check:', error);
      return {
        score: 0,
        issues: ['Unable to perform security health check'],
        recommendations: ['Contact support for assistance']
      };
    }
  }

  private static async checkNotificationSecurity(userId: string): Promise<boolean> {
    try {
      // Check if user has any notification-related audit logs (indicating secure usage)
      const { data } = await supabase
        .from('audit_logs')
        .select('id')
        .eq('user_id', userId)
        .like('action', '%NOTIFICATION%')
        .limit(1)
        .maybeSingle();

      return !!data;
    } catch (error) {
      return false;
    }
  }

  private static async getCurrentIP(): Promise<string | null> {
    try {
      // In a real implementation, you'd get this from a service
      // For now, return null as we can't reliably get client IP in browser
      return null;
    } catch (error) {
      return null;
    }
  }
}
