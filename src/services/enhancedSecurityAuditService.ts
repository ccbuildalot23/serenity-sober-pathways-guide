
import { supabase } from '@/integrations/supabase/client';

interface SecurityEvent {
  event_type: string;
  user_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
  timestamp?: string;
}

export class EnhancedSecurityAuditService {
  private static instance: EnhancedSecurityAuditService;
  private eventQueue: SecurityEvent[] = [];
  private batchSize = 10;
  private flushInterval = 30000; // 30 seconds

  static getInstance(): EnhancedSecurityAuditService {
    if (!this.instance) {
      this.instance = new EnhancedSecurityAuditService();
    }
    return this.instance;
  }

  constructor() {
    // Start periodic flush
    setInterval(() => this.flushEvents(), this.flushInterval);
  }

  async logSecurityEvent(
    eventType: string,
    metadata: Record<string, any> = {},
    riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
  ): Promise<void> {
    try {
      const event: SecurityEvent = {
        event_type: eventType,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        risk_level: riskLevel,
        metadata,
        timestamp: new Date().toISOString(),
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent
      };

      this.eventQueue.push(event);

      // Flush immediately for high/critical events
      if (riskLevel === 'high' || riskLevel === 'critical') {
        await this.flushEvents();
      }

      // Flush if queue is full
      if (this.eventQueue.length >= this.batchSize) {
        await this.flushEvents();
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // In a real implementation, you would insert these into a security_audit_logs table
      console.log('Security events logged:', eventsToFlush);
      
      // Example of how you might insert into Supabase
      // const { error } = await supabase
      //   .from('security_audit_logs')
      //   .insert(eventsToFlush);
      
      // if (error) throw error;
    } catch (error) {
      console.error('Failed to flush security events:', error);
      // Re-queue events on failure
      this.eventQueue.unshift(...eventsToFlush);
    }
  }

  private async getClientIP(): Promise<string> {
    try {
      // In a real implementation, you might use a service to get the client IP
      return 'localhost';
    } catch {
      return 'unknown';
    }
  }

  async logAuthAttempt(email: string, success: boolean, metadata: Record<string, any> = {}): Promise<void> {
    await this.logSecurityEvent(
      success ? 'AUTH_SUCCESS' : 'AUTH_FAILURE',
      { email, ...metadata },
      success ? 'low' : 'medium'
    );
  }

  async logSessionActivity(activityType: string, metadata: Record<string, any> = {}): Promise<void> {
    await this.logSecurityEvent(
      'SESSION_ACTIVITY',
      { activity_type: activityType, ...metadata },
      'low'
    );
  }

  async logSecurityHardening(): Promise<void> {
    await this.logSecurityEvent(
      'SECURITY_HARDENING_INITIALIZED',
      { 
        timestamp: new Date().toISOString(),
        environment: import.meta.env.MODE 
      },
      'low' // Changed from 'info' to 'low'
    );
  }

  async logSuspiciousActivity(activityType: string, metadata: Record<string, any> = {}): Promise<void> {
    await this.logSecurityEvent(
      'SUSPICIOUS_ACTIVITY',
      { activity_type: activityType, ...metadata },
      'high'
    );
  }

  async generateSecurityReport(): Promise<any> {
    try {
      // In a real implementation, you would query the security_audit_logs table
      // const { data, error } = await supabase
      //   .from('security_audit_logs')
      //   .select('*')
      //   .order('timestamp', { ascending: false })
      //   .limit(100);
      
      // if (error) throw error;
      // return data;
      
      return { message: 'Security report generated successfully' };
    } catch (error) {
      console.error('Failed to generate security report:', error);
      throw error;
    }
  }
}

export const enhancedSecurityAuditService = EnhancedSecurityAuditService.getInstance();
