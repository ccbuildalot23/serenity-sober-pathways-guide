export interface CptCode {
  code: string;
  description: string;
  minutesRequired?: number;
  notes?: string;
}

export const CPT_CODES: Record<string, CptCode> = {
  '99490': {
    code: '99490',
    description: 'Chronic Care Management, first 20 minutes per month',
    minutesRequired: 20,
    notes: 'Often paired with 99439 for additional 20-minute increments.',
  },
  '99439': {
    code: '99439',
    description: 'Each additional 20 minutes of CCM in a month',
    minutesRequired: 20,
  },
  '99484': {
    code: '99484',
    description: 'Care management services for behavioral health conditions, 20 min per month',
    minutesRequired: 20,
  },
  '99492': {
    code: '99492',
    description: 'Initial psychiatric collaborative care management, first 70 minutes',
    minutesRequired: 70,
  },
  '99493': {
    code: '99493',
    description: 'Subsequent psychiatric collaborative care management, first 60 minutes',
    minutesRequired: 60,
  },
  '99494': {
    code: '99494',
    description: 'Each additional 30 minutes of psychiatric collaborative care management',
    minutesRequired: 30,
  },
};

export type CptBillingInput = {
  documentedMinutes: number; // minutes of eligible care navigation/behavioral health work
  hasCollaborativeCare: boolean; // collaborative care model in use
};

export function suggestCptCodes(input: CptBillingInput): CptCode[] {
  const out: CptCode[] = [];
  const { documentedMinutes, hasCollaborativeCare } = input;

  // Behavioral health / care navigation baseline
  if (documentedMinutes >= 20) {
    out.push(CPT_CODES['99490']);
    const extra = documentedMinutes - 20;
    if (extra >= 20) {
      const increments = Math.floor(extra / 20);
      for (let i = 0; i < increments; i++) out.push(CPT_CODES['99439']);
    }
  }

  // Behavioral health integration
  if (documentedMinutes >= 20) {
    out.push(CPT_CODES['99484']);
  }

  // Collaborative care
  if (hasCollaborativeCare) {
    if (documentedMinutes >= 70) {
      out.push(CPT_CODES['99492']);
      const extra = documentedMinutes - 70;
      if (extra >= 60) out.push(CPT_CODES['99493']);
      const extraAfter = extra - 60;
      if (extraAfter >= 30) out.push(CPT_CODES['99494']);
    } else if (documentedMinutes >= 60) {
      out.push(CPT_CODES['99493']);
      const extra = documentedMinutes - 60;
      if (extra >= 30) out.push(CPT_CODES['99494']);
    }
  }

  return dedupeByCode(out);
}

function dedupeByCode(codes: CptCode[]): CptCode[] {
  const seen = new Set<string>();
  const res: CptCode[] = [];
  for (const c of codes) {
    if (!seen.has(c.code)) {
      res.push(c);
      seen.add(c.code);
    }
  }
  return res;
}



