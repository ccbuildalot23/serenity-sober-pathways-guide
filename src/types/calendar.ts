
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
