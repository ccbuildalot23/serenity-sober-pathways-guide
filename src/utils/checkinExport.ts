import { CheckinHistoryData, FilterOptions } from '@/components/checkin-history/CheckInHistory';
import { format, parseISO } from 'date-fns';

export const exportCheckinData = async (
  data: CheckinHistoryData[],
  filters: FilterOptions,
  format_type: 'csv' | 'json' = 'csv'
): Promise<void> => {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  if (format_type === 'csv') {
    await exportAsCSV(data, filters);
  } else {
    await exportAsJSON(data, filters);
  }
};

async function exportAsCSV(data: CheckinHistoryData[], filters: FilterOptions) {
  const headers = [
    'Date',
    'Completed',
    'Mood Rating',
    'Energy Rating', 
    'Hope Rating',
    'Sleep Quality',
    'Medication Taken',
    'PHQ-2 Score',
    'GAD-2 Score',
    'Triggers',
    'Coping Strategies',
    'Notes'
  ];

  const rows = data.map(item => [
    format(parseISO(item.checkin_date), 'yyyy-MM-dd'),
    item.is_complete ? 'Yes' : 'No',
    item.mood_rating?.toString() || '',
    item.energy_rating?.toString() || '',
    item.hope_rating?.toString() || '',
    item.sleep_quality?.toString() || '',
    item.medication_taken === null ? '' : item.medication_taken ? 'Yes' : 'No',
    item.phq2_score?.toString() || '',
    item.gad2_score?.toString() || '',
    item.triggers ? item.triggers.join('; ') : '',
    item.coping_strategies ? item.coping_strategies.join('; ') : '',
    '' // Notes - would need to be added to data structure
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(field => `"${field}"`).join(','))
  ].join('\n');

  await downloadFile(
    csvContent,
    `checkin-data-${format(filters.dateRange.start, 'yyyy-MM-dd')}-to-${format(filters.dateRange.end, 'yyyy-MM-dd')}.csv`,
    'text/csv'
  );
}

async function exportAsJSON(data: CheckinHistoryData[], filters: FilterOptions) {
  const exportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      dateRange: {
        start: filters.dateRange.start.toISOString(),
        end: filters.dateRange.end.toISOString(),
        preset: filters.dateRange.preset
      },
      assessmentTypes: filters.assessmentTypes,
      totalRecords: data.length,
      completedRecords: data.filter(d => d.is_complete).length
    },
    data: data.map(item => ({
      id: item.id,
      date: item.checkin_date,
      completed: item.is_complete,
      mood: {
        rating: item.mood_rating,
        energy: item.energy_rating,
        hope: item.hope_rating
      },
      health: {
        sleepQuality: item.sleep_quality,
        medicationTaken: item.medication_taken
      },
      assessments: {
        phq2: item.phq2_score,
        gad2: item.gad2_score
      },
      triggers: item.triggers || [],
      copingStrategies: item.coping_strategies || [],
      createdAt: item.created_at,
      assessmentDetails: item.checkin_assessments || []
    }))
  };

  const jsonContent = JSON.stringify(exportData, null, 2);
  
  await downloadFile(
    jsonContent,
    `checkin-data-${format(filters.dateRange.start, 'yyyy-MM-dd')}-to-${format(filters.dateRange.end, 'yyyy-MM-dd')}.json`,
    'application/json'
  );
}

async function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  URL.revokeObjectURL(url);
}

// Additional export utilities

export const exportSummaryReport = async (
  data: CheckinHistoryData[],
  insights: any,
  filters: FilterOptions
): Promise<void> => {
  const completedCheckins = data.filter(d => d.is_complete);
  const avgMood = completedCheckins.length > 0 
    ? completedCheckins.reduce((sum, d) => sum + (d.mood_rating || 0), 0) / completedCheckins.length 
    : 0;

  const report = `
CHECK-IN SUMMARY REPORT
Generated: ${format(new Date(), 'PPP')}
Period: ${format(filters.dateRange.start, 'PPP')} - ${format(filters.dateRange.end, 'PPP')}

OVERVIEW
========
Total Check-ins: ${data.length}
Completed Check-ins: ${completedCheckins.length}
Completion Rate: ${data.length > 0 ? Math.round((completedCheckins.length / data.length) * 100) : 0}%
Average Mood: ${avgMood.toFixed(1)}/10

TRENDS
======
Mood Trend: ${insights?.trends?.mood?.direction || 'Unknown'}
Energy Trend: ${insights?.trends?.energy?.direction || 'Unknown'}
Overall Assessment: ${insights?.trends?.overall || 'Insufficient data'}

PATTERNS
========
Best Day: ${insights?.patterns?.bestDay || 'Unknown'}
Worst Day: ${insights?.patterns?.worstDay || 'Unknown'}
Consistency Score: ${insights?.patterns?.consistency?.toFixed(1) || 'N/A'}%

TOP TRIGGERS
============
${insights?.triggers?.analysis?.slice(0, 5).map((t: any, i: number) => 
  `${i + 1}. ${t.name} (${t.frequency} times, ${t.impact.toFixed(1)} impact)`
).join('\n') || 'No triggers identified'}

EFFECTIVE COPING STRATEGIES
===========================
${insights?.coping?.analysis?.slice(0, 5).map((c: any, i: number) => 
  `${i + 1}. ${c.name} (${c.usage} uses, ${c.effectiveness.toFixed(1)}/10 effectiveness)`
).join('\n') || 'No strategies identified'}

RECOMMENDATIONS
===============
${insights?.recommendations?.map((r: any, i: number) => 
  `${i + 1}. [${r.type.toUpperCase()}] ${r.title}\n   ${r.description}${r.action ? `\n   Action: ${r.action}` : ''}`
).join('\n\n') || 'No specific recommendations at this time'}

END OF REPORT
`;

  await downloadFile(
    report,
    `checkin-summary-${format(new Date(), 'yyyy-MM-dd')}.txt`,
    'text/plain'
  );
};