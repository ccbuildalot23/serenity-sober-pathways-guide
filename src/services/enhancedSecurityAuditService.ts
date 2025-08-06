
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

  // Add missing methods that are being called in other files
  static async logSecurityEvent(params: {
    action: string;
    details?: Record<string, any>;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<void> {
    const instance = this.getInstance();
    await instance.logSecurityEvent(
      params.action,
      params.details || {},
      params.severity || 'low'
    );
  }

  static async logSecurityViolation(violation: string, details: Record<string, any> = {}): Promise<void> {
    const instance = this.getInstance();
    await instance.logSecurityEvent(violation, details, 'high');
  }

  static async logDataAccessEvent(table: string, operation: string, recordCount: number = 1): Promise<void> {
    const instance = this.getInstance();
    await instance.logSecurityEvent(
      'DATA_ACCESS',
      { table, operation, record_count: recordCount },
      'low'
    );
  }

  static async logRLSViolation(table: string, operation: string, details: Record<string, any> = {}): Promise<void> {
    const instance = this.getInstance();
    await instance.logSecurityEvent(
      'RLS_VIOLATION',
      { table, operation, ...details },
      'critical'
    );
  }

  static async logSecurityHardening(): Promise<void> {
    const instance = this.getInstance();
    await instance.logSecurityEvent(
      'SECURITY_HARDENING_INITIALIZED',
      { 
        timestamp: new Date().toISOString(),
        environment: import.meta.env.MODE 
      },
      'low'
    );
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Insert security events into the security_audit_logs table
      const { error } = await supabase
        .from('security_audit_logs')
        .insert(eventsToFlush);
      
      if (error) {
        console.error('Failed to insert security audit logs:', error);
        throw error;
      }

      console.log(`Successfully logged ${eventsToFlush.length} security events`);
    } catch (error) {
      console.error('Failed to flush security events:', error);
      // Re-queue events on failure
      this.eventQueue.unshift(...eventsToFlush);
    }
  }

  private async getClientIP(): Promise<string | null> {
    try {
      // Try multiple methods to get client IP
      
      // Method 1: Use a public IP service (for production)
      if (import.meta.env.PROD) {
        try {
          const response = await fetch('https://api.ipify.org?format=json', {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(3000) // 3 second timeout
          });
          if (response.ok) {
            const data = await response.json();
            return data.ip || null;
          }
        } catch (error) {
          console.warn('Failed to get IP from external service:', error);
        }
      }
      
      // Method 2: Try WebRTC for local IP (works in some browsers)
      try {
        const ip = await this.getLocalIP();
        if (ip && ip !== '127.0.0.1') {
          return ip;
        }
      } catch (error) {
        console.warn('WebRTC IP detection failed:', error);
      }
      
      // Method 3: Fallback to forwarded headers (if available via edge function)
      const userAgent = navigator.userAgent;
      if (userAgent.includes('Supabase-Edge')) {
        // This would be set by an edge function if available
        return 'edge-function-detected';
      }
      
      // Method 4: Final fallback
      return import.meta.env.DEV ? '127.0.0.1' : null;
    } catch (error) {
      console.warn('IP detection error:', error);
      return null;
    }
  }

  private async getLocalIP(): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        const rtc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        
        rtc.createDataChannel('');
        
        rtc.onicecandidate = (ice) => {
          if (!ice || !ice.candidate || !ice.candidate.candidate) {
            resolve(null);
            return;
          }
          
          const candidate = ice.candidate.candidate;
          const ipMatch = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/);
          
          if (ipMatch) {
            resolve(ipMatch[1]);
            rtc.close();
          }
        };
        
        rtc.createOffer().then(offer => rtc.setLocalDescription(offer));
        
        // Timeout after 2 seconds
        setTimeout(() => {
          rtc.close();
          resolve(null);
        }, 2000);
      } catch (error) {
        resolve(null);
      }
    });
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

  async logSuspiciousActivity(activityType: string, metadata: Record<string, any> = {}): Promise<void> {
    await this.logSecurityEvent(
      'SUSPICIOUS_ACTIVITY',
      { activity_type: activityType, ...metadata },
      'high'
    );
  }

  async generateSecurityReport(): Promise<any> {
    try {
      // Get security audit logs from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: auditLogs, error: auditError } = await supabase
        .from('security_audit_logs')
        .select('*')
        .gte('timestamp', thirtyDaysAgo.toISOString())
        .order('timestamp', { ascending: false })
        .limit(1000);
      
      if (auditError) {
        console.error('Error fetching audit logs:', auditError);
        throw auditError;
      }
      
      // Aggregate security metrics
      const report = {
        generated_at: new Date().toISOString(),
        summary: {
          total_events: auditLogs?.length || 0,
          critical_events: auditLogs?.filter(log => log.risk_level === 'critical').length || 0,
          high_risk_events: auditLogs?.filter(log => log.risk_level === 'high').length || 0,
          failed_logins: auditLogs?.filter(log => log.event_type === 'AUTH_FAILURE').length || 0,
          unique_users: new Set(auditLogs?.map(log => log.user_id).filter(Boolean)).size || 0,
          unique_ips: new Set(auditLogs?.map(log => log.ip_address).filter(Boolean)).size || 0
        },
        risk_analysis: {
          high_risk_indicators: [],
          recommendations: []
        },
        events_by_type: {},
        events_by_risk: {},
        timeline: []
      };
      
      if (auditLogs && auditLogs.length > 0) {
        // Analyze events by type
        const eventsByType = auditLogs.reduce((acc, log) => {
          acc[log.event_type] = (acc[log.event_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        report.events_by_type = eventsByType;
        
        // Analyze events by risk level
        const eventsByRisk = auditLogs.reduce((acc, log) => {
          acc[log.risk_level] = (acc[log.risk_level] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        report.events_by_risk = eventsByRisk;
        
        // Check for high-risk patterns
        if (report.summary.critical_events > 0) {
          report.risk_analysis.high_risk_indicators.push(
            `${report.summary.critical_events} critical security events detected`
          );
          report.risk_analysis.recommendations.push(
            'Immediate review of critical events required'
          );
        }
        
        if (report.summary.failed_logins > 20) {
          report.risk_analysis.high_risk_indicators.push(
            `High number of failed login attempts: ${report.summary.failed_logins}`
          );
          report.risk_analysis.recommendations.push(
            'Consider implementing additional authentication measures'
          );
        }
        
        // Check for suspicious IP patterns
        const ipFrequency = auditLogs.reduce((acc, log) => {
          if (log.ip_address) {
            acc[log.ip_address] = (acc[log.ip_address] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
        
        const suspiciousIPs = Object.entries(ipFrequency)
          .filter(([ip, count]) => count > 50)
          .map(([ip]) => ip);
          
        if (suspiciousIPs.length > 0) {
          report.risk_analysis.high_risk_indicators.push(
            `Suspicious IP activity detected: ${suspiciousIPs.length} IPs with high request volume`
          );
          report.risk_analysis.recommendations.push(
            'Review and potentially block suspicious IP addresses'
          );
        }
        
        // Create timeline of recent events (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recentEvents = auditLogs
          .filter(log => new Date(log.timestamp) > sevenDaysAgo)
          .slice(0, 20)
          .map(log => ({
            timestamp: log.timestamp,
            event_type: log.event_type,
            risk_level: log.risk_level,
            user_id: log.user_id,
            ip_address: log.ip_address
          }));
        
        report.timeline = recentEvents;
      }
      
      // Log the report generation
      await this.logSecurityEvent(
        'SECURITY_REPORT_GENERATED',
        { report_summary: report.summary },
        'low'
      );
      
      return report;
    } catch (error) {
      console.error('Failed to generate security report:', error);
      await this.logSecurityEvent(
        'SECURITY_REPORT_FAILED',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'medium'
      );
      throw error;
    }
  }
  
  async getFailedLoginAttempts(timeframeHours: number = 24): Promise<any[]> {
    try {
      const timeframe = new Date();
      timeframe.setHours(timeframe.getHours() - timeframeHours);
      
      const { data, error } = await supabase
        .from('security_audit_logs')
        .select('*')
        .eq('event_type', 'AUTH_FAILURE')
        .gte('timestamp', timeframe.toISOString())
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get failed login attempts:', error);
      return [];
    }
  }
  
  async getSessionAnalytics(userId?: string): Promise<any> {
    try {
      let query = supabase
        .from('security_audit_logs')
        .select('*')
        .eq('event_type', 'SESSION_ACTIVITY');
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query
        .order('timestamp', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      // Aggregate session data
      const sessions = data || [];
      const analysis = {
        total_sessions: sessions.length,
        unique_users: new Set(sessions.map(s => s.user_id).filter(Boolean)).size,
        unique_devices: new Set(sessions.map(s => s.user_agent).filter(Boolean)).size,
        session_duration_stats: this.calculateSessionDurations(sessions),
        device_breakdown: this.analyzeDevices(sessions)
      };
      
      return analysis;
    } catch (error) {
      console.error('Failed to get session analytics:', error);
      return {
        total_sessions: 0,
        unique_users: 0,
        unique_devices: 0,
        session_duration_stats: {},
        device_breakdown: {}
      };
    }
  }
  
  private calculateSessionDurations(sessions: any[]): Record<string, number> {
    // This would require more sophisticated session tracking
    // For now, return basic stats
    return {
      average_duration_minutes: 30, // Placeholder
      total_active_time_hours: sessions.length * 0.5 // Placeholder
    };
  }
  
  private analyzeDevices(sessions: any[]): Record<string, number> {
    const devices = sessions.reduce((acc, session) => {
      if (session.user_agent) {
        const device = this.getDeviceType(session.user_agent);
        acc[device] = (acc[device] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    return devices;
  }
  
  private getDeviceType(userAgent: string): string {
    if (!userAgent) return 'unknown';
    if (userAgent.includes('Mobile')) return 'mobile';
    if (userAgent.includes('Tablet')) return 'tablet';
    return 'desktop';
  }
}

export const enhancedSecurityAuditService = EnhancedSecurityAuditService.getInstance();
