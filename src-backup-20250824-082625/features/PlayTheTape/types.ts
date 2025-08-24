
export interface RecoveryChallenge {
  date: string;
  trigger: string;
  consequence: string;
  emotion: string;
}

export interface UserData {
  sobrietyDays: number;
  challengeHistory: RecoveryChallenge[];
}

export interface GeneratedStory {
  id: string;
  audioUrl?: string;
  transcript: string;
  duration: number;
  generatedAt: string;
}
