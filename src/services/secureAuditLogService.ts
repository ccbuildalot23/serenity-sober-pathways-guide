
import { supabase } from '@/integrations/supabase/client';
import { secureEncryption } from '@/lib/secureEncryption';
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

    // Encrypt sensitive details using secure encryption
    const encryptedDetails = sanitizedEntry.details 
      ? await secureEncryption.encrypt(JSON.stringify(sanitizedEntry.details))
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

// Security event logging with enhanced tracking
export const logSecurityEvent = async (eventType: string, details: Record<string, any>) => {
  await secureLogEvent({
    action: `SECURITY_${eventType}`,
    details: {
      event_type: eventType,
      timestamp: new Date().toISOString(),
      security_improvement: 'encryption_hardening_applied',
      ...details
    }
  });
};

// Log the security improvement implementation
export const logSecurityImprovement = async () => {
  await logSecurityEvent('SECURITY_HARDENING', {
    improvements: [
      'removed_legacy_encryption_file',
      'strengthened_key_validation',
      'enhanced_security_monitoring'
    ],
    impact: 'critical_vulnerability_resolved'
  });
};
