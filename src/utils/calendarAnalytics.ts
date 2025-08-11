
import { MoodEntry } from '@/types/calendar';

export function calculateMonthlyTrends(entries: MoodEntry[] = []) {
  // Group by week
  const weeklyData: Record<string, { mood: number[]; energy: number[] }> = {};
  
  const safe = Array.isArray(entries) ? entries : [];
  safe.forEach(entry => {
    const weekNumber = getWeekNumber(entry.date);
    if (!weeklyData[weekNumber]) {
      weeklyData[weekNumber] = { mood: [], energy: [] };
    }
    weeklyData[weekNumber].mood.push(entry.mood_rating ?? 0);
    weeklyData[weekNumber].energy.push(entry.energy_rating ?? 0);
  });

  // Calculate weekly averages
  const trends = Object.entries(weeklyData).map(([week, data]) => ({
    week: `Week ${week}`,
    avgMood: data.mood.length ? data.mood.reduce((a, b) => a + b, 0) / data.mood.length : 0,
    avgEnergy: data.energy.length ? data.energy.reduce((a, b) => a + b, 0) / data.energy.length : 0,
    entryCount: data.mood.length,
  }));

  return trends;
}

function getWeekNumber(date: Date): string {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfMonth = date.getDate();
  const weekNumber = Math.ceil((dayOfMonth + firstDayOfMonth.getDay()) / 7);
  return weekNumber.toString();
}

export function calculateTriggerCounts(entries: MoodEntry[] = []): Record<string, number> {
  const safe = Array.isArray(entries) ? entries : [];
  const allTriggers = safe.flatMap(e => e.triggers || []);
  return allTriggers.reduce((acc, trigger) => {
    acc[trigger] = (acc[trigger] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

export function getTopTriggers(triggerCounts: Record<string, number>, count: number = 3): Array<{name: string, count: number}> {
  return Object.entries(triggerCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, count)
    .map(([name, count]) => ({ name, count }));
}

// Add missing functions that were being imported
export function analyzeCalendarPatterns(entries: MoodEntry[] = []) {
  const safe = Array.isArray(entries) ? entries : [];
  const patterns = {
    averageMood: safe.length ? safe.reduce((sum, entry) => sum + (entry.mood_rating ?? 0), 0) / safe.length : 0,
    totalEntries: safe.length,
    triggerCounts: calculateTriggerCounts(safe),
    monthlyTrends: calculateMonthlyTrends(safe)
  };
  
  return patterns;
}

export function generateInsights(entries: MoodEntry[] = []) {
  const insights: string[] = [];
  const safe = Array.isArray(entries) ? entries : [];
  const avgMood = safe.length ? safe.reduce((sum, entry) => sum + (entry.mood_rating ?? 0), 0) / safe.length : 0;
  
  if (avgMood > 7) {
    insights.push("Your mood has been consistently positive this month!");
  } else if (avgMood < 4) {
    insights.push("Consider reaching out for support if you're struggling.");
  }
  
  const triggerCounts = calculateTriggerCounts(safe);
  const topTrigger = Object.entries(triggerCounts).sort(([,a], [,b]) => b - a)[0];
  
  if (topTrigger) {
    insights.push(`Your most common trigger is: ${topTrigger[0]}`);
  }
  
  return insights;
}

export function calculateStreaks(entries: MoodEntry[] = []) {
  const safe = Array.isArray(entries) ? entries : [];
  if (safe.length === 0) return { current: 0, longest: 0 };
  
  // Sort entries by date
  const sortedEntries = [...safe].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  let currentStreak = 1;
  let longestStreak = 1;
  let tempStreak = 1;
  
  for (let i = 1; i < sortedEntries.length; i++) {
    const currentDate = new Date(sortedEntries[i].date);
    const prevDate = new Date(sortedEntries[i - 1].date);
    const dayDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (dayDiff === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  
  longestStreak = Math.max(longestStreak, tempStreak);
  
  // Calculate current streak from most recent entries
  const today = new Date();
  const mostRecent = new Date(sortedEntries[sortedEntries.length - 1].date);
  const daysSinceLastEntry = Math.floor((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceLastEntry <= 1) {
    currentStreak = tempStreak;
  } else {
    currentStreak = 0;
  }
  
  return { current: currentStreak, longest: longestStreak };
}

export function identifyTrends(entries: MoodEntry[] = []) {
  const safe = Array.isArray(entries) ? entries : [];
  if (safe.length < 7) return { trend: 'insufficient_data', change: 0 };
  
  // Sort by date
  const sorted = [...safe].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Compare first half vs second half
  const midpoint = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, midpoint);
  const secondHalf = sorted.slice(midpoint);
  
  const firstAvg = firstHalf.reduce((sum, entry) => sum + entry.mood_rating, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, entry) => sum + entry.mood_rating, 0) / secondHalf.length;
  
  const change = secondAvg - firstAvg;
  
  let trend: 'improving' | 'declining' | 'stable' = 'stable';
  if (change > 0.5) trend = 'improving';
  else if (change < -0.5) trend = 'declining';
  
  return { trend, change: Math.round(change * 100) / 100 };
}
