-- Create motivational content tables
CREATE TABLE IF NOT EXISTS public.daily_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_text TEXT NOT NULL,
  author TEXT,
  category TEXT NOT NULL DEFAULT 'recovery', -- recovery, mindfulness, strength, hope, gratitude
  tags JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert some inspirational quotes
INSERT INTO public.daily_quotes (quote_text, author, category, tags) VALUES
('The first step towards getting somewhere is to decide that you are not going to stay where you are.', 'J.P. Morgan', 'recovery', '["motivation", "change"]'),
('Recovery is not a race. You don''t have to feel guilty if it takes you longer than you thought it would.', 'Unknown', 'recovery', '["patience", "self-compassion"]'),
('Your journey has molded you for your greater good, and it was exactly what it needed to be.', 'Unknown', 'strength', '["journey", "growth"]'),
('One day at a time. One step at a time. One breath at a time.', 'Unknown', 'mindfulness', '["presence", "peace"]'),
('What lies behind us and what lies before us are tiny matters compared to what lies within us.', 'Ralph Waldo Emerson', 'strength', '["inner-strength", "resilience"]'),
('The greatest revolution of our generation is the discovery that human beings, by changing the inner attitudes of their minds, can change the outer aspects of their lives.', 'William James', 'mindfulness', '["transformation", "mindset"]'),
('Gratitude makes sense of our past, brings peace for today, and creates a vision for tomorrow.', 'Melody Beattie', 'gratitude', '["thankfulness", "perspective"]'),
('You are braver than you believe, stronger than you seem, and smarter than you think.', 'A.A. Milne', 'strength', '["courage", "self-belief"]'),
('The only way out is through.', 'Robert Frost', 'recovery', '["perseverance", "courage"]'),
('Hope is the thing with feathers that perches in the soul and sings the tune without the words and never stops at all.', 'Emily Dickinson', 'hope', '["optimism", "resilience"]');

-- Create personal motivation library table
CREATE TABLE IF NOT EXISTS public.personal_motivations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content_type TEXT NOT NULL, -- quote, image, affirmation, goal
  title TEXT,
  content TEXT NOT NULL,
  image_url TEXT,
  source TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_motivations ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_quotes (public read)
CREATE POLICY "Anyone can view daily quotes" 
ON public.daily_quotes 
FOR SELECT 
USING (is_active = true);

-- RLS policies for personal_motivations
CREATE POLICY "Users can create their own motivations" 
ON public.personal_motivations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own motivations" 
ON public.personal_motivations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own motivations" 
ON public.personal_motivations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own motivations" 
ON public.personal_motivations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add updated_at trigger for personal_motivations
CREATE TRIGGER update_personal_motivations_updated_at
  BEFORE UPDATE ON public.personal_motivations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();