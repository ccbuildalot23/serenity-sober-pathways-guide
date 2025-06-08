import { supabase } from '@/integrations/supabase/client';
import { serverSideEncryption } from '@/lib/serverSideEncryption';
import { InputValidator } from '@/lib/inputValidation';

interface SecurityAuditEntry {
  action: string;
  details?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Enhanced Security Audit Service
 * Implements secure audit logging with proper user authentication and RLS compliance
 */
export class EnhancedSecurityAuditService {
  static async logSecurityEvent(entry: SecurityAuditEntry): Promise<void> {
    try {
      // Get current user - required for RLS policies
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('Cannot log audit event: User not authenticated');
        return;
      }

      // Validate and sanitize input data
      const sanitizedEntry = {
        action: InputValidator.sanitizeText(entry.action),
        details: entry.details ? InputValidator.sanitizeJsonData(entry.details) : null,
        severity: entry.severity || 'medium',
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent ? InputValidator.sanitizeText(entry.userAgent) : null
      };

      // Encrypt sensitive details using server-side encryption
      const encryptedDetails = sanitizedEntry.details 
        ? await serverSideEncryption.encrypt(JSON.stringify(sanitizedEntry.details))
        : null;

      // Get client info
      const clientInfo = {
        ip_address: sanitizedEntry.ipAddress || null,
        user_agent: sanitizedEntry.userAgent || navigator.userAgent?.substring(0, 500) || null,
        session_id: crypto.randomUUID()
      };

      // Insert audit log with proper user_id for RLS compliance
      const { error } = await supabase.from('audit_logs').insert({
        user_id: user.id, // Required for RLS policy
        action: `SECURITY_${sanitizedEntry.action}`,
        details_encrypted: encryptedDetails,
        timestamp: new Date().toISOString(),
        ...clientInfo
      });

      if (error) {
        console.error('Security audit log insertion failed:', error);
        // Log to local storage as fallback
        this.logToLocalStorage(entry);
      }
    } catch (error) {
      console.error('Security audit logging error:', error);
      // Fail silently but log locally for debugging
      this.logToLocalStorage(entry);
    }
  }

  static async logRLSViolation(table: string, operation: string, details?: Record<string, any>): Promise<void> {
    await this.logSecurityEvent({
      action: 'RLS_POLICY_VIOLATION',
      severity: 'critical',
      details: {
        table,
        operation,
        timestamp: new Date().toISOString(),
        ...details
      }
    });
  }

  static async logAuthenticationEvent(eventType: string, success: boolean, details?: Record<string, any>): Promise<void> {
    await this.logSecurityEvent({
      action: `AUTH_${eventType}`,
      severity: success ? 'low' : 'medium',
      details: {
        success,
        timestamp: new Date().toISOString(),
        ...details
      }
    });
  }

  static async logDataAccessEvent(table: string, operation: string, recordCount: number): Promise<void> {
    await this.logSecurityEvent({
      action: 'DATA_ACCESS',
      severity: 'low',
      details: {
        table,
        operation,
        record_count: recordCount,
        timestamp: new Date().toISOString()
      }
    });
  }

  static async logSecurityViolation(violationType: string, details?: Record<string, any>): Promise<void> {
    await this.logSecurityEvent({
      action: 'SECURITY_VIOLATION',
      severity: 'high',
      details: {
        violation_type: violationType,
        timestamp: new Date().toISOString(),
        ...details
      }
    });
  }

  private static logToLocalStorage(entry: SecurityAuditEntry): void {
    try {
      const logs = JSON.parse(localStorage.getItem('security_audit_fallback') || '[]');
      logs.push({
        ...entry,
        timestamp: new Date().toISOString(),
        fallback: true
      });
      
      // Keep only last 50 events to prevent storage bloat
      if (logs.length > 50) {
        logs.splice(0, logs.length - 50);
      }
      
      localStorage.setItem('security_audit_fallback', JSON.stringify(logs));
    } catch (error) {
      console.warn('Failed to log to localStorage fallback:', error);
    }
  }

  static getFallbackLogs(): any[] {
    try {
      return JSON.parse(localStorage.getItem('security_audit_fallback') || '[]');
    } catch (error) {
      return [];
    }
  }

  static clearFallbackLogs(): void {
    localStorage.removeItem('security_audit_fallback');
  }
}
