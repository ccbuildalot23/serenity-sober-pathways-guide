-- Create HIPAA audit logs table for password reset tracking
CREATE TABLE IF NOT EXISTS hipaa_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_email_hash TEXT, -- Hashed email for privacy
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_hipaa_audit_logs_event_type ON hipaa_audit_logs(event_type);
CREATE INDEX idx_hipaa_audit_logs_user_id ON hipaa_audit_logs(user_id);
CREATE INDEX idx_hipaa_audit_logs_timestamp ON hipaa_audit_logs(timestamp);
CREATE INDEX idx_hipaa_audit_logs_session_id ON hipaa_audit_logs(session_id);

-- Add RLS policies
ALTER TABLE hipaa_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admin users can view audit logs" ON hipaa_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Service role can insert audit logs
CREATE POLICY "Service role can insert audit logs" ON hipaa_audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Create a function to clean up old audit logs (retain for 7 years per HIPAA)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM hipaa_audit_logs
  WHERE timestamp < NOW() - INTERVAL '7 years';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to run cleanup monthly (requires pg_cron extension)
-- Note: This needs to be set up in Supabase dashboard or via API
-- SELECT cron.schedule('cleanup-audit-logs', '0 0 1 * *', 'SELECT cleanup_old_audit_logs();');

-- Add comment for documentation
COMMENT ON TABLE hipaa_audit_logs IS 'HIPAA-compliant audit log for tracking password reset and authentication events';
COMMENT ON COLUMN hipaa_audit_logs.user_email_hash IS 'Hashed email address to protect PII while maintaining audit trail';
COMMENT ON COLUMN hipaa_audit_logs.metadata IS 'Additional event-specific data in JSON format';