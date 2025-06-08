import { supabase } from '@/integrations/supabase/client';
import { serverSideEncryption } from '@/lib/serverSideEncryption';
import { InputValidator } from '@/lib/inputValidation';

interface AuditEntry {
  action: string;
  details?: Record<string, any>;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export const secureLogEvent = async (entry: AuditEntry) => {
  try {
    // Validate and sanitize input data
    const sanitizedEntry = {
      action: InputValidator.sanitizeText(entry.action),
      details: entry.details ? InputValidator.sanitizeJsonData(entry.details) : null,
      userId: entry.userId,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent ? InputValidator.sanitizeText(entry.userAgent) : null
    };

    // Use server-side encryption for maximum security
    const encryptedDetails = sanitizedEntry.details 
      ? await serverSideEncryption.encrypt(JSON.stringify(sanitizedEntry.details))
      : null;

    // Get client IP and user agent (if available)
    const clientInfo = {
      ip_address: sanitizedEntry.ipAddress || null,
      user_agent: sanitizedEntry.userAgent || navigator.userAgent?.substring(0, 500) || null,
      session_id: crypto.randomUUID()
    };

    const { error } = await supabase.from('audit_logs').insert({
      user_id: sanitizedEntry.userId || null,
      action: sanitizedEntry.action,
      details_encrypted: encryptedDetails,
      timestamp: new Date().toISOString(),
      ...clientInfo
    });

    if (error) {
      console.error('Audit log insertion failed:', error);
      // Don't throw error to avoid breaking main functionality
    }
  } catch (error) {
    console.error('Audit logging error:', error);
    // Fail silently to not disrupt user experience
  }
};

// Security event logging with server-side encryption
export const logSecurityEvent = async (eventType: string, details: Record<string, any>) => {
  await secureLogEvent({
    action: `SECURITY_${eventType}`,
    details: {
      event_type: eventType,
      timestamp: new Date().toISOString(),
      security_level: 'maximum_server_side_encryption',
      ...details
    }
  });
};

// Log the security hardening implementation
export const logSecurityHardening = async (): Promise<void> => {
  try {
    const securityEvent = {
      event: 'SECURITY_HARDENING_INITIALIZED',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent.substring(0, 100),
      url: window.location.href,
      severity: 'info'
    };

    console.log('Security hardening initialized:', securityEvent);
    
    // Store security event locally
    try {
      const securityLogs = JSON.parse(localStorage.getItem('security_events') || '[]');
      securityLogs.push(securityEvent);
      
      // Keep only last 50 events to prevent storage bloat
      if (securityLogs.length > 50) {
        securityLogs.splice(0, securityLogs.length - 50);
      }
      
      localStorage.setItem('security_events', JSON.stringify(securityLogs));
    } catch (error) {
      console.warn('Could not store security event:', error);
    }
  } catch (error) {
    console.error('Failed to log security hardening:', error);
  }
};
