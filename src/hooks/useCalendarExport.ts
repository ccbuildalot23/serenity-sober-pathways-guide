
import { useState } from 'react';
import { MoodEntry } from '@/types/calendar';
import { exportToJSON, exportToCSV } from '@/utils/calendarExport';
import { formatDate } from '@/components/calendar/utils/calendarHelpers';

export function useCalendarExport() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (
    _filteredEntries: MoodEntry[], 
    _selectedMonth: Date, 
    format: 'csv' | 'json' = 'csv'
  ) => {
    setIsExporting(true);
    try {
      const _monthName = formatDate(_selectedMonth, 'yyyy-MM');
      
      if (format === 'json') {
        await exportToJSON(_filteredEntries, _monthName);
      } else {
        await exportToCSV(_filteredEntries, _monthName);
      }
      
      return { success: true, message: `Calendar data exported as ${format.toUpperCase()}` };
    } catch (_error) {
      console._error('Export failed:', _error);
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
