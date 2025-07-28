-- Create support network table for tracking patient-support member relationships
CREATE TABLE public.support_network (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  support_member_id UUID NOT NULL,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('family', 'friend', 'sponsor', 'therapist', 'peer_supporter', 'emergency_contact')),
  permissions JSONB NOT NULL DEFAULT '{"view_mood": true, "view_checkins": false, "crisis_alerts": true, "milestone_alerts": true}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive', 'blocked')),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique relationships
  UNIQUE(patient_id, support_member_id)
);

-- Create support member presence tracking
CREATE TABLE public.support_member_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  do_not_disturb BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification preferences for support members
CREATE TABLE public.support_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  alert_types JSONB NOT NULL DEFAULT '{"crisis": true, "mood_low": true, "missed_checkin": true, "milestones": false, "relapse_risk": true}',
  contact_methods JSONB NOT NULL DEFAULT '{"in_app": true, "email": false, "sms": false}',
  quiet_hours JSONB NOT NULL DEFAULT '{"enabled": false, "start_time": "22:00", "end_time": "08:00", "timezone": "UTC"}',
  frequency_limits JSONB NOT NULL DEFAULT '{"max_daily_alerts": 10, "max_hourly_alerts": 3}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.support_network ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_member_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_network
CREATE POLICY "Patients can view their support network" 
ON public.support_network 
FOR SELECT 
USING (auth.uid() = patient_id);

CREATE POLICY "Support members can view networks they're part of" 
ON public.support_network 
FOR SELECT 
USING (auth.uid() = support_member_id);

CREATE POLICY "Patients can manage their support network" 
ON public.support_network 
FOR ALL 
USING (auth.uid() = patient_id);

-- RLS Policies for support_member_presence
CREATE POLICY "Users can view all presence data" 
ON public.support_member_presence 
FOR SELECT 
USING (true);

CREATE POLICY "Users can manage their own presence" 
ON public.support_member_presence 
FOR ALL 
USING (auth.uid() = user_id);

-- RLS Policies for support_notification_preferences
CREATE POLICY "Users can manage their own notification preferences" 
ON public.support_notification_preferences 
FOR ALL 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_support_network_patient_id ON public.support_network(patient_id);
CREATE INDEX idx_support_network_support_member_id ON public.support_network(support_member_id);
CREATE INDEX idx_support_network_status ON public.support_network(status);
CREATE INDEX idx_support_member_presence_status ON public.support_member_presence(status);
CREATE INDEX idx_support_member_presence_last_seen ON public.support_member_presence(last_seen);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_support_network_updated_at
  BEFORE UPDATE ON public.support_network
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_member_presence_updated_at
  BEFORE UPDATE ON public.support_member_presence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_notification_preferences_updated_at
  BEFORE UPDATE ON public.support_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable real-time functionality
ALTER TABLE public.support_network REPLICA IDENTITY FULL;
ALTER TABLE public.support_member_presence REPLICA IDENTITY FULL;
ALTER TABLE public.support_notification_preferences REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_network;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_member_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_notification_preferences;