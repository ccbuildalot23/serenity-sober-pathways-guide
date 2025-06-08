
export interface CrisisPlan {
  id?: string;
  userId: string;
  personalTriggers: string[];
  warningSigns: string[];
  copingStrategies: string[];
  supportContacts: {
    name: string;
    relationship: string;
    phone: string;
    priority: number;
  }[];
  safeEnvironment: {
    safeSpaces: string[];
    itemsToRemove: string[];
    environmentalChanges: string[];
  };
  professionalContacts: {
    therapist?: { name: string; phone: string; };
    psychiatrist?: { name: string; phone: string; };
    emergencyServices: { name: string; phone: string; };
  };
  medications: {
    current: string[];
    asNeeded: string[];
    restrictions: string[];
  };
  personalMotivations: string[];
  recoveryGoals: string[];
  createdBy: 'self' | 'therapist_review' | 'collaborative';
  lastReviewed: Date;
  nextReviewDate: Date;
}

export interface CrisisPlanRow {
  id: string;
  user_id: string;
  plan_encrypted: string;
  created_by: string;
  last_reviewed: string;
  next_review_date: string;
  created_at: string;
  updated_at: string;
}
