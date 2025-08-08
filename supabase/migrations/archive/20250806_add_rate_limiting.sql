-- Rate Limiting Tables for HIPAA-Compliant Authentication Security
-- Prevents brute force attacks and ensures system availability

-- Create rate limit attempts table
CREATE TABLE IF NOT EXISTS public.rate_limit_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL,
  identifier TEXT NOT NULL, -- Could be user_id, email, or session_id
  ip_address INET,
  success BOOLEAN NOT NULL DEFAULT false,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create rate limit blocks table
CREATE TABLE IF NOT EXISTS public.rate_limit_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT,
  identifier TEXT,
  ip_address INET,
  reason TEXT NOT NULL,
  blocked_until TIMESTAMPTZ NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT at_least_one_identifier CHECK (
    identifier IS NOT NULL OR ip_address IS NOT NULL
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limit_attempts_identifier 
  ON public.rate_limit_attempts(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limit_attempts_ip 
  ON public.rate_limit_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limit_attempts_time 
  ON public.rate_limit_attempts(attempted_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_attempts_endpoint 
  ON public.rate_limit_attempts(endpoint);

CREATE INDEX IF NOT EXISTS idx_rate_limit_blocks_identifier 
  ON public.rate_limit_blocks(identifier) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_rate_limit_blocks_ip 
  ON public.rate_limit_blocks(ip_address) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_rate_limit_blocks_active 
  ON public.rate_limit_blocks(active, blocked_until);

-- Enable RLS
ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies (write-only for users, read for service role)
CREATE POLICY "Service role can manage rate limits"
ON public.rate_limit_attempts
FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage blocks"
ON public.rate_limit_blocks
FOR ALL
USING (auth.role() = 'service_role');

-- Function to check rate limits at database level
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_endpoint TEXT,
  p_identifier TEXT,
  p_ip_address INET,
  p_max_attempts INTEGER,
  p_window_minutes INTEGER
) RETURNS TABLE(
  allowed BOOLEAN,
  attempts_count INTEGER,
  blocked_until TIMESTAMPTZ
) AS $$
DECLARE
  v_attempts_count INTEGER;
  v_blocked_until TIMESTAMPTZ;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Check if currently blocked
  SELECT blocked_until INTO v_blocked_until
  FROM public.rate_limit_blocks
  WHERE active = true
    AND blocked_until > NOW()
    AND (
      (identifier = p_identifier AND identifier IS NOT NULL)
      OR (ip_address = p_ip_address AND ip_address IS NOT NULL)
    )
  ORDER BY blocked_until DESC
  LIMIT 1;
  
  IF v_blocked_until IS NOT NULL THEN
    RETURN QUERY SELECT false, p_max_attempts, v_blocked_until;
    RETURN;
  END IF;
  
  -- Count recent attempts
  SELECT COUNT(*) INTO v_attempts_count
  FROM public.rate_limit_attempts
  WHERE endpoint = p_endpoint
    AND attempted_at > v_window_start
    AND success = false
    AND (
      (identifier = p_identifier AND p_identifier IS NOT NULL)
      OR (ip_address = p_ip_address AND p_ip_address IS NOT NULL)
    );
  
  -- Check if limit exceeded
  IF v_attempts_count >= p_max_attempts THEN
    RETURN QUERY SELECT false, v_attempts_count, NULL::TIMESTAMPTZ;
  ELSE
    RETURN QUERY SELECT true, v_attempts_count, NULL::TIMESTAMPTZ;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record rate limit attempt
CREATE OR REPLACE FUNCTION public.record_rate_limit_attempt(
  p_endpoint TEXT,
  p_identifier TEXT,
  p_ip_address INET,
  p_success BOOLEAN
) RETURNS void AS $$
BEGIN
  INSERT INTO public.rate_limit_attempts (
    endpoint,
    identifier,
    ip_address,
    success,
    attempted_at
  ) VALUES (
    p_endpoint,
    p_identifier,
    p_ip_address,
    p_success,
    NOW()
  );
  
  -- Log to security audit if it's a failed attempt
  IF NOT p_success THEN
    INSERT INTO public.security_audit_logs (
      event_type,
      user_id,
      ip_address,
      risk_level,
      metadata,
      timestamp
    ) VALUES (
      'RATE_LIMIT_ATTEMPT',
      NULL,
      p_ip_address::TEXT,
      'low',
      jsonb_build_object(
        'endpoint', p_endpoint,
        'identifier', p_identifier
      ),
      NOW()
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to block an identifier or IP
CREATE OR REPLACE FUNCTION public.create_rate_limit_block(
  p_endpoint TEXT,
  p_identifier TEXT,
  p_ip_address INET,
  p_reason TEXT,
  p_duration_minutes INTEGER
) RETURNS void AS $$
DECLARE
  v_blocked_until TIMESTAMPTZ;
BEGIN
  v_blocked_until := NOW() + (p_duration_minutes || ' minutes')::INTERVAL;
  
  INSERT INTO public.rate_limit_blocks (
    endpoint,
    identifier,
    ip_address,
    reason,
    blocked_until,
    active,
    created_at
  ) VALUES (
    p_endpoint,
    p_identifier,
    p_ip_address,
    p_reason,
    v_blocked_until,
    true,
    NOW()
  );
  
  -- Log security event
  INSERT INTO public.security_audit_logs (
    event_type,
    user_id,
    ip_address,
    risk_level,
    metadata,
    timestamp
  ) VALUES (
    'RATE_LIMIT_BLOCK_CREATED',
    NULL,
    p_ip_address::TEXT,
    'high',
    jsonb_build_object(
      'endpoint', p_endpoint,
      'identifier', p_identifier,
      'reason', p_reason,
      'blocked_until', v_blocked_until
    ),
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old rate limit data
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  -- Delete attempts older than 7 days
  DELETE FROM public.rate_limit_attempts
  WHERE attempted_at < NOW() - INTERVAL '7 days';
  
  -- Deactivate expired blocks
  UPDATE public.rate_limit_blocks
  SET active = false
  WHERE active = true
    AND blocked_until < NOW();
  
  -- Delete inactive blocks older than 30 days
  DELETE FROM public.rate_limit_blocks
  WHERE active = false
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced authentication function with rate limiting
CREATE OR REPLACE FUNCTION public.authenticate_with_rate_limit(
  p_email TEXT,
  p_password TEXT,
  p_ip_address INET DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_rate_limit_check RECORD;
  v_auth_result JSON;
BEGIN
  -- Check rate limit first
  SELECT * INTO v_rate_limit_check
  FROM public.check_rate_limit(
    'login',
    p_email,
    p_ip_address,
    5,  -- max attempts
    15  -- window in minutes
  );
  
  IF NOT v_rate_limit_check.allowed THEN
    -- Record the blocked attempt
    PERFORM public.record_rate_limit_attempt('login', p_email, p_ip_address, false);
    
    -- Return rate limit error
    RETURN json_build_object(
      'success', false,
      'error', 'rate_limit_exceeded',
      'message', 'Too many login attempts. Please try again later.',
      'blocked_until', v_rate_limit_check.blocked_until
    );
  END IF;
  
  -- Attempt authentication (simplified - use Supabase auth in production)
  -- This is just a placeholder for the actual auth logic
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email
  LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Record successful attempt
    PERFORM public.record_rate_limit_attempt('login', p_email, p_ip_address, true);
    
    RETURN json_build_object(
      'success', true,
      'user_id', v_user_id
    );
  ELSE
    -- Record failed attempt
    PERFORM public.record_rate_limit_attempt('login', p_email, p_ip_address, false);
    
    -- Check if we should block after this failure
    IF v_rate_limit_check.attempts_count >= 4 THEN
      -- This was the 5th attempt, create a block
      PERFORM public.create_rate_limit_block(
        'login',
        p_email,
        p_ip_address,
        'Exceeded maximum login attempts',
        30  -- block for 30 minutes
      );
    END IF;
    
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_credentials',
      'message', 'Invalid email or password',
      'attempts_remaining', 5 - v_rate_limit_check.attempts_count - 1
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to clean up old data (if pg_cron is available)
-- SELECT cron.schedule('cleanup-rate-limits', '0 2 * * *', 'SELECT public.cleanup_old_rate_limits();');

-- Add comments for documentation
COMMENT ON TABLE public.rate_limit_attempts IS 'Tracks all authentication and API attempts for rate limiting';
COMMENT ON TABLE public.rate_limit_blocks IS 'Stores active blocks for identifiers or IPs that exceeded rate limits';
COMMENT ON FUNCTION public.check_rate_limit IS 'Checks if an action is allowed based on rate limit rules';
COMMENT ON FUNCTION public.record_rate_limit_attempt IS 'Records an attempt for rate limiting purposes';
COMMENT ON FUNCTION public.create_rate_limit_block IS 'Creates a rate limit block for an identifier or IP';
COMMENT ON FUNCTION public.cleanup_old_rate_limits IS 'Removes old rate limit data to maintain performance';
COMMENT ON FUNCTION public.authenticate_with_rate_limit IS 'Authentication function with built-in rate limiting';