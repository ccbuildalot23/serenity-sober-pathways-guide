
import type { CrisisResolution, CheckInResponse } from '@/types/crisisData';

export interface PatternAnalysis {
  interventionStats: Record<string, { count: number; totalEffectiveness: number; averageEffectiveness: number }>;
  crisisPrecursors: Array<{ mood: number; timestamp: Date; notes: string }>;
  riskScore: number;
  vulnerableHours: Array<{ hour: number; probability: number }>;
}

export const analyzePatterns = (
  resolutions: CrisisResolution[],
  checkIns: CheckInResponse[]
): PatternAnalysis => {
  // Analyze intervention effectiveness
  const interventionStats = resolutions.reduce((acc, res) => {
    res.interventions_used.forEach(intervention => {
      if (!acc[intervention]) {
        acc[intervention] = { count: 0, totalEffectiveness: 0, averageEffectiveness: 0 };
      }
      acc[intervention].count++;
      acc[intervention].totalEffectiveness += res.effectiveness_rating;
      acc[intervention].averageEffectiveness = 
        acc[intervention].totalEffectiveness / acc[intervention].count;
    });
    return acc;
  }, {} as Record<string, { count: number; totalEffectiveness: number; averageEffectiveness: number }>);

  // Identify crisis precursors
  const crisisPrecursors = checkIns
    .filter(check => check.mood_rating <= 3)
    .map(check => ({
      mood: check.mood_rating,
      timestamp: check.timestamp,
      notes: check.notes || ''
    }));

  // Calculate risk score based on recent patterns
  const recentCheckIns = checkIns
    .filter(check => {
      const daysDiff = (Date.now() - check.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    })
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const riskScore = calculateRiskScore(recentCheckIns, crisisPrecursors);

  // Identify vulnerable hours
  const vulnerableHours = identifyVulnerableHours(resolutions);

  return {
    interventionStats,
    crisisPrecursors,
    riskScore,
    vulnerableHours
  };
};

export const calculateRiskScore = (
  recentCheckIns: CheckInResponse[],
  crisisPrecursors: Array<{ mood: number; timestamp: Date; notes: string }>
): number => {
  if (recentCheckIns.length === 0) return 0;

  const recentMoods = recentCheckIns.slice(0, 5).map(c => c.mood_rating);
  const averageMood = recentMoods.reduce((sum, mood) => sum + mood, 0) / recentMoods.length;
  
  // Trend analysis
  const moodTrend = recentMoods.length > 1 
    ? recentMoods[0] - recentMoods[recentMoods.length - 1] 
    : 0;

  // Low mood risk (40% weight)
  const moodRisk = Math.max(0, (5 - averageMood) / 5) * 0.4;
  
  // Declining trend risk (30% weight)
  const trendRisk = Math.max(0, -moodTrend / 10) * 0.3;
  
  // Historical crisis frequency risk (30% weight)
  const recentCrises = crisisPrecursors.filter(c => {
    const daysDiff = (Date.now() - c.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 30;
  });
  const crisisFrequencyRisk = Math.min(1, recentCrises.length / 5) * 0.3;

  return Math.min(1, moodRisk + trendRisk + crisisFrequencyRisk);
};

export const identifyVulnerableHours = (resolutions: CrisisResolution[]): Array<{ hour: number; probability: number }> => {
  const hourCounts = new Array(24).fill(0);
  
  resolutions.forEach(resolution => {
    const hour = new Date(resolution.crisis_start_time).getHours();
    hourCounts[hour]++;
  });

  const totalCrises = resolutions.length;
  
  return hourCounts
    .map((count, hour) => ({
      hour,
      probability: totalCrises > 0 ? count / totalCrises : 0
    }))
    .filter(({ probability }) => probability > 0.1) // Only include hours with >10% of crises
    .sort((a, b) => b.probability - a.probability);
};
