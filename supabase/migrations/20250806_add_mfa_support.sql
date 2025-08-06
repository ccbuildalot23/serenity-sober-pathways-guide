-- Multi-Factor Authentication Support for Healthcare Providers
-- HIPAA-compliant MFA implementation with TOTP and backup codes

-- Create MFA settings table
CREATE TABLE IF NOT EXISTS public.mfa_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL, -- Encrypted TOTP secret
  backup_codes TEXT, -- Encrypted JSON array of backup codes
  enabled BOOLEAN DEFAULT false,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create MFA sessions table for tracking authenticated sessions
CREATE TABLE IF NOT EXISTS public.mfa_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

-- Create MFA attempts table for rate limiting
CREATE TABLE IF NOT EXISTS public.mfa_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET,
  attempt_type TEXT NOT NULL CHECK (attempt_type IN ('verification', 'setup', 'disable')),
  success BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mfa_settings_user_id ON public.mfa_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_sessions_user_id ON public.mfa_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_sessions_token ON public.mfa_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_mfa_sessions_expires ON public.mfa_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_mfa_attempts_user_id ON public.mfa_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_attempts_ip ON public.mfa_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_mfa_attempts_time ON public.mfa_attempts(attempted_at);

-- Enable RLS
ALTER TABLE public.mfa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for MFA settings
CREATE POLICY "Users can view own MFA settings"
ON public.mfa_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own MFA settings"
ON public.mfa_settings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own MFA settings"
ON public.mfa_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own MFA settings"
ON public.mfa_settings
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for MFA sessions
CREATE POLICY "Users can view own MFA sessions"
ON public.mfa_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own MFA sessions"
ON public.mfa_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own MFA sessions"
ON public.mfa_sessions
FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for MFA attempts (write-only for users, read for admins)
CREATE POLICY "Users can insert own MFA attempts"
ON public.mfa_attempts
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role can read all MFA attempts"
ON public.mfa_attempts
FOR SELECT
USING (auth.role() = 'service_role');

-- Function to check if MFA is required for a user
CREATE OR REPLACE FUNCTION public.is_mfa_required(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = p_user_id;
  
  -- MFA required for providers and admins
  RETURN v_role IN ('provider', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check MFA rate limits
CREATE OR REPLACE FUNCTION public.check_mfa_rate_limit(
  p_user_id UUID,
  p_ip_address INET
) RETURNS BOOLEAN AS $$
DECLARE
  v_recent_failures INTEGER;
  v_ip_failures INTEGER;
BEGIN
  -- Check user-specific failures (last 15 minutes)
  SELECT COUNT(*) INTO v_recent_failures
  FROM public.mfa_attempts
  WHERE user_id = p_user_id
    AND success = false
    AND attempted_at > NOW() - INTERVAL '15 minutes';
  
  -- Check IP-specific failures (last hour)
  SELECT COUNT(*) INTO v_ip_failures
  FROM public.mfa_attempts
  WHERE ip_address = p_ip_address
    AND success = false
    AND attempted_at > NOW() - INTERVAL '1 hour';
  
  -- Block if too many failures
  IF v_recent_failures >= 5 OR v_ip_failures >= 10 THEN
    -- Log security event
    INSERT INTO public.security_audit_logs (
      event_type,
      user_id,
      ip_address,
      risk_level,
      metadata,
      timestamp
    ) VALUES (
      'MFA_RATE_LIMIT_EXCEEDED',
      p_user_id,
      p_ip_address::TEXT,
      'high',
      jsonb_build_object(
        'user_failures', v_recent_failures,
        'ip_failures', v_ip_failures
      ),
      NOW()
    );
    
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired MFA sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_mfa_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.mfa_sessions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate MFA session
CREATE OR REPLACE FUNCTION public.validate_mfa_session(
  p_user_id UUID,
  p_session_token TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_valid BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM public.mfa_sessions
    WHERE user_id = p_user_id
      AND session_token = p_session_token
      AND expires_at > NOW()
  ) INTO v_valid;
  
  IF v_valid THEN
    -- Update last used timestamp
    UPDATE public.mfa_sessions
    SET used_at = NOW()
    WHERE user_id = p_user_id
      AND session_token = p_session_token;
  END IF;
  
  RETURN v_valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_mfa_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mfa_settings_updated_at
BEFORE UPDATE ON public.mfa_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_mfa_updated_at();

-- Add MFA enforcement to authentication
CREATE OR REPLACE FUNCTION public.enforce_mfa_on_login()
RETURNS TRIGGER AS $$
DECLARE
  v_mfa_required BOOLEAN;
  v_mfa_enabled BOOLEAN;
BEGIN
  -- Check if MFA is required for this user
  SELECT public.is_mfa_required(NEW.id) INTO v_mfa_required;
  
  IF v_mfa_required THEN
    -- Check if MFA is enabled
    SELECT enabled INTO v_mfa_enabled
    FROM public.mfa_settings
    WHERE user_id = NEW.id;
    
    -- If MFA is required but not enabled, log warning
    IF NOT COALESCE(v_mfa_enabled, false) THEN
      INSERT INTO public.security_audit_logs (
        event_type,
        user_id,
        risk_level,
        metadata,
        timestamp
      ) VALUES (
        'MFA_REQUIRED_NOT_ENABLED',
        NEW.id,
        'high',
        jsonb_build_object('message', 'Provider logged in without MFA'),
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This trigger would be created on auth.users if we had permission
-- For now, enforce MFA at the application level

-- Create scheduled job to clean up expired sessions (if pg_cron is available)
-- SELECT cron.schedule('cleanup-mfa-sessions', '0 * * * *', 'SELECT public.cleanup_expired_mfa_sessions();');

-- Add comment for documentation
COMMENT ON TABLE public.mfa_settings IS 'Stores MFA configuration for users requiring two-factor authentication';
COMMENT ON TABLE public.mfa_sessions IS 'Tracks active MFA-authenticated sessions';
COMMENT ON TABLE public.mfa_attempts IS 'Logs MFA attempts for rate limiting and security monitoring';
COMMENT ON FUNCTION public.is_mfa_required IS 'Determines if a user role requires MFA';
COMMENT ON FUNCTION public.check_mfa_rate_limit IS 'Checks if user or IP has exceeded MFA attempt limits';
COMMENT ON FUNCTION public.validate_mfa_session IS 'Validates an active MFA session token';