import { CPT_CODES, suggestCptCodes, type CptCode, type CptBillingInput } from '@/constants/billing';

export interface CareActivity {
  id: string;
  minutes: number;
  category: 'care_navigation' | 'behavioral_health' | 'collaborative_care';
  timestampIso: string;
}

export interface BillingSuggestionRequest {
  periodStartIso: string;
  periodEndIso: string;
  activities: CareActivity[];
  collaborativeCare: boolean;
}

export interface BillingSuggestionResult {
  suggestedCodes: CptCode[];
  documentedMinutes: number;
}

export class BillingSuggestionService {
  static summarizeMinutes(activities: CareActivity[]): number {
    return activities.reduce((sum, a) => sum + Math.max(0, a.minutes), 0);
  }

  static suggest(request: BillingSuggestionRequest): BillingSuggestionResult {
    const documentedMinutes = this.summarizeMinutes(request.activities);
    const codes = suggestCptCodes({
      documentedMinutes,
      hasCollaborativeCare: request.collaborativeCare,
    } as CptBillingInput);

    return { suggestedCodes: codes, documentedMinutes };
  }

  static describe(code: string): string {
    const c = CPT_CODES[code];
    if (!c) return 'Unknown code';
    return `${c.code}: ${c.description}`;
  }
}



