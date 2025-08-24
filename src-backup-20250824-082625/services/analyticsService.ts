import { supabase } from '@/integrations/supabase/client';

export interface UserAnalytics {
  id: string;
  user_id: string;
  analytics_date: string;
  mood_trend_7day?: number;
  mood_trend_30day?: number;
  checkin_consistency_score?: number;
  crisis_risk_score?: number;
  recovery_progress_score?: number;
  engagement_metrics: unknown;
  pattern_insights: unknown;
}

export interface ClinicalAssessment {
  id: string;
  user_id: string;
  provider_id?: string;
  assessment_type: string;
  assessment_data: unknown;
  scores: unknown;
  interpretation?: string;
  recommendations?: string;
  status: string;
  scheduled_date?: string;
  completed_date?: string;
}

export interface OutcomeMeasure {
  id: string;
  user_id: string;
  provider_id?: string;
  measure_type: string;
  baseline_score?: number;
  current_score?: number;
  target_score?: number;
  improvement_percentage?: number;
  clinical_significance: boolean;
  measurement_date: string;
  notes?: string;
}

class AnalyticsService {
  
  async generateUserAnalytics(_userId: string): Promise<UserAnalytics | null> {
    try {
      // Calculate analytics based on check-ins and other data
      const { data: _checkIns } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', _userId)
        .order('checkin_date', { ascending: false })
        .limit(30);

      if (!_checkIns || _checkIns.length === 0) {
        return null;
      }

      // Calculate mood trends
      const recent7Days = _checkIns.slice(0, 7);
      const recent30Days = _checkIns;
      
      const mood7Day = recent7Days.reduce((sum, ci) => sum + (ci.mood_rating || 0), 0) / recent7Days.length;
      const mood30Day = recent30Days.reduce((sum, ci) => sum + (ci.mood_rating || 0), 0) / recent30Days.length;
      
      // Calculate consistency score
      const consistencyScore = (_checkIns.length / 30) * 100;
      
      // Crisis risk assessment based on recent patterns
      const recentLowMoods = recent7Days.filter(ci => (ci.mood_rating || 0) < 4).length;
      const crisisRisk = Math.min((recentLowMoods / 7) * 100, 100);
      
      // Recovery progress (trend over time)
      const firstHalf = recent30Days.slice(15);
      const secondHalf = recent30Days.slice(0, 15);
      const firstAvg = firstHalf.reduce((sum, ci) => sum + (ci.mood_rating || 0), 0) / Math.max(firstHalf.length, 1);
      const secondAvg = secondHalf.reduce((sum, ci) => sum + (ci.mood_rating || 0), 0) / Math.max(secondHalf.length, 1);
      const recoveryProgress = ((secondAvg - firstAvg) / 10) * 100;

      const _analyticsData = {
        user_id: _userId,
        analytics_date: new Date().toISOString().split('T')[0],
        mood_trend_7day: Math.round(mood7Day * 100) / 100,
        mood_trend_30day: Math.round(mood30Day * 100) / 100,
        checkin_consistency_score: Math.round(consistencyScore * 100) / 100,
        crisis_risk_score: Math.round(crisisRisk * 100) / 100,
        recovery_progress_score: Math.round(recoveryProgress * 100) / 100,
        engagement_metrics: {
          total_checkins: _checkIns.length,
          avg_mood: mood30Day,
          streak_days: this.calculateStreak(_checkIns)
        },
        pattern_insights: {
          best_day_of_week: this.getBestDayOfWeek(_checkIns),
          challenging_times: this.getChallengingTimes(_checkIns)
        }
      };

      // Upsert analytics
      const { data, _error } = await supabase
        .from('user_analytics')
        .upsert(_analyticsData, { onConflict: 'user_id,analytics_date' })
        .select()
        .single();

      if (_error) throw _error;
      return data;

    } catch (_error) {
      console._error('Error generating analytics:', _error);
      return null;
    }
  }

  async getUserAnalytics(_userId: string, days: number = 30): Promise<UserAnalytics[]> {
    const { data, _error } = await supabase
      .from('user_analytics')
      .select('*')
      .eq('user_id', _userId)
      .gte('analytics_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('analytics_date', { ascending: false });

    if (_error) throw _error;
    return data || [];
  }

  async createClinicalAssessment(assessment: unknown): Promise<unknown> {
    const { data, _error } = await supabase
      .from('clinical_assessments')
      .insert(assessment)
      .select()
      .single();

    if (_error) throw _error;
    return data;
  }

  async getClinicalAssessments(_userId: string): Promise<ClinicalAssessment[]> {
    const { data, _error } = await supabase
      .from('clinical_assessments')
      .select('*')
      .eq('user_id', _userId)
      .order('created_at', { ascending: false });

    if (_error) throw _error;
    return data || [];
  }

  async updateClinicalAssessment(id: string, _updates: Partial<ClinicalAssessment>): Promise<ClinicalAssessment | null> {
    const { data, _error } = await supabase
      .from('clinical_assessments')
      .update(_updates)
      .eq('id', id)
      .select()
      .single();

    if (_error) throw _error;
    return data;
  }

  async createOutcomeMeasure(measure: unknown): Promise<unknown> {
    const { data, _error } = await supabase
      .from('outcome_measures')
      .insert(measure)
      .select()
      .single();

    if (_error) throw _error;
    return data;
  }

  async getOutcomeMeasures(_userId: string): Promise<OutcomeMeasure[]> {
    const { data, _error } = await supabase
      .from('outcome_measures')
      .select('*')
      .eq('user_id', _userId)
      .order('measurement_date', { ascending: false });

    if (_error) throw _error;
    return data || [];
  }

  async getCrisisRiskPrediction(_userId: string): Promise<unknown> {
    try {
      // Get recent patterns and calculate risk
      const { data: patterns } = await supabase
        .from('crisis_prediction_patterns')
        .select('*')
        .eq('user_id', _userId)
        .eq('is_active', true)
        .order('last_updated', { ascending: false });

      const { data: recentCheckIns } = await supabase
        .from('daily_checkins')
        .select('mood_rating, energy_rating, created_at')
        .eq('user_id', _userId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (!recentCheckIns || recentCheckIns.length === 0) {
        return { risk_level: 'low', confidence: 0, factors: [] };
      }

      // Simple risk calculation
      const avgMood = recentCheckIns.reduce((sum, ci) => sum + (ci.mood_rating || 5), 0) / recentCheckIns.length;
      const avgEnergy = recentCheckIns.reduce((sum, ci) => sum + (ci.energy_rating || 5), 0) / recentCheckIns.length;
      
      let riskScore = 0;
      const factors = [];

      if (avgMood < 3) {
        riskScore += 40;
        factors.push('Low mood pattern detected');
      }
      if (avgEnergy < 3) {
        riskScore += 30;
        factors.push('Low energy levels');
      }
      if (recentCheckIns.length < 3) {
        riskScore += 20;
        factors.push('Decreased engagement');
      }

      const _riskLevel = riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low';
      
      return {
        risk_level: _riskLevel,
        confidence: Math.min(riskScore / 100, 1),
        factors,
        recommendation: this.getRiskRecommendation(_riskLevel)
      };

    } catch (_error) {
      console._error('Error calculating crisis risk:', _error);
      return { risk_level: 'unknown', confidence: 0, factors: [] };
    }
  }

  private calculateStreak(_checkIns: unknown[]): number {
    if (!_checkIns.length) return 0;
    
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < _checkIns.length; i++) {
      const checkInDate = new Date(_checkIns[i].checkin_date);
      const daysDiff = Math.floor((today.getTime() - checkInDate.getTime()) / (24 * 60 * 60 * 1000));
      
      if (daysDiff === streak) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  private getBestDayOfWeek(_checkIns: unknown[]): string {
    const _dayAverages: Record<string, number[]> = {};
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    _checkIns.forEach(ci => {
      if (ci.mood_rating) {
        const day = days[new Date(ci.checkin_date).getDay()];
        if (!_dayAverages[day]) _dayAverages[day] = [];
        _dayAverages[day].push(ci.mood_rating);
      }
    });

    let bestDay = '';
    let bestAverage = 0;
    
    Object.entries(_dayAverages).forEach(([day, ratings]) => {
      const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
      if (avg > bestAverage) {
        bestAverage = avg;
        bestDay = day;
      }
    });

    return bestDay;
  }

  private getChallengingTimes(_checkIns: unknown[]): string[] {
    const challenges = [];
    const lowMoodDays = _checkIns.filter(ci => (ci.mood_rating || 0) < 4);
    
    if (lowMoodDays.length > _checkIns.length * 0.3) {
      challenges.push('Frequent low mood periods');
    }
    
    return challenges;
  }

  private getRiskRecommendation(_riskLevel: string): string {
    switch (_riskLevel) {
      case 'high':
        return 'Consider reaching out to your support network or crisis resources immediately';
      case 'medium':
        return 'Focus on self-care activities and consider scheduling check-ins with your support team';
      case 'low':
        return 'Continue your current wellness practices';
      default:
        return 'Maintain regular check-ins to better understand your patterns';
    }
  }
}

export const analyticsService = new AnalyticsService();