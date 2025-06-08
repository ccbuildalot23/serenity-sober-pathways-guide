
import { supabase } from '@/integrations/supabase/client';
import { serverSideEncryption } from '@/lib/serverSideEncryption';

interface AuditEntry {
  action: string;
  details?: Record<string, any>;
  userId?: string;
}

export const logEvent = async (entry: AuditEntry) => {
  try {
    // Get current authenticated user for RLS compliance
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('Cannot log audit event: User not authenticated');
      return;
    }

    // Use server-side encryption for all audit logging
    const encryptedDetails = entry.details 
      ? await serverSideEncryption.encrypt(JSON.stringify(entry.details))
      : null;
    
    const { error } = await supabase.from('audit_logs').insert({
      user_id: user.id, // Required for RLS policy
      action: entry.action,
      details_encrypted: encryptedDetails,
      timestamp: new Date().toISOString()
    });

    if (error) {
      console.error('Audit log insertion failed:', error);
    }
  } catch (error) {
    console.error('Audit logging error:', error);
  }
};
