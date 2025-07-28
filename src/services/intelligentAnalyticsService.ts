import { supabase } from '@/integrations/supabase/client';
import { analyticsService } from './analyticsService';

interface MoodForecast {
  date: string;
  predictedMood: number;
  confidence: number;
  factors: string[];
}

interface RiskAlert {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  timeWindow: string;
  triggers: string[];
  recommendations: string[];
}

interface PersonalizedRecommendation {
  id: string;
  type: 'coping_strategy' | 'provider_match' | 'peer_support' | 'content' | 'goal_adjustment';
  title: string;
  description: string;
  confidence: number;
  priority: number;
  reasoning: string[];
  actionItems: string[];
}

interface AnomalyDetection {
  isAnomaly: boolean;
  severity: 'minor' | 'moderate' | 'severe';
  anomalyType: 'mood_drop' | 'engagement_drop' | 'pattern_break' | 'crisis_indicator';
  description: string;
  relatedFactors: string[];
}

interface OptimalTiming {
  checkInTime: string;
  medicationTime?: string;
  therapyPreference: 'morning' | 'afternoon' | 'evening';
  supportContactTime: string;
}

export class IntelligentAnalyticsService {
  // 1. PATTERN DETECTION WITH ML
  
  async detectMoodPatterns(userId: string): Promise<any> {
    try {
      const { data: checkIns } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', userId)
        .order('checkin_date', { ascending: false })
        .limit(90);

      if (!checkIns || checkIns.length < 14) {
        return { patterns: [], confidence: 0, message: 'Insufficient data for pattern detection' };
      }

      const patterns = this.analyzeComplexPatterns(checkIns);
      return patterns;
    } catch (error) {
      console.error('Error detecting patterns:', error);
      throw error;
    }
  }

  private analyzeComplexPatterns(checkIns: any[]) {
    const patterns = {
      cyclicPatterns: this.detectCyclicPatterns(checkIns),
      correlationPatterns: this.detectCorrelationPatterns(checkIns),
      sequentialPatterns: this.detectSequentialPatterns(checkIns),
      anomalies: this.detectAnomalies(checkIns)
    };

    return {
      patterns,
      confidence: this.calculatePatternConfidence(patterns),
      insights: this.generatePatternInsights(patterns)
    };
  }

  private detectCyclicPatterns(checkIns: any[]) {
    // Detect weekly, bi-weekly, and monthly cycles
    const weeklyPattern = this.analyzeCycle(checkIns, 7);
    const biWeeklyPattern = this.analyzeCycle(checkIns, 14);
    const monthlyPattern = this.analyzeCycle(checkIns, 28);

    return {
      weekly: weeklyPattern,
      biWeekly: biWeeklyPattern,
      monthly: monthlyPattern
    };
  }

  private analyzeCycle(checkIns: any[], cycleDays: number) {
    const cycleData: number[][] = [];
    
    for (let i = 0; i < checkIns.length - cycleDays; i += cycleDays) {
      const cycle = checkIns.slice(i, i + cycleDays).map(c => c.mood_rating || 5);
      if (cycle.length === cycleDays) {
        cycleData.push(cycle);
      }
    }

    if (cycleData.length < 2) return { strength: 0, pattern: [] };

    // Calculate pattern strength using correlation between cycles
    const avgPattern = this.calculateAveragePattern(cycleData);
    const strength = this.calculatePatternStrength(cycleData, avgPattern);

    return {
      strength,
      pattern: avgPattern,
      cycles: cycleData.length
    };
  }

  private calculateAveragePattern(cycles: number[][]): number[] {
    if (cycles.length === 0) return [];
    
    const patternLength = cycles[0].length;
    const avgPattern: number[] = [];
    
    for (let day = 0; day < patternLength; day++) {
      const dayValues = cycles.map(cycle => cycle[day]).filter(v => v !== undefined);
      avgPattern[day] = dayValues.reduce((sum, val) => sum + val, 0) / dayValues.length;
    }
    
    return avgPattern;
  }

  private calculatePatternStrength(cycles: number[][], avgPattern: number[]): number {
    if (cycles.length === 0) return 0;
    
    let totalCorrelation = 0;
    
    cycles.forEach(cycle => {
      const correlation = this.calculateCorrelation(cycle, avgPattern);
      totalCorrelation += correlation;
    });
    
    return Math.abs(totalCorrelation / cycles.length);
  }

  private calculateCorrelation(arr1: number[], arr2: number[]): number {
    if (arr1.length !== arr2.length) return 0;
    
    const n = arr1.length;
    const sum1 = arr1.reduce((a, b) => a + b, 0);
    const sum2 = arr2.reduce((a, b) => a + b, 0);
    const sum1sq = arr1.reduce((a, b) => a + b * b, 0);
    const sum2sq = arr2.reduce((a, b) => a + b * b, 0);
    const pSum = arr1.reduce((sum, a, i) => sum + a * arr2[i], 0);
    
    const num = pSum - (sum1 * sum2 / n);
    const den = Math.sqrt((sum1sq - sum1 * sum1 / n) * (sum2sq - sum2 * sum2 / n));
    
    return den === 0 ? 0 : num / den;
  }

  private detectCorrelationPatterns(checkIns: any[]) {
    // Analyze correlations between different metrics
    const correlations = {
      moodEnergy: this.calculateMetricCorrelation(checkIns, 'mood_rating', 'energy_rating'),
      moodHope: this.calculateMetricCorrelation(checkIns, 'mood_rating', 'hope_rating'),
      energyHope: this.calculateMetricCorrelation(checkIns, 'energy_rating', 'hope_rating'),
      moodSleep: this.calculateMetricCorrelation(checkIns, 'mood_rating', 'sleep_quality'),
      moodPhq: this.calculateMetricCorrelation(checkIns, 'mood_rating', 'phq2_score'),
      moodGad: this.calculateMetricCorrelation(checkIns, 'mood_rating', 'gad2_score')
    };

    return correlations;
  }

  private calculateMetricCorrelation(checkIns: any[], metric1: string, metric2: string): number {
    const pairs = checkIns
      .filter(c => c[metric1] !== null && c[metric2] !== null)
      .map(c => [c[metric1], c[metric2]]);
    
    if (pairs.length < 5) return 0;
    
    const arr1 = pairs.map(p => p[0]);
    const arr2 = pairs.map(p => p[1]);
    
    return this.calculateCorrelation(arr1, arr2);
  }

  private detectSequentialPatterns(checkIns: any[]) {
    // Detect sequences that predict mood changes
    const sequences = [];
    
    for (let i = 2; i < checkIns.length; i++) {
      const current = checkIns[i];
      const prev1 = checkIns[i - 1];
      const prev2 = checkIns[i - 2];
      
      if (current.mood_rating && prev1.mood_rating && prev2.mood_rating) {
        const sequence = {
          pattern: [prev2.mood_rating, prev1.mood_rating],
          outcome: current.mood_rating,
          triggers: current.triggers || [],
          coping: current.coping_strategies || []
        };
        sequences.push(sequence);
      }
    }

    return this.analyzeSequenceFrequency(sequences);
  }

  private analyzeSequenceFrequency(sequences: any[]) {
    const patternMap = new Map();
    
    sequences.forEach(seq => {
      const key = seq.pattern.map(p => Math.round(p)).join('-');
      if (!patternMap.has(key)) {
        patternMap.set(key, { count: 0, outcomes: [], triggers: [], coping: [] });
      }
      
      const existing = patternMap.get(key);
      existing.count++;
      existing.outcomes.push(seq.outcome);
      existing.triggers.push(...seq.triggers);
      existing.coping.push(...seq.coping);
    });

    const significantPatterns = Array.from(patternMap.entries())
      .filter(([key, data]) => data.count >= 3)
      .map(([pattern, data]) => ({
        pattern,
        frequency: data.count,
        avgOutcome: data.outcomes.reduce((a, b) => a + b, 0) / data.outcomes.length,
        commonTriggers: this.getTopItems(data.triggers),
        effectiveCoping: this.getTopItems(data.coping)
      }));

    return significantPatterns;
  }

  private getTopItems(items: string[], limit = 3): string[] {
    const counts = items.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([item]) => item);
  }

  private detectAnomalies(checkIns: any[]): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    const moodValues = checkIns.map(c => c.mood_rating).filter(m => m !== null);
    
    if (moodValues.length < 7) return anomalies;

    const mean = moodValues.reduce((a, b) => a + b, 0) / moodValues.length;
    const stdDev = Math.sqrt(
      moodValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / moodValues.length
    );

    checkIns.forEach((checkIn, index) => {
      if (checkIn.mood_rating !== null) {
        const zScore = Math.abs((checkIn.mood_rating - mean) / stdDev);
        
        if (zScore > 2) {
          anomalies.push({
            isAnomaly: true,
            severity: zScore > 3 ? 'severe' : zScore > 2.5 ? 'moderate' : 'minor',
            anomalyType: checkIn.mood_rating < mean ? 'mood_drop' : 'pattern_break',
            description: `Unusual ${checkIn.mood_rating < mean ? 'low' : 'high'} mood on ${checkIn.checkin_date}`,
            relatedFactors: [
              ...(checkIn.triggers || []),
              ...(checkIn.coping_strategies || [])
            ]
          });
        }
      }
    });

    return anomalies;
  }

  private calculatePatternConfidence(patterns: any): number {
    const cyclicConfidence = Math.max(
      patterns.cyclicPatterns.weekly.strength,
      patterns.cyclicPatterns.biWeekly.strength,
      patterns.cyclicPatterns.monthly.strength
    );
    
    const correlationConfidence = Math.max(
      ...Object.values(patterns.correlationPatterns).map(c => Math.abs(c as number))
    );
    
    const sequentialConfidence = patterns.sequentialPatterns.length > 0 ? 0.7 : 0.3;
    
    return (cyclicConfidence * 0.4 + correlationConfidence * 0.3 + sequentialConfidence * 0.3);
  }

  private generatePatternInsights(patterns: any): string[] {
    const insights = [];
    
    // Cyclic pattern insights
    if (patterns.cyclicPatterns.weekly.strength > 0.6) {
      insights.push('Strong weekly mood patterns detected - your mood follows a consistent weekly rhythm');
    }
    
    // Correlation insights
    const strongCorrelations = Object.entries(patterns.correlationPatterns)
      .filter(([key, value]) => Math.abs(value as number) > 0.5);
    
    strongCorrelations.forEach(([key, value]) => {
      const direction = (value as number) > 0 ? 'positively' : 'negatively';
      insights.push(`${key} metrics are strongly ${direction} correlated`);
    });
    
    // Sequential pattern insights
    if (patterns.sequentialPatterns.length > 0) {
      insights.push('Predictable mood sequences identified - certain patterns reliably predict mood changes');
    }
    
    return insights;
  }

  // 2. PREDICTIVE INSIGHTS

  async generate7DayMoodForecast(userId: string): Promise<MoodForecast[]> {
    try {
      const patterns = await this.detectMoodPatterns(userId);
      const { data: recentData } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', userId)
        .order('checkin_date', { ascending: false })
        .limit(30);

      return this.generateMoodForecast(recentData || [], patterns, 7);
    } catch (error) {
      console.error('Error generating forecast:', error);
      return [];
    }
  }

  private generateMoodForecast(recentData: any[], patterns: any, days: number): MoodForecast[] {
    const forecast: MoodForecast[] = [];
    const today = new Date();
    
    for (let i = 1; i <= days; i++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(today.getDate() + i);
      
      const dayOfWeek = forecastDate.getDay();
      const prediction = this.predictMoodForDay(recentData, patterns, dayOfWeek);
      
      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        predictedMood: prediction.mood,
        confidence: prediction.confidence,
        factors: prediction.factors
      });
    }
    
    return forecast;
  }

  private predictMoodForDay(recentData: any[], patterns: any, dayOfWeek: number): any {
    // Base prediction on recent average
    const recentMoods = recentData.slice(0, 7).map(d => d.mood_rating).filter(m => m !== null);
    const recentAvg = recentMoods.length > 0 ? 
      recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length : 5;
    
    // Adjust based on weekly pattern if available
    let weeklyAdjustment = 0;
    if (patterns.patterns?.cyclicPatterns?.weekly?.strength > 0.5) {
      const weeklyPattern = patterns.patterns.cyclicPatterns.weekly.pattern;
      if (weeklyPattern && weeklyPattern[dayOfWeek] !== undefined) {
        const weeklyAvg = weeklyPattern.reduce((a, b) => a + b, 0) / weeklyPattern.length;
        weeklyAdjustment = weeklyPattern[dayOfWeek] - weeklyAvg;
      }
    }
    
    const predictedMood = Math.max(1, Math.min(10, recentAvg + weeklyAdjustment));
    const confidence = patterns.confidence || 0.5;
    
    const factors = [];
    if (weeklyAdjustment > 0.5) factors.push('Weekly pattern suggests higher mood');
    if (weeklyAdjustment < -0.5) factors.push('Weekly pattern suggests lower mood');
    if (recentAvg < 4) factors.push('Recent low mood trend');
    if (recentAvg > 7) factors.push('Recent positive mood trend');
    
    return {
      mood: Math.round(predictedMood * 10) / 10,
      confidence: Math.round(confidence * 100) / 100,
      factors
    };
  }

  async generateRiskAlerts(userId: string): Promise<RiskAlert[]> {
    try {
      const currentRisk = await analyticsService.getCrisisRiskPrediction(userId);
      const patterns = await this.detectMoodPatterns(userId);
      const forecast = await this.generate7DayMoodForecast(userId);
      
      const alerts: RiskAlert[] = [];
      
      // Current risk alert
      if (currentRisk.risk_level !== 'low') {
        alerts.push({
          riskLevel: currentRisk.risk_level as any,
          probability: currentRisk.confidence * 100,
          timeWindow: 'next 24-48 hours',
          triggers: currentRisk.factors || [],
          recommendations: [currentRisk.recommendation]
        });
      }
      
      // Forecast-based alerts
      const lowMoodDays = forecast.filter(f => f.predictedMood < 4);
      if (lowMoodDays.length >= 3) {
        alerts.push({
          riskLevel: 'medium',
          probability: 75,
          timeWindow: 'next 7 days',
          triggers: ['Pattern-based prediction', 'Multiple low mood days forecasted'],
          recommendations: [
            'Schedule extra support sessions',
            'Increase self-care activities',
            'Prepare coping strategies in advance'
          ]
        });
      }
      
      return alerts;
    } catch (error) {
      console.error('Error generating risk alerts:', error);
      return [];
    }
  }

  async suggestOptimalTiming(userId: string): Promise<OptimalTiming> {
    try {
      const { data: checkIns } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

      const timeAnalysis = this.analyzeOptimalTimes(checkIns || []);
      
      return {
        checkInTime: timeAnalysis.bestCheckInTime,
        medicationTime: timeAnalysis.bestMedicationTime,
        therapyPreference: timeAnalysis.bestTherapyTime,
        supportContactTime: timeAnalysis.bestSupportTime
      };
    } catch (error) {
      console.error('Error analyzing optimal timing:', error);
      return {
        checkInTime: '09:00',
        therapyPreference: 'morning',
        supportContactTime: '10:00'
      };
    }
  }

  private analyzeOptimalTimes(checkIns: any[]): any {
    // Analyze when users typically check in and have better moods
    const timeData = checkIns.map(c => ({
      hour: new Date(c.created_at).getHours(),
      mood: c.mood_rating,
      energy: c.energy_rating
    }));

    const hourlyStats = timeData.reduce((acc, data) => {
      if (!acc[data.hour]) {
        acc[data.hour] = { moods: [], energies: [], count: 0 };
      }
      acc[data.hour].count++;
      if (data.mood) acc[data.hour].moods.push(data.mood);
      if (data.energy) acc[data.hour].energies.push(data.energy);
      return acc;
    }, {} as Record<number, any>);

    // Find optimal times based on mood and consistency
    const bestCheckInHour = this.findBestHour(hourlyStats, 'consistency');
    const bestMoodHour = this.findBestHour(hourlyStats, 'mood');
    
    return {
      bestCheckInTime: `${String(bestCheckInHour).padStart(2, '0')}:00`,
      bestMedicationTime: '08:00', // Default morning time
      bestTherapyTime: bestMoodHour < 12 ? 'morning' : bestMoodHour < 17 ? 'afternoon' : 'evening',
      bestSupportTime: `${String(Math.max(9, bestMoodHour)).padStart(2, '0')}:00`
    };
  }

  private findBestHour(hourlyStats: Record<number, any>, criteria: 'consistency' | 'mood'): number {
    const hours = Object.keys(hourlyStats).map(Number);
    
    if (criteria === 'consistency') {
      return hours.reduce((best, hour) => 
        hourlyStats[hour].count > hourlyStats[best]?.count ? hour : best
      , hours[0] || 9);
    } else {
      return hours.reduce((best, hour) => {
        const avgMood = hourlyStats[hour].moods.length > 0 ?
          hourlyStats[hour].moods.reduce((a, b) => a + b, 0) / hourlyStats[hour].moods.length : 5;
        const bestAvgMood = hourlyStats[best]?.moods.length > 0 ?
          hourlyStats[best].moods.reduce((a, b) => a + b, 0) / hourlyStats[best].moods.length : 5;
        return avgMood > bestAvgMood ? hour : best;
      }, hours[0] || 10);
    }
  }

  // 3. RECOMMENDATION ENGINE

  async generatePersonalizedRecommendations(userId: string): Promise<PersonalizedRecommendation[]> {
    try {
      const patterns = await this.detectMoodPatterns(userId);
      const { data: userHistory } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', userId)
        .order('checkin_date', { ascending: false })
        .limit(60);

      const recommendations: PersonalizedRecommendation[] = [];
      
      // Coping strategy recommendations
      const copingRecs = this.generateCopingRecommendations(userHistory || [], patterns);
      recommendations.push(...copingRecs);
      
      // Goal adjustment recommendations
      const goalRecs = this.generateGoalRecommendations(userHistory || [], patterns);
      recommendations.push(...goalRecs);
      
      // Content recommendations
      const contentRecs = this.generateContentRecommendations(userHistory || [], patterns);
      recommendations.push(...contentRecs);
      
      return recommendations.sort((a, b) => b.priority - a.priority).slice(0, 8);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }

  private generateCopingRecommendations(history: any[], patterns: any): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = [];
    
    // Analyze effective coping strategies
    const strategyEffectiveness = this.analyzeCopingEffectiveness(history);
    
    if (strategyEffectiveness.length > 0) {
      const mostEffective = strategyEffectiveness[0];
      recommendations.push({
        id: `coping-${Date.now()}`,
        type: 'coping_strategy',
        title: `Increase use of ${mostEffective.strategy}`,
        description: `You've had great success with "${mostEffective.strategy}" - consider using it more frequently.`,
        confidence: mostEffective.confidence,
        priority: 8,
        reasoning: [
          `Average mood improvement: ${mostEffective.avgImprovement.toFixed(1)} points`,
          `Used successfully ${mostEffective.uses} times`,
          `${Math.round(mostEffective.successRate * 100)}% success rate`
        ],
        actionItems: [
          `Set a reminder to use "${mostEffective.strategy}" daily`,
          'Track its effectiveness for the next week',
          'Consider combining it with other successful strategies'
        ]
      });
    }
    
    return recommendations;
  }

  private analyzeCopingEffectiveness(history: any[]): any[] {
    const strategyData = new Map();
    
    history.forEach(checkIn => {
      if (checkIn.coping_strategies && checkIn.mood_rating) {
        checkIn.coping_strategies.forEach(strategy => {
          if (!strategyData.has(strategy)) {
            strategyData.set(strategy, { moods: [], uses: 0 });
          }
          strategyData.get(strategy).moods.push(checkIn.mood_rating);
          strategyData.get(strategy).uses++;
        });
      }
    });
    
    return Array.from(strategyData.entries())
      .map(([strategy, data]) => ({
        strategy,
        avgMood: data.moods.reduce((a, b) => a + b, 0) / data.moods.length,
        avgImprovement: data.moods.reduce((a, b) => a + b, 0) / data.moods.length - 5, // Baseline of 5
        uses: data.uses,
        successRate: data.moods.filter(m => m >= 6).length / data.moods.length,
        confidence: Math.min(data.uses / 10, 1) // Confidence based on usage frequency
      }))
      .filter(s => s.uses >= 3 && s.avgMood >= 6)
      .sort((a, b) => b.avgMood - a.avgMood);
  }

  private generateGoalRecommendations(history: any[], patterns: any): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = [];
    
    // Analyze consistency and suggest adjustments
    const consistency = this.analyzeConsistency(history);
    
    if (consistency < 0.7) {
      recommendations.push({
        id: `goal-consistency-${Date.now()}`,
        type: 'goal_adjustment',
        title: 'Adjust Check-in Goals for Better Consistency',
        description: 'Your current check-in pattern suggests your goals might be too ambitious. Consider smaller, more achievable targets.',
        confidence: 0.8,
        priority: 6,
        reasoning: [
          `Current consistency: ${Math.round(consistency * 100)}%`,
          'Lower consistency often indicates unrealistic expectations',
          'Smaller goals lead to better long-term success'
        ],
        actionItems: [
          'Reduce daily check-in expectations by 25%',
          'Focus on 3 key metrics instead of all',
          'Celebrate small wins to build momentum'
        ]
      });
    }
    
    return recommendations;
  }

  private analyzeConsistency(history: any[]): number {
    if (history.length === 0) return 0;
    
    const last30Days = 30;
    const completedDays = history.filter(h => h.is_complete).length;
    return Math.min(completedDays / last30Days, 1);
  }

  private generateContentRecommendations(history: any[], patterns: any): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = [];
    
    // Analyze mood trends to suggest content
    const recentMoods = history.slice(0, 7).map(h => h.mood_rating).filter(m => m !== null);
    const avgRecentMood = recentMoods.length > 0 ? 
      recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length : 5;
    
    if (avgRecentMood < 5) {
      recommendations.push({
        id: `content-mood-boost-${Date.now()}`,
        type: 'content',
        title: 'Mood-Boosting Content Recommendations',
        description: 'Based on your recent mood patterns, here are some content suggestions that might help.',
        confidence: 0.7,
        priority: 5,
        reasoning: [
          `Recent average mood: ${avgRecentMood.toFixed(1)}`,
          'Research shows positive content can improve mood',
          'Personalized based on your history'
        ],
        actionItems: [
          'Read uplifting recovery stories',
          'Practice guided mindfulness exercises',
          'Watch motivational videos about resilience'
        ]
      });
    }
    
    return recommendations;
  }
}

export const intelligentAnalyticsService = new IntelligentAnalyticsService();