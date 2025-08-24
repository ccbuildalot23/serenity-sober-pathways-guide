
export interface MoodEntry {
  id: string;
  date: Date;
  mood_rating: number;
  energy_rating?: number;
  triggers?: string[];
  gratitude?: string[];
  notes?: string;
  created_at: Date;
}

export interface DayData {
  date: Date;
  entries: MoodEntry[];
  averageMood: number;
}

export interface ChartDataPoint {
  date: string;
  mood: number;
  energy: number;
}

export interface CalendarGridProps {
  selectedDate?: Date;
  selectedMonth: Date;
  dayDataMap: Map<string, DayData>;
  onDateSelect: (date: Date | undefined) => void;
  onMonthChange: (month: Date) => void;
  onDayClick: (date: Date) => void;
}
