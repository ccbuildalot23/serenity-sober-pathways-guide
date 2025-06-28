
export interface RelapseEvent {
  date: string;
  trigger: string;
  consequence: string;
  emotion: string;
}

export interface UserData {
  sobrietyDays: number;
  relapseHistory: RelapseEvent[];
}

export interface GeneratedStory {
  id: string;
  audioUrl?: string;
  transcript: string;
  duration: number;
  generatedAt: string;
}
