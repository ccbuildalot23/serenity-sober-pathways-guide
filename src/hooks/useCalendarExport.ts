
import { useState } from 'react';
import { MoodEntry } from '@/types/calendar';
import { exportToJSON, exportToCSV } from '@/utils/calendarExport';
import { formatDate } from '@/components/calendar/utils/calendarHelpers';

export function useCalendarExport() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (
    filteredEntries: MoodEntry[], 
    selectedMonth: Date, 
    format: 'csv' | 'json' = 'csv'
  ) => {
    setIsExporting(true);
    try {
      const monthName = formatDate(selectedMonth, 'yyyy-MM');
      
      if (format === 'json') {
        await exportToJSON(filteredEntries, monthName);
      } else {
        await exportToCSV(filteredEntries, monthName);
      }
      
      return { success: true, message: `Calendar data exported as ${format.toUpperCase()}` };
    } catch (error) {
      console.error('Export failed:', error);
      return { success: false, message: 'Failed to export calendar data' };
    } finally {
      setIsExporting(false);
    }
  };

  return {
    handleExport,
    isExporting,
  };
}
