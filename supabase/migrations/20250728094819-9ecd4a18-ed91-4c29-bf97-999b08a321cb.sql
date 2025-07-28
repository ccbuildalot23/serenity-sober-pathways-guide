-- Update daily_checkins table to match requirements
ALTER TABLE daily_checkins 
ADD COLUMN IF NOT EXISTS sleep_quality integer,
ADD COLUMN IF NOT EXISTS medication_taken boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS triggers jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS coping_strategies jsonb DEFAULT '[]'::jsonb;

-- Create checkin_assessments table
CREATE TABLE IF NOT EXISTS checkin_assessments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checkin_id uuid NOT NULL REFERENCES daily_checkins(id) ON DELETE CASCADE,
  assessment_type text NOT NULL,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on checkin_assessments
ALTER TABLE checkin_assessments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for checkin_assessments
CREATE POLICY "Users can view their own assessment data" 
ON checkin_assessments FOR SELECT 
USING (
  checkin_id IN (
    SELECT id FROM daily_checkins WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own assessment data" 
ON checkin_assessments FOR INSERT 
WITH CHECK (
  checkin_id IN (
    SELECT id FROM daily_checkins WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own assessment data" 
ON checkin_assessments FOR UPDATE 
USING (
  checkin_id IN (
    SELECT id FROM daily_checkins WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own assessment data" 
ON checkin_assessments FOR DELETE 
USING (
  checkin_id IN (
    SELECT id FROM daily_checkins WHERE user_id = auth.uid()
  )
);

-- Create checkin_stats table
CREATE TABLE IF NOT EXISTS checkin_stats (
  user_id uuid NOT NULL PRIMARY KEY,
  total_checkins integer NOT NULL DEFAULT 0,
  streak_count integer NOT NULL DEFAULT 0,
  last_checkin date,
  average_mood numeric,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on checkin_stats
ALTER TABLE checkin_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for checkin_stats
CREATE POLICY "Users can view their own stats" 
ON checkin_stats FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats" 
ON checkin_stats FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats" 
ON checkin_stats FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stats" 
ON checkin_stats FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update checkin stats
CREATE OR REPLACE FUNCTION update_checkin_stats()
RETURNS TRIGGER AS $$
DECLARE
  user_uuid uuid;
  new_streak integer := 0;
  total_count integer;
  avg_mood numeric;
  last_checkin_date date;
BEGIN
  user_uuid := NEW.user_id;
  
  -- Calculate total checkins
  SELECT COUNT(*) INTO total_count
  FROM daily_checkins 
  WHERE user_id = user_uuid AND is_complete = true;
  
  -- Calculate average mood
  SELECT AVG(mood_rating) INTO avg_mood
  FROM daily_checkins 
  WHERE user_id = user_uuid AND mood_rating IS NOT NULL;
  
  -- Calculate current streak
  WITH consecutive_days AS (
    SELECT checkin_date,
           checkin_date - (ROW_NUMBER() OVER (ORDER BY checkin_date DESC))::integer AS group_date
    FROM daily_checkins
    WHERE user_id = user_uuid 
    AND is_complete = true
    AND checkin_date >= CURRENT_DATE - INTERVAL '365 days'
    ORDER BY checkin_date DESC
  ),
  streak_groups AS (
    SELECT group_date, COUNT(*) as consecutive_count
    FROM consecutive_days
    GROUP BY group_date
    ORDER BY group_date DESC
  )
  SELECT COALESCE(consecutive_count, 0) INTO new_streak
  FROM streak_groups
  LIMIT 1;
  
  -- Get last checkin date
  SELECT MAX(checkin_date) INTO last_checkin_date
  FROM daily_checkins 
  WHERE user_id = user_uuid AND is_complete = true;
  
  -- Upsert stats
  INSERT INTO checkin_stats (user_id, total_checkins, streak_count, last_checkin, average_mood, updated_at)
  VALUES (user_uuid, total_count, new_streak, last_checkin_date, avg_mood, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_checkins = EXCLUDED.total_checkins,
    streak_count = EXCLUDED.streak_count,
    last_checkin = EXCLUDED.last_checkin,
    average_mood = EXCLUDED.average_mood,
    updated_at = now();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update stats on checkin completion
CREATE OR REPLACE TRIGGER update_stats_on_checkin
  AFTER INSERT OR UPDATE ON daily_checkins
  FOR EACH ROW
  WHEN (NEW.is_complete = true)
  EXECUTE FUNCTION update_checkin_stats();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_checkin_assessments_checkin_id ON checkin_assessments(checkin_id);
CREATE INDEX IF NOT EXISTS idx_checkin_assessments_type ON checkin_assessments(assessment_type);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date ON daily_checkins(user_id, checkin_date);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_complete ON daily_checkins(user_id, is_complete, checkin_date);