-- Database schema updates for support alerts and daily check-ins

CREATE TABLE support_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES support_contacts(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  urgency VARCHAR(10) CHECK (urgency IN ('low', 'medium', 'high')),
  status VARCHAR(20) DEFAULT 'pending',
  location JSONB,
  requires_immediate_response BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

CREATE TABLE daily_check_ins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL,
  mood_rating INTEGER CHECK (mood_rating BETWEEN 1 AND 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, check_in_date)
);

CREATE TABLE accountability_partners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  check_in_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_triggers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(20) CHECK (category IN ('emotional', 'environmental', 'social', 'physical')),
  intensity INTEGER CHECK (intensity BETWEEN 1 AND 10),
  coping_strategies TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trigger_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_id UUID REFERENCES user_triggers(id) ON DELETE CASCADE,
  initial_intensity INTEGER,
  final_intensity INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE coping_exercise_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id VARCHAR(50),
  trigger_id UUID REFERENCES user_triggers(id),
  pre_intensity INTEGER,
  post_intensity INTEGER,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_support_alerts_user_id ON support_alerts(user_id);
CREATE INDEX idx_support_alerts_contact_id ON support_alerts(contact_id);
CREATE INDEX idx_daily_check_ins_user_date ON daily_check_ins(user_id, check_in_date);
CREATE INDEX idx_trigger_logs_user_id ON trigger_logs(user_id);

