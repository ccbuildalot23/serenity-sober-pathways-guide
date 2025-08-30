import { supabase } from '@/integrations/supabase/client';

export interface AuditLog {
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  phi_accessed?: boolean;
  timestamp: string;
}

class AuditLogger {
  private queue: AuditLog[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private maxQueueSize = 50;
  private flushIntervalMs = 5000;

  constructor() {
    // Start periodic flush
    this.startPeriodicFlush();

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  private startPeriodicFlush() {
    this.flushInterval = setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, this.flushIntervalMs);
  }

  async log(params: Omit<AuditLog, 'timestamp'>): Promise<void> {
    const log: AuditLog = {
      ...params,
      timestamp: new Date().toISOString(),
      ip_address: await this.getClientIP(),
      user_agent: navigator?.userAgent || 'unknown'
    };

    this.queue.push(log);

    // Flush if queue is full
    if (this.queue.length >= this.maxQueueSize) {
      await this.flush();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[AUDIT]', log);
    }
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const logsToFlush = [...this.queue];
    this.queue = [];

    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert(logsToFlush);

      if (error) {
        console.error('Failed to flush audit logs:', error);
        // Re-add to queue for retry
        this.queue.unshift(...logsToFlush);
      }
    } catch (error) {
      console.error('Audit log flush error:', error);
      // Re-add to queue for retry
      this.queue.unshift(...logsToFlush);
    }
  }

  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }

  // HIPAA-specific logging methods
  async logPHIAccess(params: {
    user_id: string;
    patient_id: string;
    data_type: string;
    action: 'view' | 'create' | 'update' | 'delete';
    reason?: string;
  }): Promise<void> {
    await this.log({
      user_id: params.user_id,
      action: `PHI_${params.action.toUpperCase()}`,
      resource_type: 'patient_data',
      resource_id: params.patient_id,
      phi_accessed: true,
      metadata: {
        data_type: params.data_type,
        reason: params.reason
      }
    });
  }

  async logAuthentication(params: {
    user_id?: string;
    email: string;
    success: boolean;
    method: string;
    error?: string;
  }): Promise<void> {
    await this.log({
      user_id: params.user_id,
      action: params.success ? 'AUTH_SUCCESS' : 'AUTH_FAILURE',
      resource_type: 'authentication',
      metadata: {
        email: params.email,
        method: params.method,
        error: params.error
      }
    });
  }

  async logCrisisEvent(params: {
    user_id: string;
    crisis_level: 'low' | 'medium' | 'high' | 'critical';
    action_taken: string;
    contacts_notified?: string[];
  }): Promise<void> {
    await this.log({
      user_id: params.user_id,
      action: 'CRISIS_EVENT',
      resource_type: 'crisis_support',
      phi_accessed: true,
      metadata: {
        crisis_level: params.crisis_level,
        action_taken: params.action_taken,
        contacts_notified: params.contacts_notified?.length || 0
      }
    });
  }

  async logDataExport(params: {
    user_id: string;
    data_types: string[];
    format: string;
    purpose?: string;
  }): Promise<void> {
    await this.log({
      user_id: params.user_id,
      action: 'DATA_EXPORT',
      resource_type: 'data_export',
      phi_accessed: true,
      metadata: {
        data_types: params.data_types,
        format: params.format,
        purpose: params.purpose
      }
    });
  }

  async logAccessControl(params: {
    user_id: string;
    action: 'GRANT' | 'REVOKE' | 'MODIFY';
    target_user_id: string;
    permissions: string[];
  }): Promise<void> {
    await this.log({
      user_id: params.user_id,
      action: `ACCESS_${params.action}`,
      resource_type: 'access_control',
      resource_id: params.target_user_id,
      metadata: {
        permissions: params.permissions
      }
    });
  }

  async logSessionTimeout(user_id: string): Promise<void> {
    await this.log({
      user_id,
      action: 'SESSION_TIMEOUT',
      resource_type: 'session',
      metadata: {
        reason: 'Inactivity timeout after 15 minutes'
      }
    });
  }

  async logEncryptionEvent(params: {
    user_id?: string;
    action: 'ENCRYPT' | 'DECRYPT' | 'REKEY';
    data_type: string;
    success: boolean;
  }): Promise<void> {
    await this.log({
      user_id: params.user_id,
      action: `ENCRYPTION_${params.action}`,
      resource_type: 'encryption',
      metadata: {
        data_type: params.data_type,
        success: params.success
      }
    });
  }

  // Compliance reporting
  async generateComplianceReport(startDate: Date, endDate: Date): Promise<any> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Failed to generate compliance report:', error);
      return null;
    }

    return {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      summary: {
        total_events: data.length,
        phi_accesses: data.filter(log => log.phi_accessed).length,
        auth_failures: data.filter(log => log.action === 'AUTH_FAILURE').length,
        crisis_events: data.filter(log => log.action === 'CRISIS_EVENT').length,
        data_exports: data.filter(log => log.action === 'DATA_EXPORT').length
      },
      logs: data
    };
  }

  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();

// Export for use in components
export default auditLogger;