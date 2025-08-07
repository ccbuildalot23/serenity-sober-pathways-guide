-- Create data export requests table
CREATE TABLE public.data_export_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  request_reason TEXT NOT NULL,
  export_format TEXT NOT NULL DEFAULT 'json',
  date_range_start DATE,
  date_range_end DATE,
  data_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  secure_download_token UUID DEFAULT gen_random_uuid(),
  download_expires_at TIMESTAMP WITH TIME ZONE,
  downloaded_at TIMESTAMP WITH TIME ZONE,
  admin_approval_required BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  file_size_bytes BIGINT,
  checksum TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  export_metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own export requests"
ON public.data_export_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create export requests"
ON public.data_export_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own export requests"
ON public.data_export_requests
FOR UPDATE
USING (auth.uid() = user_id);

-- Create data export logs for HIPAA compliance
CREATE TABLE public.data_export_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  export_request_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  details_encrypted TEXT,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.data_export_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for logs
CREATE POLICY "Users can view their own export logs"
ON public.data_export_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert export logs"
ON public.data_export_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create function to log export activities
CREATE OR REPLACE FUNCTION public.log_export_activity(
  request_id UUID,
  activity_action TEXT,
  activity_details JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.data_export_logs (
    export_request_id,
    user_id,
    action,
    details_encrypted,
    timestamp
  ) VALUES (
    request_id,
    auth.uid(),
    activity_action,
    activity_details::text,
    NOW()
  );
END;
$$;