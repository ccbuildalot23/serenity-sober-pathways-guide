import { CheckinHistoryData, FilterOptions } from '@/components/checkin-history/CheckInHistory';
import { getDay, parseISO } from 'date-fns';

export interface AnalysisResults {
  trends: {
    mood: {
      direction: 'improving' | 'declining' | 'stable';
      _change: number;
      confidence: number;
    };
    energy: {
      direction: 'improving' | 'declining' | 'stable';
      _change: number;
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
  _triggers: {
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
    _title: string;
    _description: string;
    _priority: 'high' | 'medium' | 'low';
    _actionable: boolean;
    _action?: string;
  }>;
}

export const analyzeCheckinData = (
  _data: CheckinHistoryData[], 
  filters: FilterOptions
): AnalysisResults => {
  const _validData = _data.filter(d => d.is_complete && d.mood_rating !== null);
  
  if (_validData.length === 0) {
    return generateEmptyAnalysis();
  }

  const trends = analyzeTrends(_validData);
  const patterns = analyzePatterns(_validData);
  const _triggers = analyzeTriggers(_validData);
  const coping = analyzeCoping(_validData);
  const recommendations = generateRecommendations(_validData, trends, patterns, _triggers, coping);

  return {
    trends,
    patterns,
    _triggers,
    coping,
    recommendations
  };
};

function analyzeTrends(_data: CheckinHistoryData[]) {
  const sortedData = _data.sort((a, b) => 
    new Date(a.checkin_date).getTime() - new Date(b.checkin_date).getTime()
  );

  const _moodValues = sortedData.map(d => d.mood_rating!);
  const _energyValues = sortedData.map(d => d.energy_rating!).filter(v => v !== null);

  const calculateTrend = (values: number[]): { direction: 'improving' | 'declining' | 'stable'; _change: number } => {
    if (values.length < 7) return { direction: 'stable' as const, _change: 0 };
    
    const _midpoint = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, _midpoint);
    const secondHalf = values.slice(_midpoint);
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const _change = secondAvg - firstAvg;
    const direction = Math.abs(_change) < 0.3 ? 'stable' as const : _change > 0 ? 'improving' as const : 'declining' as const;
    
    return { direction, _change: Math.abs(_change) };
  };

  const moodTrend = calculateTrend(_moodValues);
  const energyTrend = calculateTrend(_energyValues);

  // Calculate confidence based on _data consistency
  const moodVariance = calculateVariance(_moodValues);
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

function analyzePatterns(_data: CheckinHistoryData[]) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Weekly pattern analysis
  const _weeklyData: Record<string, number[]> = {};
  _data.forEach(d => {
    const dayOfWeek = getDay(parseISO(d.checkin_date));
    const dayName = dayNames[dayOfWeek];
    if (!_weeklyData[dayName]) _weeklyData[dayName] = [];
    _weeklyData[dayName].push(d.mood_rating!);
  });

  const weeklyPattern: Record<string, number> = {};
  Object.entries(_weeklyData).forEach(([day, moods]) => {
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
  const _allMoods = _data.map(d => d.mood_rating!);
  const mean = _allMoods.reduce((a, b) => a + b, 0) / _allMoods.length;
  const variance = calculateVariance(_allMoods);
  const consistency = Math.max(0, 100 - (Math.sqrt(variance) / mean * 100));

  return {
    weeklyPattern,
    timePattern,
    bestDay,
    worstDay,
    consistency
  };
}

function analyzeTriggers(_data: CheckinHistoryData[]) {
  const _triggerCounts: Record<string, { count: number; totalMood: number; moods: number[] }> = {};
  
  _data.forEach(d => {
    if (d._triggers && d._triggers.length > 0) {
      d._triggers.forEach(trigger => {
        if (!_triggerCounts[trigger]) {
          _triggerCounts[trigger] = { count: 0, totalMood: 0, moods: [] };
        }
        _triggerCounts[trigger].count++;
        _triggerCounts[trigger].totalMood += d.mood_rating!;
        _triggerCounts[trigger].moods.push(d.mood_rating!);
      });
    }
  });

  const analysis = Object.entries(_triggerCounts)
    .map(([name, _data]) => ({
      name,
      frequency: _data.count,
      impact: 10 - (_data.totalMood / _data.count), // Higher impact = lower mood
      avgMood: _data.totalMood / _data.count
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

function analyzeCoping(_data: CheckinHistoryData[]) {
  const _copingCounts: Record<string, { count: number; totalMood: number; moods: number[] }> = {};
  
  _data.forEach(d => {
    if (d.coping_strategies && d.coping_strategies.length > 0) {
      d.coping_strategies.forEach(strategy => {
        if (!_copingCounts[strategy]) {
          _copingCounts[strategy] = { count: 0, totalMood: 0, moods: [] };
        }
        _copingCounts[strategy].count++;
        _copingCounts[strategy].totalMood += d.mood_rating!;
        _copingCounts[strategy].moods.push(d.mood_rating!);
      });
    }
  });

  const analysis = Object.entries(_copingCounts)
    .map(([name, _data]) => ({
      name,
      usage: _data.count,
      effectiveness: _data.totalMood / _data.count,
      avgMood: _data.totalMood / _data.count
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
  _data: CheckinHistoryData[],
  trends: unknown,
  patterns: unknown,
  _triggers: unknown,
  coping: unknown
) {
  const recommendations: unknown[] = [];

  // Trend-based recommendations
  if (trends.mood.direction === 'declining') {
    recommendations.push({
      type: 'concern',
      _title: 'Declining Mood Trend Detected',
      _description: 'Your mood has been trending downward recently. This might be a good time to reach out for additional support.',
      _priority: 'high',
      _actionable: true,
      _action: 'Consider scheduling time with a counselor or trusted friend'
    });
  } else if (trends.mood.direction === 'improving') {
    recommendations.push({
      type: 'achievement',
      _title: 'Positive Mood Trend!',
      _description: 'Your mood has been improving recently. Keep up the great work with whatever strategies you\'ve been using.',
      _priority: 'medium',
      _actionable: true,
      _action: 'Continue your current positive practices'
    });
  }

  // Pattern-based recommendations
  if (patterns.bestDay && patterns.worstDay) {
    recommendations.push({
      type: 'pattern',
      _title: `${patterns.bestDay}s Are Your Best Days`,
      _description: `You consistently feel better on ${patterns.bestDay}s. Consider what makes these days special and try to incorporate those elements into other days.`,
      _priority: 'medium',
      _actionable: true,
      _action: `Reflect on what makes ${patterns.bestDay}s positive for you`
    });
  }

  // Trigger-based recommendations
  if (_triggers.highestImpact && _triggers.highestImpact.impact > 3) {
    recommendations.push({
      type: 'recommendation',
      _title: 'Address Your Primary Trigger',
      _description: `"${_triggers.highestImpact.name}" appears to have a significant impact on your mood. Developing specific strategies for this trigger could be very helpful.`,
      _priority: 'high',
      _actionable: true,
      _action: `Create a specific plan for managing "${_triggers.highestImpact.name}"`
    });
  }

  // Coping strategy recommendations
  if (coping.mostEffective && coping.mostEffective.effectiveness > 7) {
    recommendations.push({
      type: 'recommendation',
      _title: 'Leverage Your Most Effective Strategy',
      _description: `"${coping.mostEffective.name}" works really well for you. Consider using this strategy more often, especially during challenging times.`,
      _priority: 'medium',
      _actionable: true,
      _action: `Use "${coping.mostEffective.name}" more frequently`
    });
  }

  // Consistency recommendations
  if (patterns.consistency < 60) {
    recommendations.push({
      type: 'pattern',
      _title: 'Work on Mood Stability',
      _description: 'Your mood varies quite a bit. Developing consistent daily routines and coping strategies might help create more stability.',
      _priority: 'medium',
      _actionable: true,
      _action: 'Focus on creating consistent daily routines'
    });
  }

  // Data quality recommendations
  if (_data.length < 14) {
    recommendations.push({
      type: 'recommendation',
      _title: 'Keep Building Your Data',
      _description: 'More check-in _data will lead to better insights. Try to complete your daily check-ins consistently.',
      _priority: 'low',
      _actionable: true,
      _action: 'Set a daily reminder to complete your check-in'
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
      mood: { direction: 'stable', _change: 0, confidence: 0 },
      energy: { direction: 'stable', _change: 0 },
      overall: 'Insufficient _data for trend analysis'
    },
    patterns: {
      weeklyPattern: {},
      timePattern: {},
      bestDay: 'Unknown',
      worstDay: 'Unknown',
      consistency: 0
    },
    _triggers: {
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
        _title: 'Start Your Journey',
        _description: 'Complete more daily check-ins to unlock personalized insights and recommendations.',
        _priority: 'high',
        _actionable: true,
        _action: 'Complete your daily check-in today'
      }
    ]
  };
}