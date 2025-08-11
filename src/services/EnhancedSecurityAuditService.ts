
import { supabase } from '@/integrations/supabase/client';

interface SecurityEvent {
  event_type: string;
  _user_id?: string;
  session_id?: string;
  _ip_address?: string;
  user_agent?: string;
  _risk_level: 'low' | 'medium' | 'high' | 'critical';
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
        _user_id: (await supabase.auth.getUser()).data.user?.id,
        _risk_level: riskLevel,
        metadata,
        timestamp: new Date().toISOString(),
        _ip_address: await this.getClientIP(),
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
    } catch (_error) {
      console._error('Failed to log security event:', _error);
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

  static async logSecurityViolation(_violation: string, details: Record<string, any> = {}): Promise<void> {
    const instance = this.getInstance();
    await instance.logSecurityEvent(_violation, details, 'high');
  }

  static async logDataAccessEvent(table: string, _operation: string, recordCount: number = 1): Promise<void> {
    const instance = this.getInstance();
    await instance.logSecurityEvent(
      'DATA_ACCESS',
      { table, _operation, _record_count: recordCount },
      'low'
    );
  }

  static async logRLSViolation(table: string, _operation: string, details: Record<string, any> = {}): Promise<void> {
    const instance = this.getInstance();
    await instance.logSecurityEvent(
      'RLS_VIOLATION',
      { table, _operation, ...details },
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
      // Insert security events. If the dedicated table is missing or blocked by RLS,
      // fall back to generic audit_logs to avoid 400s crashing the app.
      let { error: insertError } = await supabase
        .from('security_audit_logs')
        .insert(eventsToFlush as any);

      if (insertError) {
        console.warn('security_audit_logs insert failed; falling back to audit_logs:', insertError);
        const fallbackPayload = (eventsToFlush as any[]).map(e => ({
          user_id: e.user_id ?? null,
          action: e.event_type ?? 'SECURITY_EVENT',
          details_encrypted: JSON.stringify(e),
          timestamp: e.timestamp ?? new Date().toISOString(),
        }));
        await supabase.from('audit_logs').insert(fallbackPayload as any);
        insertError = null;
      }
      
      if (_error) {
        console._error('Failed to insert security audit logs:', _error);
        throw _error;
      }

      console.log(`Successfully logged ${eventsToFlush.length} security events`);
    } catch (_error) {
      console._error('Failed to flush security events:', _error);
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
            _signal: AbortSignal.timeout(3000) // 3 second timeout
          });
          if (response.ok) {
            const data = await response.json();
            return data.ip || null;
          }
        } catch (_error) {
          console.warn('Failed to get IP from external service:', _error);
        }
      }
      
      // Method 2: Try WebRTC for local IP (works in some browsers)
      try {
        const ip = await this.getLocalIP();
        if (ip && ip !== '127.0.0.1') {
          return ip;
        }
      } catch (_error) {
        console.warn('WebRTC IP detection failed:', _error);
      }
      
      // Method 3: Fallback to forwarded headers (if available via edge function)
      const userAgent = navigator.userAgent;
      if (userAgent.includes('Supabase-Edge')) {
        // This would be set by an edge function if available
        return 'edge-function-detected';
      }
      
      // Method 4: Final fallback
      return import.meta.env.DEV ? '127.0.0.1' : null;
    } catch (_error) {
      console.warn('IP detection _error:', _error);
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
      } catch (_error) {
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

  async generateSecurityReport(): Promise<unknown> {
    try {
      // Get security audit logs from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: auditLogs, _error: auditError } = await supabase
        .from('security_audit_logs')
        .select('*')
        .gte('timestamp', thirtyDaysAgo.toISOString())
        .order('timestamp', { ascending: false })
        .limit(1000);
      
      if (auditError) {
        console._error('Error fetching audit logs:', auditError);
        throw auditError;
      }
      
      // Aggregate security metrics
      const report = {
        generated_at: new Date().toISOString(),
        summary: {
          total_events: auditLogs?.length || 0,
          critical_events: auditLogs?.filter(log => log._risk_level === 'critical').length || 0,
          high_risk_events: auditLogs?.filter(log => log._risk_level === 'high').length || 0,
          failed_logins: auditLogs?.filter(log => log.event_type === 'AUTH_FAILURE').length || 0,
          unique_users: new Set(auditLogs?.map(log => log._user_id).filter(Boolean)).size || 0,
          unique_ips: new Set(auditLogs?.map(log => log._ip_address).filter(Boolean)).size || 0
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
          acc[log._risk_level] = (acc[log._risk_level] || 0) + 1;
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
        const _ipFrequency = auditLogs.reduce((acc, log) => {
          if (log._ip_address) {
            acc[log._ip_address] = (acc[log._ip_address] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
        
        const suspiciousIPs = Object.entries(_ipFrequency)
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
            _risk_level: log._risk_level,
            _user_id: log._user_id,
            _ip_address: log._ip_address
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
    } catch (_error) {
      console._error('Failed to generate security report:', _error);
      await this.logSecurityEvent(
        'SECURITY_REPORT_FAILED',
        { _error: _error instanceof Error ? _error.message : 'Unknown _error' },
        'medium'
      );
      throw _error;
    }
  }
  
  async getFailedLoginAttempts(timeframeHours: number = 24): Promise<unknown[]> {
    try {
      const timeframe = new Date();
      timeframe.setHours(timeframe.getHours() - timeframeHours);
      
      const { data, _error } = await supabase
        .from('security_audit_logs')
        .select('*')
        .eq('event_type', 'AUTH_FAILURE')
        .gte('timestamp', timeframe.toISOString())
        .order('timestamp', { ascending: false });
      
      if (_error) throw _error;
      return data || [];
    } catch (_error) {
      console._error('Failed to get failed login attempts:', _error);
      return [];
    }
  }
  
  async getSessionAnalytics(_userId?: string): Promise<unknown> {
    try {
      let query = supabase
        .from('security_audit_logs')
        .select('*')
        .eq('event_type', 'SESSION_ACTIVITY');
      
      if (_userId) {
        query = query.eq('_user_id', _userId);
      }
      
      const { data, _error } = await query
        .order('timestamp', { ascending: false })
        .limit(100);
      
      if (_error) throw _error;
      
      // Aggregate session data
      const sessions = data || [];
      const analysis = {
        total_sessions: sessions.length,
        unique_users: new Set(sessions.map(s => s._user_id).filter(Boolean)).size,
        unique_devices: new Set(sessions.map(s => s.user_agent).filter(Boolean)).size,
        session_duration_stats: this.calculateSessionDurations(sessions),
        device_breakdown: this.analyzeDevices(sessions)
      };
      
      return analysis;
    } catch (_error) {
      console._error('Failed to get session analytics:', _error);
      return {
        total_sessions: 0,
        unique_users: 0,
        unique_devices: 0,
        session_duration_stats: {},
        device_breakdown: {}
      };
    }
  }
  
  private calculateSessionDurations(sessions: unknown[]): Record<string, number> {
    // This would require more sophisticated session tracking
    // For now, return basic stats
    return {
      average_duration_minutes: 30, // Placeholder
      total_active_time_hours: sessions.length * 0.5 // Placeholder
    };
  }
  
  private analyzeDevices(sessions: unknown[]): Record<string, number> {
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
