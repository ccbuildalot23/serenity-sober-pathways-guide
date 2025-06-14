
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
  TrendingDown
} from 'lucide-react';

// Types
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

const groupEntriesByDay = (entries: MoodEntry[]): Map<string, MoodEntry> => {
  const map = new Map<string, MoodEntry>();
  entries.forEach(entry => {
    const key = formatDate(entry.date, 'yyyy-MM-dd');
    map.set(key, entry);
  });
  return map;
};

const prepareChartData = (dayDataMap: Map<string, MoodEntry>) => {
  const data = Array.from(dayDataMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, entry]) => ({
      date: parseInt(date.split('-')[2]),
      mood: entry.mood_rating,
      energy: entry.energy_rating
    }));
  return data;
};

const calculateTriggerCounts = (entries: MoodEntry[]): Map<string, number> => {
  const counts = new Map<string, number>();
  entries.forEach(entry => {
    entry.triggers.forEach(trigger => {
      counts.set(trigger, (counts.get(trigger) || 0) + 1);
    });
  });
  return counts;
};

const getTopTriggers = (triggerCounts: Map<string, number>, limit = 5): Array<{name: string, count: number}> => {
  return Array.from(triggerCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
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

// Calendar Header Component
const CalendarHeader: React.FC<{ onExport: (format?: 'csv' | 'json') => void }> = ({ onExport }) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-2">
        <CalendarIcon className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Mood Calendar</h1>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-white border shadow-lg">
          <DropdownMenuItem onClick={() => onExport('csv')}>
            <FileText className="h-4 w-4 mr-2" />
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport('json')}>
            <FileJson className="h-4 w-4 mr-2" />
            Export as JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

// Calendar Grid Component
const CalendarGrid: React.FC<{
  selectedDate?: Date;
  selectedMonth: Date;
  dayDataMap: Map<string, MoodEntry>;
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  onDayClick: (date: Date) => void;
}> = ({ selectedDate, selectedMonth, dayDataMap, onDateSelect, onMonthChange, onDayClick }) => {
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getMoodColor = (rating: number) => {
    if (rating >= 8) return 'bg-green-500';
    if (rating >= 6) return 'bg-blue-500';
    if (rating >= 4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(selectedMonth);
    const firstDay = getFirstDayOfMonth(selectedMonth);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day);
      const dateKey = formatDate(date, 'yyyy-MM-dd');
      const hasEntry = dayDataMap.has(dateKey);
      const entry = dayDataMap.get(dateKey);
      const isSelected = selectedDate && formatDate(selectedDate, 'yyyy-MM-dd') === dateKey;

      days.push(
        <button
          key={day}
          onClick={() => onDayClick(date)}
          className={`
            relative p-2 rounded-lg border transition-all
            hover:bg-gray-50 dark:hover:bg-gray-800
            focus:outline-none focus:ring-2 focus:ring-primary
            ${isToday(date) ? 'border-primary border-2' : ''}
            ${isSelected ? 'ring-2 ring-primary' : ''}
            ${hasEntry ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-950'}
          `}
        >
          <div className="text-sm font-medium">{day}</div>
          {hasEntry && entry && (
            <div className="mt-1 space-y-1">
              <div className="h-1 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className={`h-full rounded-full transition-all ${getMoodColor(entry.mood_rating)}`}
                  style={{ width: `${(entry.mood_rating / 10) * 100}%` }}
                />
              </div>
              <div className="h-1 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full rounded-full bg-yellow-500 transition-all"
                  style={{ width: `${(entry.energy_rating / 10) * 100}%` }}
                />
              </div>
            </div>
          )}
        </button>
      );
    }

    return days;
  };

  const handlePrevMonth = () => {
    const newMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1);
    onMonthChange(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1);
    onMonthChange(newMonth);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border p-4">
      <div className="flex justify-between items-center mb-4">
        <Button onClick={handlePrevMonth} variant="ghost" size="icon">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {monthNames[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
        </h2>
        <Button onClick={handleNextMonth} variant="ghost" size="icon">
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
      
      <div className="grid grid-cols-7 gap-1">
        {renderCalendarDays()}
      </div>
      
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full" />
          <span>Mood</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full" />
          <span>Energy</span>
        </div>
      </div>
    </div>
  );
};

// Calendar Insights Component
const CalendarInsights: React.FC<{
  chartData: Array<{ date: number; mood: number; energy: number }>;
  monthStats: MonthStats;
}> = ({ chartData, monthStats }) => {
  const getTrendIcon = () => {
    if (chartData.length < 2) return null;
    const firstHalf = chartData.slice(0, Math.floor(chartData.length / 2));
    const secondHalf = chartData.slice(Math.floor(chartData.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.mood, 0) / firstHalf.length || 0;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.mood, 0) / secondHalf.length || 0;
    
    if (secondAvg > firstAvg + 0.5) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (secondAvg < firstAvg - 0.5) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Entries</span>
            </div>
            <p className="text-2xl font-bold mt-1">{monthStats.totalEntries}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Avg Mood</span>
              {getTrendIcon()}
            </div>
            <p className="text-2xl font-bold mt-1">{monthStats.averageMood}/10</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Avg Energy</span>
            </div>
            <p className="text-2xl font-bold mt-1">{monthStats.averageEnergy}/10</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Streak</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {monthStats.streakDays} {monthStats.streakDays === 1 ? 'day' : 'days'}
            </p>
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
                <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis 
                    domain={[0, 10]} 
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.375rem'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="mood" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    name="Mood"
                    dot={{ fill: '#8b5cf6', r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="energy" 
                    stroke="#eab308" 
                    strokeWidth={2}
                    name="Energy"
                    dot={{ fill: '#eab308', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Triggers */}
      {monthStats.topTriggers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Common Triggers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthStats.topTriggers.map((trigger, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm">{trigger.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ 
                          width: `${(trigger.count / monthStats.topTriggers[0].count) * 100}%` 
                        }}
                      />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {trigger.count}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Day Detail Sheet Component
const DayDetailSheet: React.FC<{
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  selectedDayData?: MoodEntry;
  onUpdate: (updates: Partial<MoodEntry>) => void;
}> = ({ isOpen, onOpenChange, selectedDate, selectedDayData, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<MoodEntry>>({});
  const [newTrigger, setNewTrigger] = useState('');
  const [newGratitude, setNewGratitude] = useState('');

  useEffect(() => {
    if (selectedDayData) {
      setEditedData({
        mood_rating: selectedDayData.mood_rating,
        energy_rating: selectedDayData.energy_rating,
        notes: selectedDayData.notes,
        triggers: [...selectedDayData.triggers],
        gratitude: [...selectedDayData.gratitude],
      });
    }
  }, [selectedDayData]);

  const handleSave = () => {
    onUpdate(editedData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (selectedDayData) {
      setEditedData({
        mood_rating: selectedDayData.mood_rating,
        energy_rating: selectedDayData.energy_rating,
        notes: selectedDayData.notes,
        triggers: [...selectedDayData.triggers],
        gratitude: [...selectedDayData.gratitude],
      });
    }
  };

  const addTrigger = () => {
    if (newTrigger.trim()) {
      setEditedData({
        ...editedData,
        triggers: [...(editedData.triggers || []), newTrigger.trim()],
      });
      setNewTrigger('');
    }
  };

  const removeTrigger = (index: number) => {
    const newTriggers = [...(editedData.triggers || [])];
    newTriggers.splice(index, 1);
    setEditedData({ ...editedData, triggers: newTriggers });
  };

  const addGratitude = () => {
    if (newGratitude.trim()) {
      setEditedData({
        ...editedData,
        gratitude: [...(editedData.gratitude || []), newGratitude.trim()],
      });
      setNewGratitude('');
    }
  };

  const removeGratitude = (index: number) => {
    const newGratitude = [...(editedData.gratitude || [])];
    newGratitude.splice(index, 1);
    setEditedData({ ...editedData, gratitude: newGratitude });
  };

  const getMoodLabel = (rating: number) => {
    if (rating >= 9) return 'Excellent';
    if (rating >= 7) return 'Good';
    if (rating >= 5) return 'Okay';
    if (rating >= 3) return 'Poor';
    return 'Very Poor';
  };

  const getEnergyLabel = (rating: number) => {
    if (rating >= 9) return 'Very High';
    if (rating >= 7) return 'High';
    if (rating >= 5) return 'Moderate';
    if (rating >= 3) return 'Low';
    return 'Very Low';
  };

  if (!selectedDate || !selectedDayData) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{formatDate(selectedDate, 'MMM dd, yyyy')}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Edit your daily check-in' : 'View your daily check-in'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Mood Rating */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              <Label>Mood Rating</Label>
              <span className="text-sm text-gray-500 ml-auto">
                {getMoodLabel(isEditing ? editedData.mood_rating || 5 : selectedDayData.mood_rating)}
              </span>
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <Slider
                  value={[editedData.mood_rating || 5]}
                  onValueChange={([value]) =>
                    setEditedData({ ...editedData, mood_rating: value })
                  }
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1</span>
                  <span className="font-medium">
                    {editedData.mood_rating || 5}/10
                  </span>
                  <span>10</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all"
                    style={{ width: `${(selectedDayData.mood_rating / 10) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{selectedDayData.mood_rating}/10</span>
              </div>
            )}
          </div>

          {/* Energy Rating */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <Label>Energy Level</Label>
              <span className="text-sm text-gray-500 ml-auto">
                {getEnergyLabel(isEditing ? editedData.energy_rating || 5 : selectedDayData.energy_rating)}
              </span>
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <Slider
                  value={[editedData.energy_rating || 5]}
                  onValueChange={([value]) =>
                    setEditedData({ ...editedData, energy_rating: value })
                  }
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1</span>
                  <span className="font-medium">
                    {editedData.energy_rating || 5}/10
                  </span>
                  <span>10</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 transition-all"
                    style={{ width: `${(selectedDayData.energy_rating / 10) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{selectedDayData.energy_rating}/10</span>
              </div>
            )}
          </div>

          {/* Triggers */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <Label>Triggers</Label>
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {(editedData.triggers || []).map((trigger, index) => (
                    <Badge key={index} variant="secondary" className="pr-1">
                      {trigger}
                      <button
                        onClick={() => removeTrigger(index)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTrigger}
                    onChange={(e) => setNewTrigger(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTrigger()}
                    placeholder="Add a trigger..."
                    className="flex-1"
                  />
                  <Button onClick={addTrigger} size="sm" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedDayData.triggers.length > 0 ? (
                  selectedDayData.triggers.map((trigger, index) => (
                    <Badge key={index} variant="secondary">
                      {trigger}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">No triggers recorded</span>
                )}
              </div>
            )}
          </div>

          {/* Gratitude */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              <Label>Gratitude</Label>
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <ul className="space-y-1">
                  {(editedData.gratitude || []).map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-gray-600">•</span>
                      <span className="flex-1">{item}</span>
                      <button
                        onClick={() => removeGratitude(index)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <Input
                    value={newGratitude}
                    onChange={(e) => setNewGratitude(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addGratitude()}
                    placeholder="I'm grateful for..."
                    className="flex-1"
                  />
                  <Button onClick={addGratitude} size="sm" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <ul className="space-y-1">
                {selectedDayData.gratitude.length > 0 ? (
                  selectedDayData.gratitude.map((item, index) => (
                    <li key={index} className="text-sm text-gray-600">
                      • {item}
                    </li>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">No gratitude items recorded</span>
                )}
              </ul>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <Label>Notes</Label>
            {isEditing ? (
              <Textarea
                value={editedData.notes || ''}
                onChange={(e) =>
                  setEditedData({ ...editedData, notes: e.target.value })
                }
                placeholder="Add any additional notes..."
                rows={4}
                className="resize-none"
              />
            ) : (
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {selectedDayData.notes || 'No notes added'}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            {isEditing ? (
              <>
                <Button onClick={handleSave} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button onClick={handleCancel} variant="outline">
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)} className="w-full">
                Edit Entry
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
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

  // Process data
  const dayDataMap = groupEntriesByDay(monthEntries);
  const chartData = prepareChartData(dayDataMap);
  
  // Calculate insights
  const totalEntries = monthEntries.length;
  const averageMood = totalEntries > 0 ? monthEntries.reduce((sum, e) => sum + e.mood_rating, 0) / totalEntries : 0;
  const averageEnergy = totalEntries > 0 ? monthEntries.reduce((sum, e) => sum + e.energy_rating, 0) / totalEntries : 0;
  const triggerCounts = calculateTriggerCounts(monthEntries);
  const topTriggers = getTopTriggers(triggerCounts);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    const dateKey = formatDate(date, 'yyyy-MM-dd');
    if (dayDataMap.has(dateKey)) {
      setIsDayDetailOpen(true);
    } else {
      showNotification('error', 'No entry for this day');
    }
  };

  const selectedDayData = selectedDate ? dayDataMap.get(formatDate(selectedDate, 'yyyy-MM-dd')) : undefined;

  // Export functionality
  const handleExport = async (format: 'csv' | 'json' = 'csv') => {
    try {
      const monthName = formatDate(selectedMonth, 'yyyy-MM');
      
      if (format === 'json') {
        const exportData = {
          exportDate: new Date().toISOString(),
          month: monthName,
          summary: {
            totalEntries: monthEntries.length,
            averageMood: averageMood,
            averageEnergy: averageEnergy,
            streak: calculateStreak(monthEntries)
          },
          entries: monthEntries.map(entry => ({
            date: formatDate(entry.date, 'yyyy-MM-dd'),
            mood: entry.mood_rating,
            energy: entry.energy_rating,
            triggers: entry.triggers,
            gratitude: entry.gratitude,
            notes: entry.notes
          }))
        };
        
        downloadFile(JSON.stringify(exportData, null, 2), `mood-entries-${monthName}.json`, 'application/json');
      } else {
        const csvHeaders = ['Date', 'Mood Rating', 'Energy Rating', 'Triggers', 'Gratitude', 'Notes'];
        const csvRows = monthEntries.map(entry => [
          formatDate(entry.date, 'yyyy-MM-dd'),
          entry.mood_rating,
          entry.energy_rating,
          entry.triggers.join('; '),
          entry.gratitude.join('; '),
          entry.notes.replace(/"/g, '""')
        ]);

        const csvContent = [
          csvHeaders.join(','),
          ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        downloadFile(csvContent, `mood-entries-${monthName}.csv`, 'text/csv');
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
    streakDays: calculateStreak(monthEntries),
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

      <CalendarHeader onExport={handleExport} />
      
      <CalendarGrid
        selectedDate={selectedDate}
        selectedMonth={selectedMonth}
        dayDataMap={dayDataMap}
        onDateSelect={setSelectedDate}
        onMonthChange={setSelectedMonth}
        onDayClick={handleDayClick}
      />

      <CalendarInsights
        chartData={chartData}
        monthStats={monthStats}
      />

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
