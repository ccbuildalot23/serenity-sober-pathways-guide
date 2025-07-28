import { CheckinHistoryData, FilterOptions } from '@/components/checkin-history/CheckInHistory';
import { format, getDay, parseISO } from 'date-fns';

export interface AnalysisResults {
  trends: {
    mood: {
      direction: 'improving' | 'declining' | 'stable';
      change: number;
      confidence: number;
    };
    energy: {
      direction: 'improving' | 'declining' | 'stable';
      change: number;
    };
    overall: string;
  };
  patterns: {
    weeklyPattern: Record<string, number>;
    timePattern: Record<string, { avgMood: number; count: number }>;
    bestDay: string;
    worstDay: string;
    consistency: number;
  };
  triggers: {
    mostCommon: { name: string; frequency: number };
    highestImpact: { name: string; impact: number };
    analysis: Array<{
      name: string;
      frequency: number;
      impact: number;
      avgMood: number;
    }>;
  };
  coping: {
    mostEffective: { name: string; effectiveness: number };
    mostUsed: { name: string; usage: number };
    analysis: Array<{
      name: string;
      usage: number;
      effectiveness: number;
      avgMood: number;
    }>;
  };
  recommendations: Array<{
    type: 'trend' | 'pattern' | 'recommendation' | 'concern' | 'achievement';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    actionable: boolean;
    action?: string;
  }>;
}

export const analyzeCheckinData = (
  data: CheckinHistoryData[], 
  filters: FilterOptions
): AnalysisResults => {
  const validData = data.filter(d => d.is_complete && d.mood_rating !== null);
  
  if (validData.length === 0) {
    return generateEmptyAnalysis();
  }

  const trends = analyzeTrends(validData);
  const patterns = analyzePatterns(validData);
  const triggers = analyzeTriggers(validData);
  const coping = analyzeCoping(validData);
  const recommendations = generateRecommendations(validData, trends, patterns, triggers, coping);

  return {
    trends,
    patterns,
    triggers,
    coping,
    recommendations
  };
};

function analyzeTrends(data: CheckinHistoryData[]) {
  const sortedData = data.sort((a, b) => 
    new Date(a.checkin_date).getTime() - new Date(b.checkin_date).getTime()
  );

  const moodValues = sortedData.map(d => d.mood_rating!);
  const energyValues = sortedData.map(d => d.energy_rating!).filter(v => v !== null);

  const calculateTrend = (values: number[]): { direction: 'improving' | 'declining' | 'stable'; change: number } => {
    if (values.length < 7) return { direction: 'stable' as const, change: 0 };
    
    const midpoint = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, midpoint);
    const secondHalf = values.slice(midpoint);
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const change = secondAvg - firstAvg;
    const direction = Math.abs(change) < 0.3 ? 'stable' as const : change > 0 ? 'improving' as const : 'declining' as const;
    
    return { direction, change: Math.abs(change) };
  };

  const moodTrend = calculateTrend(moodValues);
  const energyTrend = calculateTrend(energyValues);

  // Calculate confidence based on data consistency
  const moodVariance = calculateVariance(moodValues);
  const confidence = Math.max(0, Math.min(100, 100 - (moodVariance * 10)));

  let overall = 'Your mood appears stable';
  if (moodTrend.direction === 'improving') {
    overall = 'Your mood is trending upward - great progress!';
  } else if (moodTrend.direction === 'declining') {
    overall = 'Your mood has been declining recently - consider reaching out for support';
  }

  return {
    mood: { ...moodTrend, confidence },
    energy: energyTrend,
    overall
  };
}

function analyzePatterns(data: CheckinHistoryData[]) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Weekly pattern analysis
  const weeklyData: Record<string, number[]> = {};
  data.forEach(d => {
    const dayOfWeek = getDay(parseISO(d.checkin_date));
    const dayName = dayNames[dayOfWeek];
    if (!weeklyData[dayName]) weeklyData[dayName] = [];
    weeklyData[dayName].push(d.mood_rating!);
  });

  const weeklyPattern: Record<string, number> = {};
  Object.entries(weeklyData).forEach(([day, moods]) => {
    weeklyPattern[day] = moods.reduce((a, b) => a + b, 0) / moods.length;
  });

  // Find best and worst days
  const sortedDays = Object.entries(weeklyPattern)
    .sort(([, a], [, b]) => b - a);
  
  const bestDay = sortedDays[0]?.[0] || 'Unknown';
  const worstDay = sortedDays[sortedDays.length - 1]?.[0] || 'Unknown';

  // Time pattern analysis (simplified - could be expanded)
  const timePattern = {
    'Morning': { avgMood: 0, count: 0 },
    'Afternoon': { avgMood: 0, count: 0 },
    'Evening': { avgMood: 0, count: 0 }
  };

  // Calculate consistency (coefficient of variation)
  const allMoods = data.map(d => d.mood_rating!);
  const mean = allMoods.reduce((a, b) => a + b, 0) / allMoods.length;
  const variance = calculateVariance(allMoods);
  const consistency = Math.max(0, 100 - (Math.sqrt(variance) / mean * 100));

  return {
    weeklyPattern,
    timePattern,
    bestDay,
    worstDay,
    consistency
  };
}

function analyzeTriggers(data: CheckinHistoryData[]) {
  const triggerCounts: Record<string, { count: number; totalMood: number; moods: number[] }> = {};
  
  data.forEach(d => {
    if (d.triggers && d.triggers.length > 0) {
      d.triggers.forEach(trigger => {
        if (!triggerCounts[trigger]) {
          triggerCounts[trigger] = { count: 0, totalMood: 0, moods: [] };
        }
        triggerCounts[trigger].count++;
        triggerCounts[trigger].totalMood += d.mood_rating!;
        triggerCounts[trigger].moods.push(d.mood_rating!);
      });
    }
  });

  const analysis = Object.entries(triggerCounts)
    .map(([name, data]) => ({
      name,
      frequency: data.count,
      impact: 10 - (data.totalMood / data.count), // Higher impact = lower mood
      avgMood: data.totalMood / data.count
    }))
    .sort((a, b) => b.frequency - a.frequency);

  const mostCommon = analysis[0] || { name: 'None identified', frequency: 0 };
  const highestImpact = analysis.sort((a, b) => b.impact - a.impact)[0] || { name: 'None identified', impact: 0 };

  return {
    mostCommon,
    highestImpact,
    analysis: analysis.slice(0, 10)
  };
}

function analyzeCoping(data: CheckinHistoryData[]) {
  const copingCounts: Record<string, { count: number; totalMood: number; moods: number[] }> = {};
  
  data.forEach(d => {
    if (d.coping_strategies && d.coping_strategies.length > 0) {
      d.coping_strategies.forEach(strategy => {
        if (!copingCounts[strategy]) {
          copingCounts[strategy] = { count: 0, totalMood: 0, moods: [] };
        }
        copingCounts[strategy].count++;
        copingCounts[strategy].totalMood += d.mood_rating!;
        copingCounts[strategy].moods.push(d.mood_rating!);
      });
    }
  });

  const analysis = Object.entries(copingCounts)
    .map(([name, data]) => ({
      name,
      usage: data.count,
      effectiveness: data.totalMood / data.count,
      avgMood: data.totalMood / data.count
    }))
    .sort((a, b) => b.effectiveness - a.effectiveness);

  const mostEffective = analysis[0] || { name: 'None identified', effectiveness: 0 };
  const mostUsed = analysis.sort((a, b) => b.usage - a.usage)[0] || { name: 'None identified', usage: 0 };

  return {
    mostEffective,
    mostUsed,
    analysis: analysis.slice(0, 10)
  };
}

function generateRecommendations(
  data: CheckinHistoryData[],
  trends: any,
  patterns: any,
  triggers: any,
  coping: any
) {
  const recommendations: any[] = [];

  // Trend-based recommendations
  if (trends.mood.direction === 'declining') {
    recommendations.push({
      type: 'concern',
      title: 'Declining Mood Trend Detected',
      description: 'Your mood has been trending downward recently. This might be a good time to reach out for additional support.',
      priority: 'high',
      actionable: true,
      action: 'Consider scheduling time with a counselor or trusted friend'
    });
  } else if (trends.mood.direction === 'improving') {
    recommendations.push({
      type: 'achievement',
      title: 'Positive Mood Trend!',
      description: 'Your mood has been improving recently. Keep up the great work with whatever strategies you\'ve been using.',
      priority: 'medium',
      actionable: true,
      action: 'Continue your current positive practices'
    });
  }

  // Pattern-based recommendations
  if (patterns.bestDay && patterns.worstDay) {
    recommendations.push({
      type: 'pattern',
      title: `${patterns.bestDay}s Are Your Best Days`,
      description: `You consistently feel better on ${patterns.bestDay}s. Consider what makes these days special and try to incorporate those elements into other days.`,
      priority: 'medium',
      actionable: true,
      action: `Reflect on what makes ${patterns.bestDay}s positive for you`
    });
  }

  // Trigger-based recommendations
  if (triggers.highestImpact && triggers.highestImpact.impact > 3) {
    recommendations.push({
      type: 'recommendation',
      title: 'Address Your Primary Trigger',
      description: `"${triggers.highestImpact.name}" appears to have a significant impact on your mood. Developing specific strategies for this trigger could be very helpful.`,
      priority: 'high',
      actionable: true,
      action: `Create a specific plan for managing "${triggers.highestImpact.name}"`
    });
  }

  // Coping strategy recommendations
  if (coping.mostEffective && coping.mostEffective.effectiveness > 7) {
    recommendations.push({
      type: 'recommendation',
      title: 'Leverage Your Most Effective Strategy',
      description: `"${coping.mostEffective.name}" works really well for you. Consider using this strategy more often, especially during challenging times.`,
      priority: 'medium',
      actionable: true,
      action: `Use "${coping.mostEffective.name}" more frequently`
    });
  }

  // Consistency recommendations
  if (patterns.consistency < 60) {
    recommendations.push({
      type: 'pattern',
      title: 'Work on Mood Stability',
      description: 'Your mood varies quite a bit. Developing consistent daily routines and coping strategies might help create more stability.',
      priority: 'medium',
      actionable: true,
      action: 'Focus on creating consistent daily routines'
    });
  }

  // Data quality recommendations
  if (data.length < 14) {
    recommendations.push({
      type: 'recommendation',
      title: 'Keep Building Your Data',
      description: 'More check-in data will lead to better insights. Try to complete your daily check-ins consistently.',
      priority: 'low',
      actionable: true,
      action: 'Set a daily reminder to complete your check-in'
    });
  }

  return recommendations.slice(0, 6); // Limit to 6 recommendations
}

function calculateVariance(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
}

function generateEmptyAnalysis(): AnalysisResults {
  return {
    trends: {
      mood: { direction: 'stable', change: 0, confidence: 0 },
      energy: { direction: 'stable', change: 0 },
      overall: 'Insufficient data for trend analysis'
    },
    patterns: {
      weeklyPattern: {},
      timePattern: {},
      bestDay: 'Unknown',
      worstDay: 'Unknown',
      consistency: 0
    },
    triggers: {
      mostCommon: { name: 'None identified', frequency: 0 },
      highestImpact: { name: 'None identified', impact: 0 },
      analysis: []
    },
    coping: {
      mostEffective: { name: 'None identified', effectiveness: 0 },
      mostUsed: { name: 'None identified', usage: 0 },
      analysis: []
    },
    recommendations: [
      {
        type: 'recommendation',
        title: 'Start Your Journey',
        description: 'Complete more daily check-ins to unlock personalized insights and recommendations.',
        priority: 'high',
        actionable: true,
        action: 'Complete your daily check-in today'
      }
    ]
  };
}