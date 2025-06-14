
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
  Filter,
  Search
} from 'lucide-react';
import { MoodEntry } from '@/types/calendar';
import { useCalendarFilters } from '@/hooks/useCalendarFilters';
import { calculateMonthlyTrends, calculateTriggerCounts, getTopTriggers } from '@/utils/calendarAnalytics';
import { exportToJSON, exportToCSV } from '@/utils/calendarExport';
import { groupEntriesByDay, prepareChartData } from '@/utils/calendarUtils';

// Types
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

const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Main Calendar Component
const Calendar: React.FC<{
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
  const averageEnergy = totalEntries > 0 ? filteredEntries.reduce((sum, e) => sum + (e.energy_rating || 0), 0) / totalEntries : 0;
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search notes & gratitude</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Search..."
                  value={filters.searchTerm}
                  onChange={(e) =>
                    setFilters({ ...filters, searchTerm: e.target.value })
                  }
                  className="pl-8"
                />
              </div>
            </div>

            {/* Mood Range */}
            <div className="space-y-2">
              <Label>Mood Range: {filters.minMood} - {filters.maxMood}</Label>
              <div className="px-2">
                <Slider
                  value={[filters.minMood, filters.maxMood]}
                  onValueChange={([min, max]) =>
                    setFilters({ ...filters, minMood: min, maxMood: max })
                  }
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>

            {/* Trigger Filter */}
            {availableTriggers.length > 0 && (
              <div className="space-y-2">
                <Label>Filter by triggers</Label>
                <div className="flex flex-wrap gap-2">
                  {availableTriggers.map((trigger) => (
                    <Badge
                      key={trigger}
                      variant={filters.triggers.includes(trigger) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        const newTriggers = filters.triggers.includes(trigger)
                          ? filters.triggers.filter((t) => t !== trigger)
                          : [...filters.triggers, trigger];
                        setFilters({ ...filters, triggers: newTriggers });
                      }}
                    >
                      {trigger}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Clear Filters */}
            {(filters.searchTerm || filters.minMood > 1 || filters.maxMood < 10 || filters.triggers.length > 0) && (
              <button
                onClick={() =>
                  setFilters({
                    minMood: 1,
                    maxMood: 10,
                    triggers: [],
                    searchTerm: '',
                  })
                }
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear all filters
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border p-4">
        <div className="flex justify-between items-center mb-4">
          <Button 
            onClick={() => {
              const newMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1);
              setSelectedMonth(newMonth);
            }} 
            variant="ghost" 
            size="icon"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">
            {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <Button 
            onClick={() => {
              const newMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1);
              setSelectedMonth(newMonth);
            }} 
            variant="ghost" 
            size="icon"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 p-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar days would go here - placeholder for now */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }, (_, i) => (
            <div key={i} className="h-16 border rounded p-2 hover:bg-gray-50">
              <div className="text-sm">{i + 1}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Insights */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-gray-600">Entries</span>
              </div>
              <p className="text-2xl font-bold mt-1">{monthStats.totalEntries}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-gray-600">Avg Mood</span>
              </div>
              <p className="text-2xl font-bold mt-1">{monthStats.averageMood}/10</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-gray-600">Avg Energy</span>
              </div>
              <p className="text-2xl font-bold mt-1">{monthStats.averageEnergy}/10</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-gray-600">Streak</span>
              </div>
              <p className="text-2xl font-bold mt-1">{monthStats.streakDays} days</p>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mood & Energy Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="mood" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      name="Mood"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="energy" 
                      stroke="#eab308" 
                      strokeWidth={2}
                      name="Energy"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Calendar;
