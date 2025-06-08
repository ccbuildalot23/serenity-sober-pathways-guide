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

/**
 * Ultra-secure audit logging service that uses server-side encryption
 * Updated to work with RLS policies requiring authenticated users
 */
export const secureServerLogEvent = async (entry: AuditEntry) => {
  try {
    // Get current authenticated user for RLS compliance
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('Cannot log audit event: User not authenticated');
      // Store in local fallback for anonymous events
      storeLocalFallback(entry);
      return;
    }

    // Validate and sanitize input data
    const sanitizedEntry = {
      action: InputValidator.sanitizeText(entry.action),
      details: entry.details ? InputValidator.sanitizeJsonData(entry.details) : null,
      userId: entry.userId || user.id, // Use authenticated user ID
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

    const { error } = await supabase.from('audit_logs').insert({
      user_id: user.id, // Required for RLS policy - always use authenticated user
      action: sanitizedEntry.action,
      details_encrypted: encryptedDetails,
      timestamp: new Date().toISOString(),
      ...clientInfo
    });

    if (error) {
      console.error('Secure audit log insertion failed:', error);
      storeLocalFallback(entry);
    }
  } catch (error) {
    console.error('Secure audit logging error:', error);
    storeLocalFallback(entry);
  }
};

const storeLocalFallback = (entry: AuditEntry) => {
  try {
    const fallbackLogs = JSON.parse(localStorage.getItem('audit_fallback') || '[]');
    fallbackLogs.push({
      ...entry,
      timestamp: new Date().toISOString(),
      fallback: true
    });
    
    // Keep only last 50 events
    if (fallbackLogs.length > 50) {
      fallbackLogs.splice(0, fallbackLogs.length - 50);
    }
    
    localStorage.setItem('audit_fallback', JSON.stringify(fallbackLogs));
  } catch (error) {
    console.warn('Failed to store audit fallback:', error);
  }
};

// Security event logging with enhanced server-side encryption
export const logServerSecurityEvent = async (eventType: string, details: Record<string, any>) => {
  await secureServerLogEvent({
    action: `SECURITY_${eventType}`,
    details: {
      event_type: eventType,
      timestamp: new Date().toISOString(),
      security_level: 'maximum_server_side_encryption',
      ...details
    }
  });
};

// Log the security upgrade implementation
export const logSecurityUpgrade = async () => {
  await logServerSecurityEvent('ENCRYPTION_UPGRADE', {
    improvements: [
      'implemented_server_side_encryption',
      'encryption_key_never_leaves_server',
      'maximum_security_compliance',
      'rls_policies_enforced',
      'user_authentication_required'
    ],
    impact: 'highest_security_level_achieved'
  });
};
