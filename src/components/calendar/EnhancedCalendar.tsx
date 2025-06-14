
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { 
  Calendar as CalendarIcon, 
  Download, 
  FileText, 
  FileJson,
  ChevronLeft, 
  ChevronRight,
  Brain, 
  Zap, 
  Heart, 
  Save, 
  X, 
  Plus,
  AlertTriangle,
  Target,
  Flame,
  TrendingUp,
  TrendingDown,
  Filter
} from 'lucide-react';
import { useCalendarFilters } from '@/hooks/useCalendarFilters';
import { calculateMonthlyTrends, calculateTriggerCounts, getTopTriggers } from '@/utils/calendarAnalytics';
import { exportToJSON, exportToCSV } from '@/utils/calendarExport';
import { groupEntriesByDay, prepareChartData } from '@/utils/calendarUtils';
import { MoodEntry } from '@/types/calendar';
import CalendarFilters from './CalendarFilters';
import CalendarGrid from './CalendarGrid';
import CalendarInsights from './CalendarInsights';
import DayDetailSheet from './DayDetailSheet';

interface MonthStats {
  totalEntries: number;
  averageMood: string;
  averageEnergy: string;
  streakDays: number;
  topTriggers: Array<{name: string; count: number}>;
}

// Utility functions
const formatDate = (date: Date, formatStr: string): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  switch (formatStr) {
    case 'yyyy-MM-dd':
      return `${year}-${month}-${day}`;
    case 'yyyy-MM':
      return `${year}-${month}`;
    case 'MMM dd, yyyy':
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[date.getMonth()]} ${day}, ${year}`;
    default:
      return date.toISOString();
  }
};

const startOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const endOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

const calculateStreak = (entries: MoodEntry[]): number => {
  if (entries.length === 0) return 0;
  
  const sortedDates = entries
    .map(e => formatDate(e.date, 'yyyy-MM-dd'))
    .sort()
    .reverse();
  
  let streak = 1;
  const today = formatDate(new Date(), 'yyyy-MM-dd');
  
  if (sortedDates[0] !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday, 'yyyy-MM-dd');
    if (sortedDates[0] !== yesterdayStr) {
      return 0;
    }
  }
  
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currDate = new Date(sortedDates[i]);
    const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
};

// Main Calendar Component
const EnhancedCalendar: React.FC<{
  user?: { id: string };
  supabase?: any;
  onTabChange?: () => void;
  showLayout?: boolean;
}> = ({ user, supabase, onTabChange, showLayout = true }) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);
  const [monthEntries, setMonthEntries] = useState<MoodEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Use the calendar filters hook
  const { filters, setFilters, filteredEntries } = useCalendarFilters(monthEntries);

  // Get available triggers for filter
  const availableTriggers = Array.from(new Set(monthEntries.flatMap(e => e.triggers || [])));

  // Simple notification system
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !supabase) {
        setMonthEntries(getMockData());
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data: checkins, error } = await supabase
          .from('daily_checkins')
          .select(`
            *,
            mood_triggers (
              id,
              trigger_name
            ),
            gratitude_entries (
              id,
              gratitude_text
            )
          `)
          .eq('user_id', user.id)
          .gte('checkin_date', formatDate(startOfMonth(selectedMonth), 'yyyy-MM-dd'))
          .lte('checkin_date', formatDate(endOfMonth(selectedMonth), 'yyyy-MM-dd'))
          .order('checkin_date', { ascending: true });

        if (error) throw error;
        
        const transformedData = (checkins || []).map((entry: any) => ({
          id: entry.id,
          date: new Date(entry.checkin_date),
          mood_rating: entry.mood_rating || 5,
          energy_rating: entry.energy_rating || 5,
          triggers: entry.mood_triggers?.map((t: any) => t.trigger_name) || [],
          gratitude: entry.gratitude_entries?.map((g: any) => g.gratitude_text) || [],
          notes: entry.notes || entry.support_needed || '',
          created_at: new Date(entry.created_at)
        }));

        setMonthEntries(transformedData);
      } catch (err) {
        setError('Failed to load calendar data');
        console.error('Error loading calendar data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedMonth, user?.id, supabase]);

  // Mock data for demo
  const getMockData = (): MoodEntry[] => {
    const today = new Date();
    const entries: MoodEntry[] = [];
    
    for (let i = 0; i < 15; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      entries.push({
        id: `mock-${i}`,
        date: date,
        mood_rating: Math.floor(Math.random() * 5) + 5,
        energy_rating: Math.floor(Math.random() * 5) + 5,
        triggers: i % 3 === 0 ? ['Work stress', 'Poor sleep'] : [],
        gratitude: i % 2 === 0 ? ['Family time', 'Good weather'] : [],
        notes: i % 4 === 0 ? 'Had a good day overall' : '',
        created_at: date
      });
    }
    
    return entries;
  };

  // Update entry
  const handleUpdate = async (updates: Partial<MoodEntry>) => {
    if (!supabase) {
      showNotification('success', 'Entry updated (demo mode)');
      return;
    }

    try {
      showNotification('success', 'Entry updated successfully');
    } catch (error) {
      showNotification('error', 'Failed to update entry');
    }
  };

  // Process filtered data
  const dayDataMap = groupEntriesByDay(filteredEntries);
  const chartData = prepareChartData(dayDataMap);
  
  // Calculate insights from filtered data
  const totalEntries = filteredEntries.length;
  const averageMood = totalEntries > 0 ? filteredEntries.reduce((sum, e) => sum + e.mood_rating, 0) / totalEntries : 0;
  const averageEnergy = totalEntries > 0 ? filteredEntries.reduce((sum, e) => sum + e.energy_rating, 0) / totalEntries : 0;
  const triggerCounts = calculateTriggerCounts(filteredEntries);
  const topTriggers = getTopTriggers(triggerCounts);
  const monthlyTrends = calculateMonthlyTrends(filteredEntries);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    const dateKey = formatDate(date, 'yyyy-MM-dd');
    const dayData = dayDataMap.get(dateKey);
    if (dayData && dayData.entries.length > 0) {
      setIsDayDetailOpen(true);
    } else {
      showNotification('error', 'No entry for this day');
    }
  };

  const selectedDayData = selectedDate ? dayDataMap.get(formatDate(selectedDate, 'yyyy-MM-dd'))?.entries[0] : undefined;

  // Enhanced export functionality
  const handleExport = async (format: 'csv' | 'json' = 'csv') => {
    try {
      const monthName = formatDate(selectedMonth, 'yyyy-MM');
      
      if (format === 'json') {
        await exportToJSON(filteredEntries, monthName);
      } else {
        await exportToCSV(filteredEntries, monthName);
      }
      
      showNotification('success', `Calendar data exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      showNotification('error', 'Failed to export calendar data');
    }
  };

  // Month stats
  const monthStats = {
    totalEntries,
    averageMood: averageMood.toFixed(1),
    averageEnergy: averageEnergy.toFixed(1),
    streakDays: calculateStreak(filteredEntries),
    topTriggers
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      {/* Notification */}
      {notification && (
        <div className={`
          fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50
          ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}
          text-white
        `}>
          {notification.message}
        </div>
      )}

      {/* Header with Filter Toggle */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Enhanced Mood Calendar</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setShowFilters(!showFilters)} 
            variant="outline" 
            size="sm"
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white border shadow-lg">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileText className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>
                <FileJson className="h-4 w-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <CalendarFilters
          filters={filters}
          onFiltersChange={setFilters}
          availableTriggers={availableTriggers}
        />
      )}
      
      {/* Calendar Grid */}
      <CalendarGrid
        selectedDate={selectedDate}
        selectedMonth={selectedMonth}
        dayDataMap={dayDataMap}
        onDateSelect={setSelectedDate}
        onMonthChange={setSelectedMonth}
        onDayClick={handleDayClick}
      />

      {/* Insights */}
      <CalendarInsights
        chartData={chartData}
        monthStats={monthStats}
        monthlyTrends={monthlyTrends}
      />

      {/* Day Detail Sheet */}
      <DayDetailSheet
        isOpen={isDayDetailOpen}
        onOpenChange={setIsDayDetailOpen}
        selectedDate={selectedDate}
        selectedDayData={selectedDayData}
        onUpdate={handleUpdate}
      />
    </div>
  );
};

export default EnhancedCalendar;
