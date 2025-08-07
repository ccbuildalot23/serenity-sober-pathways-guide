-- Create daily_pledges table
CREATE TABLE public.daily_pledges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pledge_date DATE NOT NULL,
  morning_commitment TEXT,
  evening_reflection TEXT,
  completed_morning BOOLEAN DEFAULT FALSE,
  completed_evening BOOLEAN DEFAULT FALSE,
  template_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pledge_templates table
CREATE TABLE public.pledge_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL,
  morning_prompt TEXT NOT NULL,
  evening_prompt TEXT NOT NULL,
  category TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_pledges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pledge_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for daily_pledges
CREATE POLICY "Users can view their own pledges" 
ON public.daily_pledges 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pledges" 
ON public.daily_pledges 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pledges" 
ON public.daily_pledges 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pledges" 
ON public.daily_pledges 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for pledge_templates
CREATE POLICY "Users can view default and own templates" 
ON public.pledge_templates 
FOR SELECT 
USING (is_default = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own templates" 
ON public.pledge_templates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND is_default = false);

CREATE POLICY "Users can update their own templates" 
ON public.pledge_templates 
FOR UPDATE 
USING (auth.uid() = user_id AND is_default = false);

CREATE POLICY "Users can delete their own templates" 
ON public.pledge_templates 
FOR DELETE 
USING (auth.uid() = user_id AND is_default = false);

-- Create unique constraint for one pledge per user per day
ALTER TABLE public.daily_pledges 
ADD CONSTRAINT daily_pledges_user_date_unique 
UNIQUE (user_id, pledge_date);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_daily_pledges_updated_at
  BEFORE UPDATE ON public.daily_pledges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default pledge templates
INSERT INTO public.pledge_templates (title, morning_prompt, evening_prompt, category, is_default) VALUES
('Mindful Recovery', 'Today, I commit to staying present and mindful in my serenity journey.', 'What am I most grateful for today?', 'mindfulness', true),
('Seeking Support', 'I pledge to reach out for support when I need it and to be gentle with myself.', 'How did I honor my commitment to myself today?', 'support', true),
('Daily Progress', 'Today, I choose healing and will take one positive step forward.', 'What challenges did I face, and how did I handle them?', 'progress', true),
('Honoring Recovery', 'I commit to honoring my recovery and the progress I have made so far.', 'What can I learn from today to help my serenity tomorrow?', 'recovery', true);