
-- Add triggers table for mood entries
CREATE TABLE mood_triggers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  checkin_id UUID REFERENCES daily_checkins(id) ON DELETE CASCADE,
  trigger_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add gratitude entries table
CREATE TABLE gratitude_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  checkin_id UUID REFERENCES daily_checkins(id) ON DELETE CASCADE,
  gratitude_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add notes column to daily_checkins if not exists
ALTER TABLE daily_checkins 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create indexes for performance
CREATE INDEX idx_mood_triggers_checkin_id ON mood_triggers(checkin_id);
CREATE INDEX idx_gratitude_entries_checkin_id ON gratitude_entries(checkin_id);

-- Enable Row Level Security
ALTER TABLE mood_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE gratitude_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for mood_triggers
CREATE POLICY "Users can view their own mood triggers" ON mood_triggers
  FOR SELECT USING (
    checkin_id IN (
      SELECT id FROM daily_checkins WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own mood triggers" ON mood_triggers
  FOR INSERT WITH CHECK (
    checkin_id IN (
      SELECT id FROM daily_checkins WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own mood triggers" ON mood_triggers
  FOR UPDATE USING (
    checkin_id IN (
      SELECT id FROM daily_checkins WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own mood triggers" ON mood_triggers
  FOR DELETE USING (
    checkin_id IN (
      SELECT id FROM daily_checkins WHERE user_id = auth.uid()
    )
  );

-- RLS policies for gratitude_entries
CREATE POLICY "Users can view their own gratitude entries" ON gratitude_entries
  FOR SELECT USING (
    checkin_id IN (
      SELECT id FROM daily_checkins WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own gratitude entries" ON gratitude_entries
  FOR INSERT WITH CHECK (
    checkin_id IN (
      SELECT id FROM daily_checkins WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own gratitude entries" ON gratitude_entries
  FOR UPDATE USING (
    checkin_id IN (
      SELECT id FROM daily_checkins WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own gratitude entries" ON gratitude_entries
  FOR DELETE USING (
    checkin_id IN (
      SELECT id FROM daily_checkins WHERE user_id = auth.uid()
    )
  );
