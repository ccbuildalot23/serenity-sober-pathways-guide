import { supabase } from '@/integrations/supabase/client';
import { encrypt } from '@/lib/encryption';

interface AuditEntry {
  action: string;
  details?: Record<string, any>;
  userId?: string;
}

export const logEvent = async (entry: AuditEntry) => {
  const encryptedDetails = entry.details ? await encrypt(JSON.stringify(entry.details)) : null;
  await supabase.from('audit_logs').insert({
    user_id: entry.userId || null,
    action: entry.action,
    details_encrypted: encryptedDetails,
    timestamp: new Date().toISOString()
  });
};
