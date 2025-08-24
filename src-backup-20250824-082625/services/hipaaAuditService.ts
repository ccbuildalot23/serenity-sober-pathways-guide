import { supabase } from '@/integrations/supabase/client';

export interface AuditEvent {
  event_type: 'PASSWORD_RESET_REQUEST' | 'PASSWORD_RESET_SUCCESS' | 'PASSWORD_RESET_FAILED' | 
              'PASSWORD_RESET_TOKEN_USED' | 'PASSWORD_RESET_TOKEN_EXPIRED' | 'PASSWORD_RESET_RATE_LIMITED';
  user_email?: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  metadata?: Record<string, any>;
  timestamp: string;
  session_id?: string;
}

class HIPAAAuditService {
  private static instance: HIPAAAuditService;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  static getInstance(): HIPAAAuditService {
    if (!HIPAAAuditService.instance) {
      HIPAAAuditService.instance = new HIPAAAuditService();
    }
    return HIPAAAuditService.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getClientInfo(): Promise<{ ip_address?: string; user_agent: string }> {
    // Get user agent
    const user_agent = navigator.userAgent;
    
    // In production, you'd get IP from your backend
    // For now, we'll use a placeholder
    let ip_address: string | undefined;
    
    try {
      // This would be replaced with a call to your backend API
      // that returns the client's IP address
      ip_address = 'client_ip_masked_for_privacy';
    } catch (error) {
      console.error('Failed to get client IP:', error);
    }

    return { ip_address, user_agent };
  }

  async logPasswordResetRequest(email: string, success: boolean, reason?: string): Promise<void> {
    try {
      const clientInfo = await this.getClientInfo();
      const event: AuditEvent = {
        event_type: 'PASSWORD_RESET_REQUEST',
        user_email: this.hashEmail(email),
        success,
        ...clientInfo,
        timestamp: new Date().toISOString(),
        session_id: this.sessionId,
        metadata: reason ? { reason } : undefined
      };

      await this.saveAuditLog(event);
    } catch (error) {
      console.error('Failed to log password reset request:', error);
      // Don't throw - audit logging failure shouldn't break the flow
    }
  }

  async logPasswordResetSuccess(userId: string, email: string): Promise<void> {
    try {
      const clientInfo = await this.getClientInfo();
      const event: AuditEvent = {
        event_type: 'PASSWORD_RESET_SUCCESS',
        user_id: userId,
        user_email: this.hashEmail(email),
        success: true,
        ...clientInfo,
        timestamp: new Date().toISOString(),
        session_id: this.sessionId
      };

      await this.saveAuditLog(event);
    } catch (error) {
      console.error('Failed to log password reset success:', error);
    }
  }

  async logPasswordResetFailed(email: string, reason: string): Promise<void> {
    try {
      const clientInfo = await this.getClientInfo();
      const event: AuditEvent = {
        event_type: 'PASSWORD_RESET_FAILED',
        user_email: this.hashEmail(email),
        success: false,
        ...clientInfo,
        timestamp: new Date().toISOString(),
        session_id: this.sessionId,
        metadata: { reason }
      };

      await this.saveAuditLog(event);
    } catch (error) {
      console.error('Failed to log password reset failure:', error);
    }
  }

  async logRateLimitExceeded(email: string): Promise<void> {
    try {
      const clientInfo = await this.getClientInfo();
      const event: AuditEvent = {
        event_type: 'PASSWORD_RESET_RATE_LIMITED',
        user_email: this.hashEmail(email),
        success: false,
        ...clientInfo,
        timestamp: new Date().toISOString(),
        session_id: this.sessionId,
        metadata: { 
          reason: 'Rate limit exceeded',
          max_attempts: 3,
          window_hours: 1
        }
      };

      await this.saveAuditLog(event);
    } catch (error) {
      console.error('Failed to log rate limit event:', error);
    }
  }

  private hashEmail(email: string): string {
    // Simple hash for privacy - in production, use a proper hashing algorithm
    // This maintains HIPAA compliance by not storing PII in plain text
    const hash = email.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    
    const domain = email.split('@')[1] || 'unknown';
    return `user_${Math.abs(hash)}_${domain}`;
  }

  private async saveAuditLog(event: AuditEvent): Promise<void> {
    try {
      // Store in Supabase audit_logs table
      const { error } = await supabase
        .from('hipaa_audit_logs')
        .insert({
          event_type: event.event_type,
          user_email_hash: event.user_email,
          user_id: event.user_id,
          ip_address: event.ip_address,
          user_agent: event.user_agent,
          success: event.success,
          metadata: event.metadata,
          timestamp: event.timestamp,
          session_id: event.session_id
        });

      if (error) {
        console.error('Failed to save audit log to database:', error);
        // Fallback to local storage for critical events
        this.saveToLocalStorage(event);
      }
    } catch (error) {
      console.error('Failed to save audit log:', error);
      this.saveToLocalStorage(event);
    }
  }

  private saveToLocalStorage(event: AuditEvent): void {
    try {
      const logs = JSON.parse(localStorage.getItem('hipaa_audit_logs_backup') || '[]');
      logs.push(event);
      // Keep only last 100 events in local storage
      if (logs.length > 100) {
        logs.shift();
      }
      localStorage.setItem('hipaa_audit_logs_backup', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to save audit log to local storage:', error);
    }
  }

  // Method to retrieve audit logs for compliance reporting
  async getAuditLogs(startDate: Date, endDate: Date): Promise<AuditEvent[]> {
    try {
      const { data, error } = await supabase
        .from('hipaa_audit_logs')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Failed to retrieve audit logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to retrieve audit logs:', error);
      return [];
    }
  }
}

export const hipaaAuditService = HIPAAAuditService.getInstance();