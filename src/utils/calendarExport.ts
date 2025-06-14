
import { MoodEntry } from '@/types/calendar';

export async function exportToJSON(entries: MoodEntry[], monthName: string) {
  const { calculateTriggerCounts, getTopTriggers } = await import('./calendarAnalytics');
  
  const exportData = {
    exportDate: new Date().toISOString(),
    month: monthName,
    totalEntries: entries.length,
    entries: entries.map(entry => ({
      date: entry.date.toISOString(),
      mood: entry.mood_rating,
      energy: entry.energy_rating || 0,
      triggers: entry.triggers || [],
      gratitude: entry.gratitude || [],
      notes: entry.notes || '',
    })),
    summary: {
      averageMood: entries.length > 0 ? entries.reduce((sum, e) => sum + e.mood_rating, 0) / entries.length : 0,
      averageEnergy: entries.length > 0 ? entries.reduce((sum, e) => sum + (e.energy_rating || 0), 0) / entries.length : 0,
      commonTriggers: getTopTriggers(calculateTriggerCounts(entries), 3),
    },
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mood-calendar-${monthName}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportToCSV(entries: MoodEntry[], monthName: string) {
  const csvHeaders = ['Date', 'Mood Rating', 'Energy Rating', 'Triggers', 'Gratitude', 'Notes'];
  const csvRows = entries.map(entry => [
    entry.date.toISOString().split('T')[0],
    entry.mood_rating,
    entry.energy_rating || 0,
    (entry.triggers || []).join('; '),
    (entry.gratitude || []).join('; '),
    (entry.notes || '').replace(/"/g, '""')
  ]);

  const csvContent = [
    csvHeaders.join(','),
    ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mood-calendar-${monthName}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
