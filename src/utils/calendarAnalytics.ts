
interface MoodEntry {
  id: string;
  date: Date;
  mood_rating: number;
  energy_rating: number;
  triggers: string[];
  gratitude: string[];
  notes: string;
  created_at: Date;
}

export function calculateMonthlyTrends(entries: MoodEntry[]) {
  // Group by week
  const weeklyData: Record<string, { mood: number[]; energy: number[] }> = {};
  
  entries.forEach(entry => {
    const weekNumber = getWeekNumber(entry.date);
    if (!weeklyData[weekNumber]) {
      weeklyData[weekNumber] = { mood: [], energy: [] };
    }
    weeklyData[weekNumber].mood.push(entry.mood_rating);
    weeklyData[weekNumber].energy.push(entry.energy_rating);
  });

  // Calculate weekly averages
  const trends = Object.entries(weeklyData).map(([week, data]) => ({
    week: `Week ${week}`,
    avgMood: data.mood.reduce((a, b) => a + b, 0) / data.mood.length,
    avgEnergy: data.energy.reduce((a, b) => a + b, 0) / data.energy.length,
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

export function calculateTriggerCounts(entries: MoodEntry[]): Record<string, number> {
  const allTriggers = entries.flatMap(e => e.triggers || []);
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
