-- Phase 5: Advanced Analytics & Clinical Integration

-- Analytics and insights tables
CREATE TABLE IF NOT EXISTS public.user_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  analytics_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood_trend_7day DECIMAL,
  mood_trend_30day DECIMAL,
  checkin_consistency_score DECIMAL,
  crisis_risk_score DECIMAL,
  recovery_progress_score DECIMAL,
  engagement_metrics JSONB DEFAULT '{}',
  pattern_insights JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, analytics_date)
);

-- Clinical assessments tracking
CREATE TABLE IF NOT EXISTS public.clinical_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider_id UUID,
  assessment_type TEXT NOT NULL,
  assessment_data JSONB NOT NULL DEFAULT '{}',
  scores JSONB NOT NULL DEFAULT '{}',
  interpretation TEXT,
  recommendations TEXT,
  scheduled_date DATE,
  completed_date DATE,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Outcome measurements
CREATE TABLE IF NOT EXISTS public.outcome_measures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider_id UUID,
  measure_type TEXT NOT NULL,
  baseline_score DECIMAL,
  current_score DECIMAL,
  target_score DECIMAL,
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  improvement_percentage DECIMAL,
  clinical_significance BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Pattern analysis for crisis prediction
CREATE TABLE IF NOT EXISTS public.crisis_prediction_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pattern_type TEXT NOT NULL,
  pattern_data JSONB NOT NULL DEFAULT '{}',
  risk_indicators JSONB DEFAULT '{}',
  confidence_score DECIMAL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Provider clinical notes and plans
CREATE TABLE IF NOT EXISTS public.treatment_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'comprehensive',
  goals JSONB DEFAULT '[]',
  interventions JSONB DEFAULT '[]',
  timeline_weeks INTEGER DEFAULT 12,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  review_date DATE,
  effectiveness_rating DECIMAL
);

-- RLS Policies
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcome_measures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crisis_prediction_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;

-- User analytics policies
CREATE POLICY "Users can view their own analytics"
ON public.user_analytics FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics"
ON public.user_analytics FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics"
ON public.user_analytics FOR UPDATE
USING (auth.uid() = user_id);

-- Clinical assessments policies
CREATE POLICY "Users can view their own assessments"
ON public.clinical_assessments FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = provider_id);

CREATE POLICY "Providers can manage assessments"
ON public.clinical_assessments FOR ALL
USING (auth.uid() = provider_id OR auth.uid() = user_id);

-- Outcome measures policies
CREATE POLICY "Users can view their own outcomes"
ON public.outcome_measures FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = provider_id);

CREATE POLICY "Providers can manage outcomes"
ON public.outcome_measures FOR ALL
USING (auth.uid() = provider_id OR auth.uid() = user_id);

-- Crisis prediction policies
CREATE POLICY "Users can view their own patterns"
ON public.crisis_prediction_patterns FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage prediction patterns"
ON public.crisis_prediction_patterns FOR ALL
USING (true);

-- Treatment plans policies
CREATE POLICY "Participants can view treatment plans"
ON public.treatment_plans FOR SELECT
USING (auth.uid() = patient_id OR auth.uid() = provider_id);

CREATE POLICY "Providers can manage treatment plans"
ON public.treatment_plans FOR ALL
USING (auth.uid() = provider_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_date ON public.user_analytics(user_id, analytics_date DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_assessments_user ON public.clinical_assessments(user_id, assessment_type);
CREATE INDEX IF NOT EXISTS idx_outcome_measures_user ON public.outcome_measures(user_id, measure_type, measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_crisis_patterns_user ON public.crisis_prediction_patterns(user_id, pattern_type);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient ON public.treatment_plans(patient_id, status);

-- Triggers for updated_at
CREATE TRIGGER update_user_analytics_updated_at
  BEFORE UPDATE ON public.user_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clinical_assessments_updated_at
  BEFORE UPDATE ON public.clinical_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_treatment_plans_updated_at
  BEFORE UPDATE ON public.treatment_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();