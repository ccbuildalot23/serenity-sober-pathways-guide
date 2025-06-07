
import type { CrisisResolution, CheckInResponse, FollowUpTask } from '@/types/crisisData';

export const convertJsonArrayToStringArray = (jsonArray: any): string[] => {
  if (!Array.isArray(jsonArray)) {
    return [];
  }
  return jsonArray.map(item => String(item));
};

export const generateUUID = (): string => {
  return crypto.randomUUID();
};

export const transformCrisisResolution = (item: any): CrisisResolution => ({
  id: item.id,
  user_id: item.user_id,
  crisis_start_time: new Date(item.crisis_start_time),
  resolution_time: new Date(item.resolution_time),
  interventions_used: convertJsonArrayToStringArray(item.interventions_used),
  effectiveness_rating: item.effectiveness_rating,
  additional_notes: item.additional_notes || '',
  safety_confirmed: item.safety_confirmed
});

export const transformCheckInResponse = (item: any): CheckInResponse => ({
  id: item.id,
  user_id: item.user_id,
  task_id: item.task_id,
  timestamp: new Date(item.timestamp),
  mood_rating: item.mood_rating,
  notes: item.notes || '',
  needs_support: item.needs_support
});

export const transformFollowUpTask = (item: any): FollowUpTask => ({
  id: item.id,
  user_id: item.user_id,
  task_type: item.task_type as any,
  scheduled_for: new Date(item.scheduled_for),
  completed: item.completed,
  crisis_event_id: item.crisis_event_id
});
