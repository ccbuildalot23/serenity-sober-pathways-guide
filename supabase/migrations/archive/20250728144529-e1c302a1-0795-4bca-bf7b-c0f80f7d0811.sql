-- Create moderation_queue table for AI moderation system
CREATE TABLE public.moderation_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  user_id UUID NOT NULL,
  flag_reason TEXT NOT NULL,
  sentiment TEXT,
  crisis_risk TEXT,
  ai_confidence DECIMAL,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies for moderation_queue
CREATE POLICY "Moderators can view all moderation items"
ON public.moderation_queue
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('support_member', 'provider')
  )
);

CREATE POLICY "System can insert moderation items"
ON public.moderation_queue
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Moderators can update moderation items"
ON public.moderation_queue
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('support_member', 'provider')
  )
);

-- Create trigger to update updated_at
CREATE TRIGGER update_moderation_queue_updated_at
BEFORE UPDATE ON public.moderation_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_moderation_queue_status ON public.moderation_queue(status);
CREATE INDEX idx_moderation_queue_priority ON public.moderation_queue(priority);
CREATE INDEX idx_moderation_queue_crisis_risk ON public.moderation_queue(crisis_risk);
CREATE INDEX idx_moderation_queue_created_at ON public.moderation_queue(created_at);
CREATE INDEX idx_moderation_queue_user_id ON public.moderation_queue(user_id);