export type EscalationLevel = 'high' | 'severe';

export const escalateCrisis = (level: EscalationLevel) => {
  if (level === 'severe') {
    window.open('tel:911', '_self');
  } else if (level === 'high') {
    window.open('tel:988', '_self');
  }
};
